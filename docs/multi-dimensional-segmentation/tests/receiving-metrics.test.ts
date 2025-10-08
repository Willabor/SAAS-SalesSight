import { describe, it, expect, beforeEach } from '@jest/globals';
import { db } from '../db';

describe('Multi-Dimensional Product Segmentation', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM item_receiving_metrics WHERE item_number LIKE \'TEST%\'');
    await db.query('DELETE FROM sales_transactions WHERE sku LIKE \'TEST%\'');
    await db.query('DELETE FROM item_list WHERE item_number LIKE \'TEST%\'');
  });

  describe('NEW ITEMS Classification', () => {
    it('should classify item created within 30 days as New', async () => {
      await db.query(`
        INSERT INTO item_list (item_number, item_name, creation_date, last_rcvd, avail_qty)
        VALUES ('TEST001', 'New Test Item', CURRENT_DATE - INTERVAL '20 days', 
                CURRENT_DATE - INTERVAL '20 days', 5)
      `);

      const result = await db.query(`
        SELECT 
          CASE 
            WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - creation_date)) / 86400 <= 30
            THEN 'New' ELSE 'Other'
          END as lifecycle_stage
        FROM item_list WHERE item_number = 'TEST001'
      `);

      expect(result.rows[0].lifecycle_stage).toBe('New');
    });
  });

  describe('CORE ITEMS Classification', () => {
    it('should classify item with consistent sales as Core', async () => {
      await db.query(`
        INSERT INTO item_list (item_number, item_name, last_sold, last_rcvd, avail_qty)
        VALUES ('TEST003', 'Core Item', CURRENT_DATE - INTERVAL '5 days',
                CURRENT_DATE - INTERVAL '30 days', 10)
      `);

      // Insert sales across 8 months
      for (let i = 0; i < 8; i++) {
        await db.query(`
          INSERT INTO sales_transactions (date, store, receipt_number, sku, item_name, price)
          VALUES (CURRENT_DATE - INTERVAL '${i * 30} days', 'HQ', ${1000 + i}, 
                  'TEST003', 'Core Item', 50.00)
        `);
      }

      const result = await db.query(`
        WITH sales_metrics AS (
          SELECT 
            sku,
            COUNT(DISTINCT DATE_TRUNC('month', date)) as sales_months
          FROM sales_transactions
          WHERE sku = 'TEST003'
          GROUP BY sku
        )
        SELECT 
          CASE WHEN s.sales_months >= 6 THEN 'Core' ELSE 'Not Core' END as lifecycle_stage
        FROM item_list i
        LEFT JOIN sales_metrics s ON i.item_number = s.sku
        WHERE i.item_number = 'TEST003'
      `);

      expect(result.rows[0].lifecycle_stage).toBe('Core');
    });
  });

  describe('CLEARANCE ITEMS Classification', () => {
    it('should classify high-inventory low-sales item as Clearance', async () => {
      await db.query(`
        INSERT INTO item_list (item_number, item_name, last_rcvd, last_sold, avail_qty)
        VALUES ('TEST006', 'Clearance Item', CURRENT_DATE - INTERVAL '200 days',
                CURRENT_DATE - INTERVAL '30 days', 50)
      `);

      await db.query(`
        INSERT INTO sales_transactions (date, store, receipt_number, sku, item_name, price)
        VALUES 
          (CURRENT_DATE - INTERVAL '20 days', 'HQ', 3001, 'TEST006', 'Clearance Item', 25.00),
          (CURRENT_DATE - INTERVAL '40 days', 'HQ', 3002, 'TEST006', 'Clearance Item', 25.00)
      `);

      const result = await db.query(`
        WITH sales_metrics AS (
          SELECT 
            sku,
            COUNT(*) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '90 days') as sales_90d
          FROM sales_transactions
          WHERE sku = 'TEST006'
          GROUP BY sku
        )
        SELECT 
          CASE 
            WHEN i.avail_qty >= 10 AND s.sales_90d <= 3 
            THEN 'Clearance' ELSE 'Not Clearance'
          END as lifecycle_stage,
          i.avail_qty,
          s.sales_90d
        FROM item_list i
        LEFT JOIN sales_metrics s ON i.item_number = s.sku
        WHERE i.item_number = 'TEST006'
      `);

      expect(result.rows[0].lifecycle_stage).toBe('Clearance');
      expect(result.rows[0].avail_qty).toBeGreaterThanOrEqual(10);
    });
  });

  describe('DISCONTINUED ITEMS Classification', () => {
    it('should classify zero-inventory no-activity item as Discontinued', async () => {
      await db.query(`
        INSERT INTO item_list (item_number, item_name, last_rcvd, last_sold, 
                               avail_qty, hq_qty, gm_qty, hm_qty, mm_qty, nm_qty, pm_qty, lm_qty)
        VALUES ('TEST007', 'Discontinued Item', CURRENT_DATE - INTERVAL '200 days',
                CURRENT_DATE - INTERVAL '200 days', 0, 0, 0, 0, 0, 0, 0, 0)
      `);

      const result = await db.query(`
        SELECT 
          CASE 
            WHEN (avail_qty + hq_qty + gm_qty) = 0
              AND EXTRACT(EPOCH FROM (CURRENT_DATE - last_rcvd)) / 86400 >= 180
            THEN 'Discontinued' ELSE 'Active'
          END as lifecycle_stage
        FROM item_list WHERE item_number = 'TEST007'
      `);

      expect(result.rows[0].lifecycle_stage).toBe('Discontinued');
    });
  });
});
