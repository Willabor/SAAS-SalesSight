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
  newItemDaysFromCreation?: number;
  newItemMaxReceives?: number;
  coreItemMinMonths?: number;
  coreItemMinReceives?: number;
  coreItemMaxDaysBetween?: number;
  coreItemMaxDaysSinceLast?: number; // NEW Phase 1: Prevent zombie Core items
  seasonalItemMinYears?: number;
  seasonalItemConcentrationPct?: number;
  seasonalItemMinDaysBetween?: number;
  seasonalOverridesDiscontinued?: boolean; // NEW Phase 1: Seasonal override toggle
  seasonalDiscontinuedThreshold?: number; // NEW Phase 1: Days threshold for seasonal override
  oneTimeBuyMaxReceives?: number;
  oneTimeBuyMinDaysSinceLast?: number;
  discontinuedMinDaysSinceLast?: number;
}

const DEFAULT_SETTINGS: BusinessRuleSettings = {
  newItemDaysFromCreation: 30, // Changed from 7 to 30 (Phase 1)
  newItemMaxReceives: 2,
  coreItemMinMonths: 3,
  coreItemMinReceives: 5,
  coreItemMaxDaysBetween: 60,
  coreItemMaxDaysSinceLast: 90, // NEW Phase 1: Prevent zombie Core items
  seasonalItemMinYears: 2,
  seasonalItemConcentrationPct: 60,
  seasonalItemMinDaysBetween: 300,
  seasonalOverridesDiscontinued: true, // NEW Phase 1: Seasonal override enabled by default
  seasonalDiscontinuedThreshold: 365, // NEW Phase 1: 365 days threshold
  oneTimeBuyMaxReceives: 2,
  oneTimeBuyMinDaysSinceLast: 90,
  discontinuedMinDaysSinceLast: 180,
};

/**
 * Calculate receiving metrics for a single style
 */
export async function calculateMetricsForStyle(
  styleNumber: string,
  calculatedBy: string = 'system',
  settings: BusinessRuleSettings = DEFAULT_SETTINGS
): Promise<CalculatedMetrics | null> {
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

  // Apply business logic rules
  const classifications = applyBusinessRules({
    totalReceives,
    uniqueMonths,
    uniqueYears,
    avgDaysBetween,
    daysSinceFirst,
    daysSinceLast,
    firstReceiveDate: new Date(firstReceive.receive_date),
    lastReceiveDate: new Date(lastReceive.receive_date),
    creationDate: creationDate ? new Date(creationDate) : null,
    receiveDates: sortedHistory.map(h => new Date(h.receive_date))
  }, settings);

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
    ...classifications,
    calculatedBy
  };
}

/**
 * Apply business logic rules to determine classifications
 */
function applyBusinessRules(data: {
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
}, settings: BusinessRuleSettings = DEFAULT_SETTINGS) {
  const {
    totalReceives,
    uniqueMonths,
    uniqueYears,
    avgDaysBetween,
    daysSinceLast,
    creationDate,
    lastReceiveDate
  } = data;

  // Merge with defaults to ensure all settings are present
  const config = { ...DEFAULT_SETTINGS, ...settings };

  // Rule 1: New Item Detection
  const isNewItem = creationDate
    ? Math.abs(lastReceiveDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24) <= config.newItemDaysFromCreation!
      && totalReceives <= config.newItemMaxReceives!
    : false;

  // Rule 2: Restock Detection
  const isRestockedItem = creationDate
    ? Math.abs(lastReceiveDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24) > config.newItemDaysFromCreation!
      && totalReceives >= 2
    : totalReceives >= 2;

  // Rule 3: Core Item Detection (with recency check - Phase 1)
  const isCoreItem = uniqueMonths >= config.coreItemMinMonths!
    && totalReceives >= config.coreItemMinReceives!
    && (avgDaysBetween || 999) <= config.coreItemMaxDaysBetween!
    && daysSinceLast <= (config.coreItemMaxDaysSinceLast || 90); // Prevent zombie Core items

  // Rule 4: Seasonal Item Detection
  const isSeasonalItem = detectSeasonalPattern(data, config);

  // Rule 5: One-Time Buy Detection
  const isOneTimeBuy = totalReceives <= config.oneTimeBuyMaxReceives!
    && daysSinceLast >= config.oneTimeBuyMinDaysSinceLast!
    && !isCoreItem;

  // Rule 6: Determine Lifecycle Stage (Updated precedence with Seasonal override - Phase 1)
  let lifecycleStage: string;

  // Check if seasonal override applies first
  const seasonalOverrideApplies =
    config.seasonalOverridesDiscontinued &&
    isSeasonalItem &&
    daysSinceLast < (config.seasonalDiscontinuedThreshold || 365);

  if (isNewItem) {
    lifecycleStage = 'New';
  } else if (seasonalOverrideApplies) {
    // Seasonal override takes precedence over Discontinued
    lifecycleStage = 'Seasonal';
  } else if (daysSinceLast >= config.discontinuedMinDaysSinceLast! && !isCoreItem) {
    // Item is discontinued if not received recently and not Core
    lifecycleStage = 'Discontinued';
  } else if (isCoreItem) {
    lifecycleStage = 'Core';
  } else if (isSeasonalItem) {
    lifecycleStage = 'Seasonal';
  } else if (isOneTimeBuy) {
    lifecycleStage = 'One-Time';
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

/**
 * Calculate metrics for multiple styles (batch operation)
 */
export async function calculateMetricsForStyles(
  styleNumbers: string[],
  calculatedBy: string = 'system',
  settings: BusinessRuleSettings = DEFAULT_SETTINGS
): Promise<CalculatedMetrics[]> {
  const metrics: CalculatedMetrics[] = [];

  for (const styleNumber of styleNumbers) {
    const metric = await calculateMetricsForStyle(styleNumber, calculatedBy, settings);
    if (metric) {
      metrics.push(metric);
    }
  }

  return metrics;
}

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
