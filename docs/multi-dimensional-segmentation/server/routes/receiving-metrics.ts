import express from 'express';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get current settings
router.get('/settings', ensureAuthenticated, async (req, res) => {
  try {
    const settings = await db.query(
      `SELECT * FROM receiving_metrics_settings 
       WHERE is_active = true ORDER BY created_at DESC LIMIT 1`
    );

    if (settings.rows.length === 0) {
      return res.json({
        newItemDaysFromCreation: 30,
        newItemMaxReceives: 2,
        newItemMustHaveSold: false,
        coreItemMinSalesMonths: 6,
        coreItemMinReceives: 5,
        coreItemMaxDaysBetweenReceives: 60,
        coreItemMaxDaysSinceLastSold: 90,
        coreItemMaxDaysSinceLastReceived: 90,
        coreItemMinInventoryOrRecentSales: true,
        seasonalItemMinYears: 2,
        seasonalItemSalesConcentrationPct: 15,
        seasonalItemMinDaysBetweenReceives: 180,
        seasonalItemMaxDaysSinceActivity: 365,
        seasonalOverridesDiscontinued: true,
        discontinuedMinDaysSinceSold: 180,
        discontinuedMinDaysSinceReceived: 180,
        discontinuedRequiresZeroInventory: true,
        clearanceMinInventory: 10,
        clearanceMaxRecentSales: 3,
        clearanceMinDaysSinceReceived: 180,
        clearanceMinDaysOfSupply: 180,
        oneTimeBuyMaxReceives: 2,
        oneTimeBuyMinDaysSinceFirst: 90,
        oneTimeBuyMaxDaysSinceSold: 90,
      });
    }

    const row = settings.rows[0];
    res.json({
      id: row.id,
      newItemDaysFromCreation: row.new_item_days_from_creation,
      newItemMaxReceives: row.new_item_max_receives,
      newItemMustHaveSold: row.new_item_must_have_sold,
      coreItemMinSalesMonths: row.core_item_min_sales_months,
      coreItemMinReceives: row.core_item_min_receives,
      coreItemMaxDaysBetweenReceives: row.core_item_max_days_between_receives,
      coreItemMaxDaysSinceLastSold: row.core_item_max_days_since_last_sold,
      coreItemMaxDaysSinceLastReceived: row.core_item_max_days_since_last_received,
      coreItemMinInventoryOrRecentSales: row.core_item_min_inventory_or_recent_sales,
      seasonalItemMinYears: row.seasonal_item_min_years,
      seasonalItemSalesConcentrationPct: row.seasonal_item_sales_concentration_pct,
      seasonalItemMinDaysBetweenReceives: row.seasonal_item_min_days_between_receives,
      seasonalItemMaxDaysSinceActivity: row.seasonal_item_max_days_since_activity,
      seasonalOverridesDiscontinued: row.seasonal_overrides_discontinued,
      discontinuedMinDaysSinceSold: row.discontinued_min_days_since_sold,
      discontinuedMinDaysSinceReceived: row.discontinued_min_days_since_received,
      discontinuedRequiresZeroInventory: row.discontinued_requires_zero_inventory,
      clearanceMinInventory: row.clearance_min_inventory,
      clearanceMaxRecentSales: row.clearance_max_recent_sales,
      clearanceMinDaysSinceReceived: row.clearance_min_days_since_received,
      clearanceMinDaysOfSupply: row.clearance_min_days_of_supply,
      oneTimeBuyMaxReceives: row.one_time_buy_max_receives,
      oneTimeBuyMinDaysSinceFirst: row.one_time_buy_min_days_since_first,
      oneTimeBuyMaxDaysSinceSold: row.one_time_buy_max_days_since_sold,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save settings
router.post('/settings', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.user_id || 'system';
    
    await db.query(`UPDATE receiving_metrics_settings SET is_active = false WHERE is_active = true`);

    const result = await db.query(
      `INSERT INTO receiving_metrics_settings (
        new_item_days_from_creation, new_item_max_receives, new_item_must_have_sold,
        core_item_min_sales_months, core_item_min_receives, core_item_max_days_between_receives,
        core_item_max_days_since_last_sold, core_item_max_days_since_last_received,
        core_item_min_inventory_or_recent_sales, seasonal_item_min_years,
        seasonal_item_sales_concentration_pct, seasonal_item_min_days_between_receives,
        seasonal_item_max_days_since_activity, seasonal_overrides_discontinued,
        discontinued_min_days_since_sold, discontinued_min_days_since_received,
        discontinued_requires_zero_inventory, clearance_min_inventory,
        clearance_max_recent_sales, clearance_min_days_since_received,
        clearance_min_days_of_supply, one_time_buy_max_receives,
        one_time_buy_min_days_since_first, one_time_buy_max_days_since_sold,
        is_active, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,true,$25)
      RETURNING id`,
      [req.body.newItemDaysFromCreation, req.body.newItemMaxReceives, req.body.newItemMustHaveSold,
       req.body.coreItemMinSalesMonths, req.body.coreItemMinReceives, req.body.coreItemMaxDaysBetweenReceives,
       req.body.coreItemMaxDaysSinceLastSold, req.body.coreItemMaxDaysSinceLastReceived,
       req.body.coreItemMinInventoryOrRecentSales, req.body.seasonalItemMinYears,
       req.body.seasonalItemSalesConcentrationPct, req.body.seasonalItemMinDaysBetweenReceives,
       req.body.seasonalItemMaxDaysSinceActivity, req.body.seasonalOverridesDiscontinued,
       req.body.discontinuedMinDaysSinceSold, req.body.discontinuedMinDaysSinceReceived,
       req.body.discontinuedRequiresZeroInventory, req.body.clearanceMinInventory,
       req.body.clearanceMaxRecentSales, req.body.clearanceMinDaysSinceReceived,
       req.body.clearanceMinDaysOfSupply, req.body.oneTimeBuyMaxReceives,
       req.body.oneTimeBuyMinDaysSinceFirst, req.body.oneTimeBuyMaxDaysSinceSold, userId]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Get stats
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT COUNT(*) as total, MAX(last_calculated_at) as last_calculated
      FROM item_receiving_metrics
    `);

    const byLifecycle = await db.query(`
      SELECT lifecycle_stage, COUNT(*) as count
      FROM item_receiving_metrics
      WHERE lifecycle_stage IS NOT NULL
      GROUP BY lifecycle_stage ORDER BY count DESC
    `);

    res.json({
      total: parseInt(stats.rows[0].total),
      lastCalculated: stats.rows[0].last_calculated,
      byLifecycle: byLifecycle.rows.reduce((acc, row) => {
        acc[row.lifecycle_stage] = parseInt(row.count);
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get count
router.get('/count', ensureAuthenticated, async (req, res) => {
  try {
    const result = await db.query(`SELECT COUNT(DISTINCT item_number) as total FROM item_list`);
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error counting items:', error);
    res.status(500).json({ error: 'Failed to count items' });
  }
});

// Calculate metrics - Multi-dimensional analysis
router.post('/calculate', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.user_id || 'system';
    const { batchSize = 100, offset = 0 } = req.body;

    const settingsResult = await db.query(
      `SELECT * FROM receiving_metrics_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1`
    );

    const settings = settingsResult.rows[0] || {
      clearance_min_inventory: 10,
      clearance_max_recent_sales: 3,
      core_item_min_sales_months: 6,
      discontinued_min_days_since_sold: 180,
    };

    // Multi-dimensional calculation query
    const query = `
      WITH sales_metrics AS (
        SELECT 
          sku as item_number,
          COUNT(*) as total_sales_count,
          COUNT(DISTINCT DATE_TRUNC('month', date)) FILTER (
            WHERE date >= CURRENT_DATE - INTERVAL '12 months'
          ) as sales_months_last_year,
          SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 ELSE 0 END) as sales_last_90days,
          jsonb_object_agg(
            EXTRACT(MONTH FROM date)::text, COUNT(*)
          ) FILTER (WHERE date IS NOT NULL) as sales_by_month
        FROM sales_transactions
        GROUP BY sku
      ),
      inventory_status AS (
        SELECT item_number, avail_qty, creation_date, last_sold, last_rcvd,
               EXTRACT(EPOCH FROM (CURRENT_DATE - last_sold)) / 86400 as days_since_last_sold,
               EXTRACT(EPOCH FROM (CURRENT_DATE - last_rcvd)) / 86400 as days_since_last_received
        FROM item_list
      ),
      receiving_patterns AS (
        SELECT rl.item_number, COUNT(DISTINCT rv.voucher_number) as total_receive_count,
               COUNT(DISTINCT DATE_TRUNC('year', rv.date)) as unique_receive_years
        FROM receiving_lines rl
        INNER JOIN receiving_vouchers rv ON rl.voucher_id = rv.voucher_number
        GROUP BY rl.item_number
      )

      SELECT i.item_number, s.sales_months_last_year, s.sales_last_90days,
             CASE 
               WHEN s.sales_last_90days > 0 THEN (i.avail_qty::float / s.sales_last_90days) * 90
               ELSE NULL
             END as days_of_supply,
             CASE
               WHEN i.avail_qty >= $1 AND COALESCE(s.sales_last_90days, 0) <= $2
                 AND i.days_since_last_received >= $3
               THEN 'Clearance'
               WHEN s.sales_months_last_year >= $4 THEN 'Core'
               WHEN i.days_since_last_sold >= $5 THEN 'Discontinued'
               ELSE 'One-Time'
             END as lifecycle_stage
      FROM inventory_status i
      LEFT JOIN receiving_patterns r ON i.item_number = r.item_number
      LEFT JOIN sales_metrics s ON i.item_number = s.item_number
      WHERE i.item_number IS NOT NULL
      LIMIT $6 OFFSET $7
    `;

    const result = await db.query(query, [
      settings.clearance_min_inventory,
      settings.clearance_max_recent_sales,
      settings.clearance_min_days_since_received || 180,
      settings.core_item_min_sales_months,
      settings.discontinued_min_days_since_sold,
      batchSize, offset
    ]);

    if (result.rows.length === 0) {
      return res.json({ processed: 0, hasMore: false });
    }

    for (const row of result.rows) {
      await db.query(
        `INSERT INTO item_receiving_metrics (
          item_number, lifecycle_stage, sales_months_last_year, sales_last_90days,
          days_of_supply, last_calculated_at, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
        ON CONFLICT (item_number) DO UPDATE SET
          lifecycle_stage = EXCLUDED.lifecycle_stage,
          sales_months_last_year = EXCLUDED.sales_months_last_year,
          sales_last_90days = EXCLUDED.sales_last_90days,
          days_of_supply = EXCLUDED.days_of_supply,
          last_calculated_at = CURRENT_TIMESTAMP`,
        [row.item_number, row.lifecycle_stage, row.sales_months_last_year,
         row.sales_last_90days, row.days_of_supply, userId]
      );
    }

    res.json({
      processed: result.rows.length,
      hasMore: result.rows.length === batchSize,
      nextOffset: offset + result.rows.length,
    });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: 'Failed to calculate metrics' });
  }
});

// Delete all metrics
router.delete('/', ensureAuthenticated, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM item_receiving_metrics');
    res.json({ success: true, deleted: result.rowCount });
  } catch (error) {
    console.error('Error deleting metrics:', error);
    res.status(500).json({ error: 'Failed to delete metrics' });
  }
});

// Export metrics
router.get('/export', ensureAuthenticated, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT COUNT(*) as total, MAX(last_calculated_at) as last_calculated
      FROM item_receiving_metrics
    `);

    const byLifecycle = await db.query(`
      SELECT lifecycle_stage, COUNT(*) as count
      FROM item_receiving_metrics
      WHERE lifecycle_stage IS NOT NULL
      GROUP BY lifecycle_stage
    `);

    const metrics = await db.query(`
      SELECT m.*, i.item_name, i.vendor_name, i.category, i.avail_qty, i.last_sold
      FROM item_receiving_metrics m
      LEFT JOIN item_list i ON m.item_number = i.item_number
      ORDER BY m.lifecycle_stage, m.item_number
    `);

    res.json({
      stats: {
        total: parseInt(stats.rows[0].total),
        lastCalculated: stats.rows[0].last_calculated,
        byLifecycle: byLifecycle.rows.reduce((acc, row) => {
          acc[row.lifecycle_stage] = parseInt(row.count);
          return acc;
        }, {}),
      },
      metrics: metrics.rows,
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({ error: 'Failed to export metrics' });
  }
});

export default router;
