import { db } from "../db";
import { sql } from "drizzle-orm";
import type { InsertItemReceivingMetrics } from "@shared/schema";

interface ReceivingHistoryRecord {
  style_number: string;
  receive_date: Date;
}

interface StyleMetadata {
  style_number: string;
  item_number: string;
  earliest_creation_date: Date | null;
  latest_last_rcvd: Date | null;
}

interface CalculatedMetrics extends Omit<InsertItemReceivingMetrics, 'id' | 'lastCalculatedAt'> {
  styleNumber: string;
}

interface BusinessRuleSettings {
  // New Item settings
  newItemDaysFromCreation?: number;
  newItemMaxReceives?: number;
  newItemMustHaveSold?: boolean; // Phase 2

  // Core Item settings (receiving + sales)
  coreItemMinMonths?: number;
  coreItemMinReceives?: number;
  coreItemMaxDaysBetween?: number;
  coreItemMaxDaysSinceLast?: number;
  coreItemMinSalesMonths?: number; // Phase 2
  coreItemMaxDaysSinceLastSold?: number; // Phase 2
  coreItemMaxDaysSinceLastReceived?: number; // Phase 2
  coreItemMinInventoryOrRecentSales?: boolean; // Phase 2

  // Seasonal Item settings (receiving + sales)
  seasonalItemMinYears?: number;
  seasonalItemConcentrationPct?: number;
  seasonalItemMinDaysBetween?: number;
  seasonalOverridesDiscontinued?: boolean;
  seasonalDiscontinuedThreshold?: number;
  seasonalItemSalesConcentrationPct?: number; // Phase 2
  seasonalItemMaxDaysSinceActivity?: number; // Phase 2

  // One-Time Buy settings (receiving + sales)
  oneTimeBuyMaxReceives?: number;
  oneTimeBuyMinDaysSinceLast?: number;
  oneTimeBuyMinDaysSinceFirst?: number; // Phase 2
  oneTimeBuyMaxDaysSinceSold?: number; // Phase 2

  // Discontinued settings (receiving + sales + inventory) - MULTI-DIMENSIONAL
  discontinuedMinDaysSinceLast?: number; // Receiving
  discontinuedMinDaysSinceSold?: number; // Phase 2: Sales
  discontinuedMinDaysSinceReceived?: number; // Phase 2: Receiving (redundant with above, for clarity)
  discontinuedRequiresZeroInventory?: boolean; // Phase 2: Inventory

  // Clearance settings (NEW - Phase 2) - Items with inventory but slow/no sales
  clearanceMinInventory?: number; // Minimum inventory to be clearance
  clearanceMaxRecentSales?: number; // Maximum recent sales
  clearanceMinDaysSinceReceived?: number; // Days since last received
  clearanceMinDaysOfSupply?: number; // Minimum days of supply
}

const DEFAULT_SETTINGS: BusinessRuleSettings = {
  // New Item
  newItemDaysFromCreation: 30,
  newItemMaxReceives: 2,
  newItemMustHaveSold: false,

  // Core Item
  coreItemMinMonths: 3,
  coreItemMinReceives: 5,
  coreItemMaxDaysBetween: 60,
  coreItemMaxDaysSinceLast: 90,
  coreItemMinSalesMonths: 6,
  coreItemMaxDaysSinceLastSold: 90,
  coreItemMaxDaysSinceLastReceived: 90,
  coreItemMinInventoryOrRecentSales: true,

  // Seasonal Item
  seasonalItemMinYears: 2,
  seasonalItemConcentrationPct: 60,
  seasonalItemMinDaysBetween: 300,
  seasonalOverridesDiscontinued: true,
  seasonalDiscontinuedThreshold: 365,
  seasonalItemSalesConcentrationPct: 15,
  seasonalItemMaxDaysSinceActivity: 365,

  // One-Time Buy
  oneTimeBuyMaxReceives: 2,
  oneTimeBuyMinDaysSinceLast: 90,
  oneTimeBuyMinDaysSinceFirst: 90,
  oneTimeBuyMaxDaysSinceSold: 90,

  // Discontinued - STRICT: Must have NO recent receives AND NO recent sales
  discontinuedMinDaysSinceLast: 180, // No receives in 180 days
  discontinuedMinDaysSinceSold: 180, // AND no sales in 180 days
  discontinuedMinDaysSinceReceived: 180,
  discontinuedRequiresZeroInventory: false, // Changed to false - don't require zero inventory

  // Clearance - Items with inventory but slow sales
  clearanceMinInventory: 10,
  clearanceMaxRecentSales: 3,
  clearanceMinDaysSinceReceived: 180,
  clearanceMinDaysOfSupply: 180,
};

/**
 * Calculate receiving metrics for a single style (MULTI-DIMENSIONAL)
 */
export async function calculateMetricsForStyle(
  styleNumber: string,
  calculatedBy: string = 'system',
  settings: BusinessRuleSettings = DEFAULT_SETTINGS
): Promise<CalculatedMetrics | null> {
  // Merge settings with defaults
  const config = { ...DEFAULT_SETTINGS, ...settings };

  // Get all receiving history for this style (voucher-level)
  const history = await getReceivingHistoryForStyle(styleNumber);

  if (history.length === 0) {
    return null;
  }

  // Get style-level metadata separately
  const metadata = await getStyleMetadata(styleNumber);
  if (!metadata) {
    return null;
  }

  // Get sales data (multi-dimensional)
  const salesData = await getSalesDataForStyle(styleNumber);

  // Get inventory data (multi-dimensional)
  const inventoryData = await getInventoryDataForStyle(styleNumber);

  // Sort by date
  const sortedHistory = history.sort((a, b) =>
    new Date(a.receive_date).getTime() - new Date(b.receive_date).getTime()
  );

  const firstReceive = sortedHistory[0];
  const lastReceive = sortedHistory[sortedHistory.length - 1];
  const creationDate = metadata.earliest_creation_date;
  const totalReceives = sortedHistory.length;

  // Calculate unique months and years
  const uniqueMonths = new Set(
    sortedHistory.map(h => {
      const date = new Date(h.receive_date);
      return `${date.getFullYear()}-${date.getMonth()}`;
    })
  ).size;

  const uniqueYears = new Set(
    sortedHistory.map(h => new Date(h.receive_date).getFullYear())
  ).size;

  // Calculate average days between receives
  let avgDaysBetween = null;
  if (totalReceives > 1) {
    const daysDiffs: number[] = [];
    for (let i = 1; i < sortedHistory.length; i++) {
      const diff = Math.abs(
        new Date(sortedHistory[i].receive_date).getTime() -
        new Date(sortedHistory[i - 1].receive_date).getTime()
      ) / (1000 * 60 * 60 * 24);
      daysDiffs.push(diff);
    }
    avgDaysBetween = daysDiffs.reduce((a, b) => a + b, 0) / daysDiffs.length;
  }

  // Calculate days since first and last receive
  const now = new Date();
  const daysSinceFirst = Math.floor(
    (now.getTime() - new Date(firstReceive.receive_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceLast = Math.floor(
    (now.getTime() - new Date(lastReceive.receive_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate days since last sale
  const daysSinceLastSale = salesData.lastSaleDate
    ? Math.floor((now.getTime() - new Date(salesData.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999999; // Very large number if never sold

  // Apply business logic rules (MULTI-DIMENSIONAL)
  const classifications = applyBusinessRules({
    // Receiving data
    totalReceives,
    uniqueMonths,
    uniqueYears,
    avgDaysBetween,
    daysSinceFirst,
    daysSinceLast,
    firstReceiveDate: new Date(firstReceive.receive_date),
    lastReceiveDate: new Date(lastReceive.receive_date),
    creationDate: creationDate ? new Date(creationDate) : null,
    receiveDates: sortedHistory.map(h => new Date(h.receive_date)),
    // Sales data (MULTI-DIMENSIONAL)
    totalSalesCount: salesData.totalSalesCount,
    salesMonthsLastYear: salesData.salesMonthsLastYear,
    salesLast90days: salesData.salesLast90days,
    daysSinceLastSale,
    salesByMonth: salesData.salesByMonth,
    // Inventory data (MULTI-DIMENSIONAL)
    totalInventory: inventoryData.totalInventory
  }, config);

  // Calculate days of supply
  const daysOfSupply = salesData.salesLast90days > 0
    ? ((inventoryData.totalInventory / salesData.salesLast90days) * 90).toFixed(2)
    : null;

  // Detect seasonal sales pattern
  const hasSeasonalSalesPattern = detectSeasonalSalesPattern(
    salesData.salesByMonth,
    salesData.totalSalesCount,
    config.seasonalItemSalesConcentrationPct || 15
  );

  return {
    styleNumber,
    itemNumber: metadata.item_number,
    firstReceiveDate: new Date(firstReceive.receive_date).toISOString().split('T')[0],
    lastReceiveDate: new Date(lastReceive.receive_date).toISOString().split('T')[0],
    creationDate: creationDate ? new Date(creationDate).toISOString().split('T')[0] : null,
    totalReceiveCount: totalReceives,
    uniqueReceiveMonths: uniqueMonths,
    uniqueReceiveYears: uniqueYears,
    avgDaysBetweenReceives: avgDaysBetween?.toFixed(2) || null,
    daysSinceFirstReceive: daysSinceFirst,
    daysSinceLastReceive: daysSinceLast,
    // Multi-dimensional metrics
    totalSalesCount: salesData.totalSalesCount,
    salesMonthsLastYear: salesData.salesMonthsLastYear,
    salesLast90days: salesData.salesLast90days,
    daysOfSupply,
    hasSeasonalSalesPattern,
    ...classifications,
    calculatedBy
  };
}

/**
 * Apply business logic rules to determine classifications (MULTI-DIMENSIONAL)
 * Uses receiving history + sales data + inventory data
 */
function applyBusinessRules(data: {
  // Receiving data
  totalReceives: number;
  uniqueMonths: number;
  uniqueYears: number;
  avgDaysBetween: number | null;
  daysSinceFirst: number;
  daysSinceLast: number;
  firstReceiveDate: Date;
  lastReceiveDate: Date;
  creationDate: Date | null;
  receiveDates: Date[];
  // Sales data (MULTI-DIMENSIONAL)
  totalSalesCount: number;
  salesMonthsLastYear: number;
  salesLast90days: number;
  daysSinceLastSale: number;
  salesByMonth: Record<string, number>;
  // Inventory data (MULTI-DIMENSIONAL)
  totalInventory: number;
}, settings: BusinessRuleSettings = DEFAULT_SETTINGS) {
  const {
    totalReceives,
    uniqueMonths,
    uniqueYears,
    avgDaysBetween,
    daysSinceLast,
    daysSinceLastSale,
    creationDate,
    lastReceiveDate,
    totalSalesCount,
    salesMonthsLastYear,
    salesLast90days,
    totalInventory
  } = data;

  // Merge with defaults to ensure all settings are present
  const config = { ...DEFAULT_SETTINGS, ...settings };

  // Calculate days of supply for clearance detection
  const daysOfSupply = salesLast90days > 0
    ? (totalInventory / salesLast90days) * 90
    : 999999;

  // Rule 1: New Item Detection (MULTI-DIMENSIONAL: Can optionally require sales)
  // IMPORTANT: daysSinceCreation is from NOW, not from last receive!
  const daysSinceCreation = creationDate
    ? Math.floor((new Date().getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999999;

  const isNewItem = creationDate
    ? daysSinceCreation <= config.newItemDaysFromCreation!
      && totalReceives <= config.newItemMaxReceives!
      && (!config.newItemMustHaveSold || totalSalesCount > 0)
    : false;

  // Rule 2: Restock Detection
  const isRestockedItem = creationDate
    ? daysSinceCreation > config.newItemDaysFromCreation! && totalReceives >= 2
    : totalReceives >= 2;

  // Rule 3: Core Item Detection (MULTI-DIMENSIONAL: Requires receiving + sales activity)
  const isCoreItem = uniqueMonths >= config.coreItemMinMonths!
    && totalReceives >= config.coreItemMinReceives!
    && (avgDaysBetween || 999) <= config.coreItemMaxDaysBetween!
    && daysSinceLast <= (config.coreItemMaxDaysSinceLast || 90)
    // MULTI-DIMENSIONAL: Also check sales activity
    && salesMonthsLastYear >= (config.coreItemMinSalesMonths || 6)
    && daysSinceLastSale <= (config.coreItemMaxDaysSinceLastSold || 90)
    // MULTI-DIMENSIONAL: Must have inventory OR recent sales
    && (!config.coreItemMinInventoryOrRecentSales || (totalInventory > 0 || salesLast90days > 0));

  // Rule 4: Seasonal Item Detection (receiving pattern)
  const isSeasonalItem = detectSeasonalPattern(data, config);

  // Rule 5: One-Time Buy Detection (MULTI-DIMENSIONAL)
  // Items bought 1-2 times, a while ago, with no restocking
  // Sales/inventory don't matter - this is about purchase intent
  const isOneTimeBuy = totalReceives <= config.oneTimeBuyMaxReceives!
    && data.daysSinceFirst >= (config.oneTimeBuyMinDaysSinceFirst || 90) // First receive was long ago
    && daysSinceLast >= config.oneTimeBuyMinDaysSinceLast! // Haven't reordered
    && !isCoreItem
    && !isSeasonalItem; // Seasonal items reorder annually

  // Rule 6: Clearance Detection (NEW - MULTI-DIMENSIONAL: Inventory + slow sales)
  // Items with inventory but very slow/no sales
  // Excludes One-Time items (those are intentional, not a problem)
  const isClearance = totalInventory >= (config.clearanceMinInventory || 10)
    && salesLast90days <= (config.clearanceMaxRecentSales || 3)
    && daysSinceLast >= (config.clearanceMinDaysSinceReceived || 180)
    && daysOfSupply >= (config.clearanceMinDaysOfSupply || 180)
    && !isNewItem
    && !isCoreItem
    && !isOneTimeBuy; // One-Time items are intentional purchases

  // Rule 7: Discontinued Detection (MULTI-DIMENSIONAL: STRICT - NO receiving AND NO sales)
  // Must have NO recent receives AND NO recent sales
  // Excludes One-Time items (those are intentionally not restocked)
  const isDiscontinued = daysSinceLast >= config.discontinuedMinDaysSinceLast!
    && daysSinceLastSale >= (config.discontinuedMinDaysSinceSold || 180)
    && (!config.discontinuedRequiresZeroInventory || totalInventory === 0)
    && !isCoreItem
    && !isSeasonalItem
    && !isOneTimeBuy // One-Time items are intentionally not restocked
    && !isClearance; // Clearance takes precedence

  // Rule 8: Determine Lifecycle Stage (UPDATED - MULTI-DIMENSIONAL PRECEDENCE)
  let lifecycleStage: string;

  // Check if seasonal override applies first
  const seasonalOverrideApplies =
    config.seasonalOverridesDiscontinued &&
    isSeasonalItem &&
    (daysSinceLast < (config.seasonalDiscontinuedThreshold || 365) ||
     daysSinceLastSale < (config.seasonalItemMaxDaysSinceActivity || 365));

  // Precedence order (updated for multi-dimensional):
  // Priority: Purchase Intent > Replenishment Pattern > Current State > Dead
  if (isNewItem) {
    lifecycleStage = 'New';
  } else if (isCoreItem) {
    // Core items: active replenishment (receiving + sales)
    lifecycleStage = 'Core';
  } else if (seasonalOverrideApplies) {
    // Seasonal override takes precedence over other categories
    lifecycleStage = 'Seasonal';
  } else if (isSeasonalItem) {
    // Seasonal replenishment pattern
    lifecycleStage = 'Seasonal';
  } else if (isOneTimeBuy) {
    // One-Time: purchase intent (1-2 buys, no restocking)
    // Takes precedence over Clearance/Discontinued
    lifecycleStage = 'One-Time';
  } else if (isClearance) {
    // Clearance: inventory problem (has stock but slow sales)
    lifecycleStage = 'Clearance';
  } else if (isDiscontinued) {
    // Discontinued: truly dead (no receives AND no sales)
    lifecycleStage = 'Discontinued';
  } else {
    lifecycleStage = 'Unclassified';
  }

  return {
    isNewItem,
    isRestockedItem,
    isCoreItem,
    isSeasonalItem,
    isOneTimeBuy,
    lifecycleStage
  };
}

/**
 * Detect seasonal pattern: receives happen in same month(s) each year
 */
function detectSeasonalPattern(data: {
  uniqueYears: number;
  avgDaysBetween: number | null;
  receiveDates: Date[];
}, settings: BusinessRuleSettings = DEFAULT_SETTINGS): boolean {
  const { uniqueYears, avgDaysBetween, receiveDates } = data;
  const config = { ...DEFAULT_SETTINGS, ...settings };

  // Need at least configured years of data
  if (uniqueYears < config.seasonalItemMinYears!) return false;

  // Average gap should be large (around yearly)
  if (!avgDaysBetween || avgDaysBetween < config.seasonalItemMinDaysBetween!) return false;

  // Group receives by month
  const monthCounts: Record<number, number> = {};
  receiveDates.forEach(date => {
    const month = date.getMonth();
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  // Check if receives concentrate in same month(s) across years
  const maxCount = Math.max(...Object.values(monthCounts));
  const totalReceives = receiveDates.length;

  // Use configured concentration percentage
  return maxCount / totalReceives >= (config.seasonalItemConcentrationPct! / 100);
}

/**
 * Detect seasonal SALES pattern: sales concentrate in specific month(s)
 */
function detectSeasonalSalesPattern(
  salesByMonth: Record<string, number>,
  totalSales: number,
  concentrationPct: number = 15
): boolean {
  if (totalSales === 0 || Object.keys(salesByMonth).length === 0) {
    return false;
  }

  // Find the month with highest sales
  const maxMonthlySales = Math.max(...Object.values(salesByMonth));

  // Check if sales concentrate in specific months
  const concentration = (maxMonthlySales / totalSales) * 100;

  return concentration >= concentrationPct;
}

/**
 * Get style-level metadata (earliest creation, latest last_rcvd, representative item_number)
 */
async function getStyleMetadata(styleNumber: string): Promise<StyleMetadata | null> {
  const result = await db.execute(sql`
    SELECT 
      style_number,
      MIN(item_number) as item_number,
      MIN(creation_date) as earliest_creation_date,
      MAX(last_rcvd) as latest_last_rcvd
    FROM item_list
    WHERE style_number = ${styleNumber}
    GROUP BY style_number
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as StyleMetadata;
}

/**
 * Get receiving history for a specific style from database
 * Groups by voucher_id to count unique receiving events (one row per voucher)
 */
async function getReceivingHistoryForStyle(styleNumber: string): Promise<ReceivingHistoryRecord[]> {
  const result = await db.execute(sql`
    SELECT
      i.style_number,
      rv.date as receive_date
    FROM receiving_lines rl
    JOIN receiving_vouchers rv ON rl.voucher_id = rv.id
    JOIN item_list i ON rl.item_number = i.item_number
    WHERE i.style_number = ${styleNumber}
    GROUP BY i.style_number, rv.id, rv.date
    ORDER BY rv.date ASC
  `);

  return result.rows as unknown as ReceivingHistoryRecord[];
}

/**
 * Get styles affected by specific voucher IDs
 */
export async function getAffectedStylesFromVouchers(voucherIds: number[]): Promise<string[]> {
  if (voucherIds.length === 0) return [];

  const result = await db.execute(sql`
    SELECT DISTINCT i.style_number
    FROM receiving_lines rl
    JOIN item_list i ON rl.item_number = i.item_number
    WHERE rl.voucher_id = ANY(${voucherIds})
      AND i.style_number IS NOT NULL
  `);

  return result.rows.map((r: any) => r.style_number);
}

/**
 * Get all unique style numbers from item_list
 */
export async function getAllStyleNumbers(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT style_number
    FROM item_list
    WHERE style_number IS NOT NULL
    ORDER BY style_number
  `);

  return result.rows.map((r: any) => r.style_number);
}

export interface FailedStyleInfo {
  styleNumber: string;
  reason: string;
  category: 'NO_RECEIVING_HISTORY' | 'SQL_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  error?: string;
}

export interface BatchCalculationResult {
  metrics: CalculatedMetrics[];
  failed: FailedStyleInfo[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    noReceivingHistory: number;
    errors: number;
  };
}

/**
 * Calculate metrics for multiple styles (batch operation)
 * MULTI-DIMENSIONAL VERSION - Enhanced with failure tracking
 */
export async function calculateMetricsForStyles(
  styleNumbers: string[],
  calculatedBy: string = 'system',
  settings: BusinessRuleSettings = DEFAULT_SETTINGS
): Promise<BatchCalculationResult> {
  const metrics: CalculatedMetrics[] = [];
  const failed: FailedStyleInfo[] = [];
  let noReceivingHistoryCount = 0;
  let errorCount = 0;

  for (const styleNumber of styleNumbers) {
    try {
      const metric = await calculateMetricsForStyle(styleNumber, calculatedBy, settings);
      if (metric) {
        metrics.push(metric);
      } else {
        // No receiving history found
        noReceivingHistoryCount++;
        failed.push({
          styleNumber,
          reason: 'No receiving history found for this style',
          category: 'NO_RECEIVING_HISTORY'
        });
      }
    } catch (error) {
      // Actual error occurred
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failed.push({
        styleNumber,
        reason: errorMessage,
        category: 'SQL_ERROR',
        error: errorMessage
      });
      console.error(`Error calculating metrics for style ${styleNumber}:`, error);
    }
  }

  return {
    metrics,
    failed,
    summary: {
      total: styleNumbers.length,
      successful: metrics.length,
      failed: failed.length,
      noReceivingHistory: noReceivingHistoryCount,
      errors: errorCount
    }
  };
}

// Alias for storage layer - maintain backward compatibility
export const calculateMetricsForStylesMultidim = calculateMetricsForStyles;

/**
 * Calculate metrics for ALL styles
 */
export async function calculateAllMetrics(calculatedBy: string = 'system', settings: BusinessRuleSettings = DEFAULT_SETTINGS): Promise<{
  total: number;
  metrics: CalculatedMetrics[];
}> {
  const allStyles = await getAllStyleNumbers();
  const metrics = await calculateMetricsForStyles(allStyles, calculatedBy, settings);

  return {
    total: metrics.length,
    metrics
  };
}

/**
 * Get sales data for a style (multi-dimensional)
 */
async function getSalesDataForStyle(styleNumber: string): Promise<{
  totalSalesCount: number;
  salesMonthsLastYear: number;
  salesLast90days: number;
  lastSaleDate: Date | null;
  salesByMonth: Record<string, number>;
}> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*) as total_sales,
      COUNT(*) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '90 days') as sales_90d
    FROM item_list i
    LEFT JOIN sales_transactions s ON i.item_number = s.sku
    WHERE i.style_number = ${styleNumber}
      AND s.id IS NOT NULL
  `);

  const row: any = result.rows[0];

  // Get distinct months with sales in last year
  const monthsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT TO_CHAR(s.date, 'YYYY-MM')) as unique_months
    FROM item_list i
    INNER JOIN sales_transactions s ON i.item_number = s.sku
    WHERE i.style_number = ${styleNumber}
      AND s.date >= CURRENT_DATE - INTERVAL '12 months'
  `);

  const monthsRow: any = monthsResult.rows[0];

  // Get last sale date
  const lastSaleResult = await db.execute(sql`
    SELECT MAX(s.date) as last_sale
    FROM item_list i
    INNER JOIN sales_transactions s ON i.item_number = s.sku
    WHERE i.style_number = ${styleNumber}
  `);

  const lastSaleRow: any = lastSaleResult.rows[0];

  // Get sales by month for seasonal pattern detection (last 2 years)
  const salesByMonthResult = await db.execute(sql`
    SELECT
      TO_CHAR(s.date, 'MM') as month,
      COUNT(*) as sales_count
    FROM item_list i
    INNER JOIN sales_transactions s ON i.item_number = s.sku
    WHERE i.style_number = ${styleNumber}
      AND s.date >= CURRENT_DATE - INTERVAL '2 years'
    GROUP BY TO_CHAR(s.date, 'MM')
  `);

  const salesByMonth: Record<string, number> = {};
  salesByMonthResult.rows.forEach((row: any) => {
    salesByMonth[row.month] = parseInt(row.sales_count);
  });

  return {
    totalSalesCount: parseInt(row?.total_sales || '0'),
    salesMonthsLastYear: parseInt(monthsRow?.unique_months || '0'),
    salesLast90days: parseInt(row?.sales_90d || '0'),
    lastSaleDate: lastSaleRow?.last_sale || null,
    salesByMonth,
  };
}

/**
 * Get inventory data for a style (multi-dimensional)
 */
async function getInventoryDataForStyle(styleNumber: string): Promise<{
  totalInventory: number;
  daysSinceLastSold: number | null;
  daysSinceLastReceived: number | null;
}> {
  const result = await db.execute(sql`
    SELECT
      SUM(avail_qty) as total_inventory,
      MAX(last_sold) as latest_last_sold,
      MAX(last_rcvd) as latest_last_rcvd
    FROM item_list
    WHERE style_number = ${styleNumber}
  `);

  const row: any = result.rows[0];
  const now = new Date();

  let daysSinceLastSold: number | null = null;
  if (row?.latest_last_sold) {
    const lastSoldDate = new Date(row.latest_last_sold);
    daysSinceLastSold = Math.floor((now.getTime() - lastSoldDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  let daysSinceLastReceived: number | null = null;
  if (row?.latest_last_rcvd) {
    const lastRcvdDate = new Date(row.latest_last_rcvd);
    daysSinceLastReceived = Math.floor((now.getTime() - lastRcvdDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    totalInventory: parseInt(row?.total_inventory || '0'),
    daysSinceLastSold,
    daysSinceLastReceived,
  };
}
