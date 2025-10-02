import { db } from "../db";
import { sql } from "drizzle-orm";
import type { InsertItemReceivingMetrics } from "@shared/schema";

interface ReceivingHistoryRecord {
  style_number: string;
  item_number: string;
  receive_date: Date;
  creation_date: Date | null;
  last_rcvd: Date | null;
}

interface CalculatedMetrics extends Omit<InsertItemReceivingMetrics, 'id' | 'lastCalculatedAt'> {
  styleNumber: string;
}

/**
 * Calculate receiving metrics for a single style
 */
export async function calculateMetricsForStyle(
  styleNumber: string,
  calculatedBy: string = 'system'
): Promise<CalculatedMetrics | null> {
  // Get all receiving history for this style
  const history = await getReceivingHistoryForStyle(styleNumber);

  if (history.length === 0) {
    return null;
  }

  // Sort by date
  const sortedHistory = history.sort((a, b) =>
    new Date(a.receive_date).getTime() - new Date(b.receive_date).getTime()
  );

  const firstReceive = sortedHistory[0];
  const lastReceive = sortedHistory[sortedHistory.length - 1];
  const creationDate = firstReceive.creation_date;
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
  });

  return {
    styleNumber,
    itemNumber: firstReceive.item_number,
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
}) {
  const {
    totalReceives,
    uniqueMonths,
    uniqueYears,
    avgDaysBetween,
    daysSinceLast,
    creationDate,
    lastReceiveDate
  } = data;

  // Rule 1: New Item Detection
  const isNewItem = creationDate
    ? Math.abs(lastReceiveDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24) <= 7 && totalReceives <= 2
    : false;

  // Rule 2: Restock Detection
  const isRestockedItem = creationDate
    ? Math.abs(lastReceiveDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24) > 7 && totalReceives >= 2
    : totalReceives >= 2;

  // Rule 3: Core Item Detection
  const isCoreItem = uniqueMonths >= 3 && totalReceives >= 5 && (avgDaysBetween || 999) <= 60;

  // Rule 4: Seasonal Item Detection
  const isSeasonalItem = detectSeasonalPattern(data);

  // Rule 5: One-Time Buy Detection
  const isOneTimeBuy = totalReceives <= 2 && daysSinceLast >= 90 && !isCoreItem;

  // Rule 6: Determine Lifecycle Stage (Priority order)
  let lifecycleStage: string;
  if (isNewItem) {
    lifecycleStage = 'New';
  } else if (isSeasonalItem) {
    lifecycleStage = 'Seasonal';
  } else if (isCoreItem) {
    lifecycleStage = 'Core';
  } else if (isOneTimeBuy && daysSinceLast >= 180) {
    lifecycleStage = 'Discontinued';
  } else {
    lifecycleStage = 'One-Time';
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
}): boolean {
  const { uniqueYears, avgDaysBetween, receiveDates } = data;

  // Need at least 2 years of data
  if (uniqueYears < 2) return false;

  // Average gap should be large (around yearly)
  if (!avgDaysBetween || avgDaysBetween < 300) return false;

  // Group receives by month
  const monthCounts: Record<number, number> = {};
  receiveDates.forEach(date => {
    const month = date.getMonth();
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  // Check if receives concentrate in same month(s) across years
  const maxCount = Math.max(...Object.values(monthCounts));
  const totalReceives = receiveDates.length;

  // At least 60% of receives in same month(s) = seasonal
  return maxCount / totalReceives >= 0.6;
}

/**
 * Get receiving history for a specific style from database
 */
async function getReceivingHistoryForStyle(styleNumber: string): Promise<ReceivingHistoryRecord[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT
      i.style_number,
      i.item_number,
      rv.date as receive_date,
      i.creation_date,
      i.last_rcvd
    FROM receiving_lines rl
    JOIN receiving_vouchers rv ON rl.voucher_id = rv.id
    JOIN item_list i ON rl.item_number = i.item_number
    WHERE i.style_number = ${styleNumber}
    ORDER BY rv.date ASC
  `);

  return result.rows as ReceivingHistoryRecord[];
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
  calculatedBy: string = 'system'
): Promise<CalculatedMetrics[]> {
  const metrics: CalculatedMetrics[] = [];

  for (const styleNumber of styleNumbers) {
    const metric = await calculateMetricsForStyle(styleNumber, calculatedBy);
    if (metric) {
      metrics.push(metric);
    }
  }

  return metrics;
}

/**
 * Calculate metrics for ALL styles
 */
export async function calculateAllMetrics(calculatedBy: string = 'system'): Promise<{
  total: number;
  metrics: CalculatedMetrics[];
}> {
  const allStyles = await getAllStyleNumbers();
  const metrics = await calculateMetricsForStyles(allStyles, calculatedBy);

  return {
    total: metrics.length,
    metrics
  };
}
