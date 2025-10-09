import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertItemListSchema, insertSalesTransactionSchema, insertUploadHistorySchema, insertReceivingVoucherSchema, insertReceivingLineSchema, type InsertSalesTransaction, receivingVouchers } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  calculateMetricsForStyle,
  calculateAllMetrics,
  getAffectedStylesFromVouchers
} from "./lib/receiving-metrics-calculator";

// Timezone-agnostic date normalization to YYYY-MM-DD
function normalizeDate(dateInput: string | null | undefined): string | null {
  if (!dateInput) return null;
  
  const dateStr = String(dateInput).trim();
  if (!dateStr) return null;
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // MM/DD/YYYY or M/D/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdyMatch) {
    let [, month, day, year] = mdyMatch;
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      year = (parseInt(year) > 50 ? '19' : '20') + year;
    }
    // Zero-pad month and day
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try ISO string format (YYYY-MM-DDTHH:mm:ss...)
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  
  // Fallback: return null for unrecognized formats
  console.warn(`Unrecognized date format: ${dateStr}`);
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Health check (public)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // Get dashboard statistics
  app.get("/api/stats/item-list", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getItemListStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching item list stats:", error);
      res.status(500).json({ error: "Failed to fetch item list statistics" });
    }
  });

  app.get("/api/stats/sales", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getSalesStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sales stats:", error);
      res.status(500).json({ error: "Failed to fetch sales statistics" });
    }
  });

  // Get item list enhanced statistics
  app.get("/api/stats/item-list-enhanced", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getItemListEnhancedStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching enhanced item list stats:", error);
      res.status(500).json({ error: "Failed to fetch enhanced item list statistics" });
    }
  });

  // Get item list filter options
  app.get("/api/item-list/filter-options", isAuthenticated, async (req, res) => {
    try {
      const options = await storage.getItemListFilterOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching filter options:", error);
      res.status(500).json({ error: "Failed to fetch filter options" });
    }
  });

  // Export item list
  app.get("/api/item-list/export", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const gender = req.query.gender as string | undefined;
      const vendor = req.query.vendor as string | undefined;
      const search = req.query.search as string | undefined;
      
      const items = await storage.getAllItemListForExport(category, gender, vendor, search);
      res.json(items);
    } catch (error) {
      console.error("Error exporting item list:", error);
      res.status(500).json({ error: "Failed to export item list" });
    }
  });

  // Get all item list data with pagination and search
  app.get("/api/item-list", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit)) || 50;
      const offset = parseInt(String(req.query.offset)) || 0;
      const search = req.query.search ? String(req.query.search) : undefined;
      const category = req.query.category as string | undefined;
      const gender = req.query.gender as string | undefined;
      const vendor = req.query.vendor as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortDirection = req.query.sortDirection as 'asc' | 'desc' | undefined;
      
      const result = await storage.getAllItemList(limit, offset, search, category, gender, vendor, sortBy, sortDirection);
      res.json(result);
    } catch (error) {
      console.error("Error fetching item list:", error);
      res.status(500).json({ error: "Failed to fetch item list" });
    }
  });

  // Delete individual item from item list
  app.delete("/api/item-list/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      const deleted = await storage.deleteItemList(id);
      if (deleted) {
        res.json({ success: true, message: "Item deleted successfully" });
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Clear all item list data
  app.delete("/api/item-list", isAuthenticated, async (req, res) => {
    try {
      const deletedCount = await storage.deleteAllItemList();
      res.json({ 
        success: true, 
        message: `Cleared ${deletedCount} items from database`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error clearing item list:", error);
      res.status(500).json({ error: "Failed to clear item list" });
    }
  });

  // Upload item list data
  app.post("/api/upload/item-list", isAuthenticated, async (req, res) => {
    try {
      const { data, mode, fileName } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      let uploaded = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        try {
          // Validate the item data
          const validatedItem = insertItemListSchema.parse({
            itemNumber: String(item.item_number || item.itemNumber || ""),
            vendorName: String(item.vendor_name || item.vendorName || ""),
            itemName: String(item.item_name || item.itemName || ""),
            category: item.category ? String(item.category) : null,
            gender: item.gender ? String(item.gender) : null,
            availQty: parseInt(String(item.avail_qty || item.availQty || "0")),
            hqQty: parseInt(String(item.hq_qty || item.hqQty || "0")),
            gmQty: parseInt(String(item.gm_qty || item.gmQty || "0")),
            hmQty: parseInt(String(item.hm_qty || item.hmQty || "0")),
            mmQty: parseInt(String(item.mm_qty || item.mmQty || "0")),
            nmQty: parseInt(String(item.nm_qty || item.nmQty || "0")),
            pmQty: parseInt(String(item.pm_qty || item.pmQty || "0")),
            lmQty: parseInt(String(item.lm_qty || item.lmQty || "0")),
            lastRcvd: item.last_rcvd || item.lastRcvd || null,
            creationDate: item.creation_date || item.creationDate || null,
            lastSold: item.last_sold || item.lastSold || null,
            styleNumber: item.style_number || item.styleNumber ? String(item.style_number || item.styleNumber) : null,
            styleNumber2: item.style_number_2 || item.styleNumber2 ? String(item.style_number_2 || item.styleNumber2) : null,
            orderCost: item.order_cost || item.orderCost ? String(item.order_cost || item.orderCost) : null,
            sellingPrice: item.selling_price || item.sellingPrice ? String(item.selling_price || item.sellingPrice) : null,
            notes: item.notes ? String(item.notes) : null,
            size: item.size ? String(item.size) : null,
            attribute: item.attribute ? String(item.attribute) : null,
            fileName: fileName,
          });

          if (mode === "weekly_update") {
            await storage.upsertItemList(validatedItem);
          } else {
            await storage.createItemList(validatedItem);
          }
          uploaded++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Row ${index + 1}: ${errorMessage}`);
        }
      }

      // Record upload history
      await storage.createUploadHistory({
        fileName: fileName || "unknown.xlsx",
        uploadType: "item_list",
        uploadMode: mode || "initial",
        totalRecords: data.length,
        successfulRecords: uploaded,
        failedRecords: failed,
        errors: JSON.stringify(errors.slice(0, 100)), // Limit to first 100 errors
      });

      res.json({
        success: true,
        uploaded,
        skipped: 0, // Item list doesn't track skipped records
        failed,
        total: data.length,
        errors: errors.slice(0, 5), // Return first 5 errors
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Upload sales transactions
  app.post("/api/upload/sales-transactions", isAuthenticated, async (req, res) => {
    try {
      const { data, fileName } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      // Step 1: Validate all transactions and create composite keys
      const validatedTransactions: Array<{ 
        transaction: InsertSalesTransaction; 
        compositeKey: string;
        index: number;
      }> = [];
      const errors: string[] = [];
      let failed = 0;

      for (let index = 0; index < data.length; index++) {
        const transaction = data[index];
        try {
          // Validate the transaction data - convert all values to appropriate types
          const rawData = {
            date: transaction.Date || transaction.date,
            store: transaction.Store || transaction.store,
            receiptNumber: transaction["Receipt #"] || transaction.receiptNumber,
            sku: transaction.SKU || transaction.sku,
            itemName: transaction["Item Name"] || transaction.itemName,
            transactionStoreType: transaction["Transaction Store Type"] || transaction.transactionStoreType,
            price: transaction.Price || transaction.price,
            sheet: transaction.Sheet || transaction.sheet,
          };

          const validatedTransaction = insertSalesTransactionSchema.parse({
            date: rawData.date,
            store: rawData.store != null ? String(rawData.store) : null,
            receiptNumber: rawData.receiptNumber != null ? String(rawData.receiptNumber) : null,
            sku: rawData.sku != null ? String(rawData.sku) : null,
            itemName: rawData.itemName != null ? String(rawData.itemName) : null,
            transactionStoreType: rawData.transactionStoreType != null ? String(rawData.transactionStoreType) : null,
            price: rawData.price != null ? String(rawData.price) : "0",
            sheet: rawData.sheet != null ? String(rawData.sheet) : null,
          });

          // Normalize fields for consistent comparison (timezone-agnostic)
          const normalizedPrice = validatedTransaction.price ? String(Number(validatedTransaction.price)) : null;
          const normalizedDate = normalizeDate(validatedTransaction.date);
          
          // Update transaction with normalized date to ensure consistency
          validatedTransaction.date = normalizedDate;
          
          // Create composite key using ALL fields to handle multiple same-item purchases
          const compositeKey = `${validatedTransaction.receiptNumber}|${normalizedDate}|${validatedTransaction.sku}|${validatedTransaction.store}|${validatedTransaction.itemName}|${validatedTransaction.transactionStoreType}|${normalizedPrice}|${validatedTransaction.sheet}`;

          validatedTransactions.push({
            transaction: validatedTransaction,
            compositeKey,
            index: index + 1
          });
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Row ${index + 1}: ${errorMessage}`);
        }
      }

      // Step 2: Check for existing transactions using ALL fields (not just receipt+date+sku)
      // This ensures customers buying multiple of same item on same receipt are handled correctly
      const transactionsToCheck = validatedTransactions.map(v => ({
        // Date already normalized during validation
        date: v.transaction.date ?? null,
        store: v.transaction.store ?? null,
        receiptNumber: v.transaction.receiptNumber ?? null,
        sku: v.transaction.sku ?? null,
        itemName: v.transaction.itemName ?? null,
        transactionStoreType: v.transaction.transactionStoreType ?? null,
        // Normalize price to match database format (numeric::text)
        price: v.transaction.price ? String(Number(v.transaction.price)) : null,
        sheet: v.transaction.sheet ?? null
      }));
      
      const existingTransactions = await storage.getExistingTransactions(transactionsToCheck);

      // Step 3: Filter out duplicates and insert only new transactions
      // Track in-file duplicates to prevent inserting same transaction twice in one upload
      const insertedInThisUpload = new Set<string>();
      let uploaded = 0;
      let skipped = 0;
      const skippedDetails: string[] = [];

      for (const { transaction, compositeKey, index } of validatedTransactions) {
        // Check both database and in-file duplicates
        if (existingTransactions.has(compositeKey) || insertedInThisUpload.has(compositeKey)) {
          skipped++;
          if (skippedDetails.length < 10) {
            const reason = existingTransactions.has(compositeKey) ? "already in database" : "duplicate in file";
            skippedDetails.push(`Receipt ${transaction.receiptNumber} - SKU ${transaction.sku} on ${transaction.date} (${reason})`);
          }
        } else {
          try {
            await storage.createSalesTransaction(transaction);
            insertedInThisUpload.add(compositeKey);
            uploaded++;
          } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            errors.push(`Row ${index}: Database error - ${errorMessage}`);
          }
        }
      }

      // Record upload history
      await storage.createUploadHistory({
        fileName: fileName || "unknown.xlsx",
        uploadType: "sales_transactions",
        totalRecords: data.length,
        successfulRecords: uploaded,
        failedRecords: failed,
        skippedRecords: skipped,
        errors: JSON.stringify(errors.slice(0, 100)), // Limit to first 100 errors
      });

      res.json({
        success: true,
        uploaded,
        skipped,
        failed,
        total: data.length,
        errors: errors.slice(0, 5), // Return first 5 errors
        duplicateTransactions: skippedDetails, // Sample of skipped transactions
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get recent upload history
  app.get("/api/upload-history", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await storage.getRecentUploads(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  // Get all sales transactions with pagination, search, and filters
  app.get("/api/sales-transactions", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit)) || 50;
      const offset = parseInt(String(req.query.offset)) || 0;
      const search = req.query.search ? String(req.query.search) : undefined;

      // Parse date range (YYYY-MM-DD format)
      const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
      const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;

      // Parse stores (comma-separated)
      let stores: string[] | undefined;
      if (req.query.stores) {
        stores = String(req.query.stores)
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        if (stores.length === 0) stores = undefined;
      }

      // Parse sorting parameters
      const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
      const sortDirection = req.query.sortDirection === 'asc' ? 'asc' : 'desc';

      const result = await storage.getAllSalesTransactions(limit, offset, search, dateFrom, dateTo, stores, sortBy, sortDirection);
      res.json(result);
    } catch (error) {
      console.error("Error fetching sales transactions:", error);
      res.status(500).json({ error: "Failed to fetch sales transactions" });
    }
  });

  // Update sales transaction
  app.put("/api/sales-transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }
      
      // Validate request body using partial schema
      const updateData = insertSalesTransactionSchema.partial().parse(req.body);
      
      const updated = await storage.updateSalesTransaction(id, updateData);
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "Transaction not found" });
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Delete individual sales transaction
  app.delete("/api/sales-transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }
      
      const deleted = await storage.deleteSalesTransaction(id);
      if (deleted) {
        res.json({ success: true, message: "Transaction deleted successfully" });
      } else {
        res.status(404).json({ error: "Transaction not found" });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Clear all sales transactions
  app.delete("/api/sales-transactions", isAuthenticated, async (req, res) => {
    try {
      const deletedCount = await storage.deleteAllSalesTransactions();
      res.json({ 
        success: true, 
        message: `Cleared ${deletedCount} transactions from database`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error clearing sales transactions:", error);
      res.status(500).json({ error: "Failed to clear sales transactions" });
    }
  });

  // Get sales insights
  app.get("/api/sales-insights", isAuthenticated, async (req, res) => {
    try {
      const insights = await storage.getSalesInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching sales insights:", error);
      res.status(500).json({ error: "Failed to fetch sales insights" });
    }
  });

  // Get filtered sales transaction insights (revenue by store, avg transaction value)
  app.get("/api/sales-transactions/insights", isAuthenticated, async (req, res) => {
    try {
      // Parse date range (YYYY-MM-DD format)
      const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
      const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;

      // Parse stores (comma-separated)
      let stores: string[] | undefined;
      if (req.query.stores) {
        stores = String(req.query.stores)
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        if (stores.length === 0) stores = undefined;
      }

      const search = req.query.search ? String(req.query.search) : undefined;

      const insights = await storage.getSalesTransactionInsights(dateFrom, dateTo, search, stores);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching sales transaction insights:", error);
      res.status(500).json({ error: "Failed to fetch sales transaction insights" });
    }
  });

  // ===== Receiving History Routes =====
  
  // Get receiving history statistics
  app.get("/api/receiving/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getReceivingStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching receiving stats:", error);
      res.status(500).json({ error: "Failed to fetch receiving statistics" });
    }
  });

  // Get all receiving vouchers with pagination and search
  app.get("/api/receiving/vouchers", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit)) || 50;
      const offset = parseInt(String(req.query.offset)) || 0;
      const search = req.query.search ? String(req.query.search) : undefined;
      const store = req.query.store ? String(req.query.store) : undefined;
      const vendor = req.query.vendor ? String(req.query.vendor) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const voucherNumber = req.query.voucherNumber ? String(req.query.voucherNumber) : undefined;
      const exactMatch = req.query.exactMatch === 'true';
      const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
      const sortDirection = req.query.sortDirection === 'asc' ? 'asc' : 'desc';

      const result = await storage.getReceivingVouchers({
        limit,
        offset,
        search,
        store,
        vendor,
        type,
        voucherNumber,
        exactMatch,
        sortBy,
        sortDirection,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching receiving vouchers:", error);
      res.status(500).json({ error: "Failed to fetch receiving vouchers" });
    }
  });

  // Get receiving filter options (stores, vendors, types)
  app.get("/api/receiving/filter-options", isAuthenticated, async (req, res) => {
    try {
      const options = await storage.getReceivingFilterOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching filter options:", error);
      res.status(500).json({ error: "Failed to fetch filter options" });
    }
  });

  // DEBUG: Get raw store values to check for issues
  app.get("/api/receiving/debug-stores", isAuthenticated, async (req, res) => {
    try {
      const result = await db.select({
        store: receivingVouchers.store,
        count: sql<number>`count(*)`
      })
      .from(receivingVouchers)
      .groupBy(receivingVouchers.store)
      .orderBy(receivingVouchers.store);

      res.json(result.map(r => ({
        store: r.store,
        length: r.store?.length || 0,
        count: r.count,
        quoted: `"${r.store}"`,
        charCodes: Array.from(r.store || '').map(c => c.charCodeAt(0))
      })));
    } catch (error) {
      console.error("Error fetching debug stores:", error);
      res.status(500).json({ error: "Failed to fetch debug data" });
    }
  });

  // Export receiving vouchers with filters
  app.get("/api/receiving/export", isAuthenticated, async (req, res) => {
    try {
      const store = req.query.store ? String(req.query.store) : undefined;
      const vendor = req.query.vendor ? String(req.query.vendor) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const vouchers = await storage.getAllReceivingVouchersForExport(store, vendor, type, search);
      res.json(vouchers);
    } catch (error) {
      console.error("Error exporting vouchers:", error);
      res.status(500).json({ error: "Failed to export vouchers" });
    }
  });

  // Export receiving line items with filters
  app.get("/api/receiving/export-lines", isAuthenticated, async (req, res) => {
    try {
      const store = req.query.store ? String(req.query.store) : undefined;
      const vendor = req.query.vendor ? String(req.query.vendor) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const lines = await storage.getAllReceivingLinesForExport(store, vendor, type, search);
      res.json(lines);
    } catch (error) {
      console.error("Error exporting line items:", error);
      res.status(500).json({ error: "Failed to export line items" });
    }
  });

  // Get voucher by ID with line items
  app.get("/api/receiving/vouchers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid voucher ID" });
      }

      const result = await storage.getVoucherByIdWithLines(id);
      console.log('Voucher detail result:', JSON.stringify(result, null, 2));
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Voucher not found" });
      }
    } catch (error) {
      console.error("Error fetching voucher:", error);
      res.status(500).json({ error: "Failed to fetch voucher details" });
    }
  });

  // Upload receiving history data
  app.post("/api/receiving/upload", isAuthenticated, async (req, res) => {
    try {
      const { vouchers, fileName } = req.body;
      
      if (!vouchers || !Array.isArray(vouchers)) {
        return res.status(400).json({ error: "Invalid data format. Expected array of vouchers." });
      }

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: "File name is required" });
      }

      const errors: string[] = [];
      let successfulVouchers = 0;
      let successfulLines = 0;
      let skippedVouchers = 0;
      const duplicateVouchers: any[] = [];

      // Step 1: Validate and prepare vouchers
      const validatedVouchers: Array<{
        voucher: z.infer<typeof insertReceivingVoucherSchema>;
        lines: Array<z.infer<typeof insertReceivingLineSchema>>;
        compositeKey: string;
      }> = [];

      vouchers.forEach((voucherData: any, index: number) => {
        try {
          // Validate voucher
          const validatedVoucher = insertReceivingVoucherSchema.parse({
            voucherNumber: voucherData.voucherNumber ? String(voucherData.voucherNumber) : null,
            date: voucherData.date || null,
            store: voucherData.store ? String(voucherData.store) : null,
            vendor: voucherData.vendor ? String(voucherData.vendor) : null,
            type: voucherData.type || 'Receiving',
            qbTotal: voucherData.qbTotal ? String(voucherData.qbTotal) : null,
            correctedTotal: voucherData.correctedTotal ? String(voucherData.correctedTotal) : null,
            totalQty: voucherData.totalQty || 0,
            time: voucherData.time ? String(voucherData.time) : null,
            fileName: fileName,
          });

          // Validate lines
          const lines = voucherData.lines || [];
          const validatedLines: Array<z.infer<typeof insertReceivingLineSchema>> = [];

          lines.forEach((lineData: any) => {
            const validatedLine = insertReceivingLineSchema.omit({ voucherId: true }).parse({
              itemNumber: lineData.itemNumber ? String(lineData.itemNumber) : null,
              itemName: lineData.itemName ? String(lineData.itemName) : null,
              qty: lineData.qty || 0,
              cost: lineData.cost ? String(lineData.cost) : "0",
            });
            validatedLines.push(validatedLine as any);
          });

          // Create composite key for duplicate detection (including totalQty)
          const compositeKey = `${validatedVoucher.voucherNumber}|${validatedVoucher.store}|${validatedVoucher.date}|${validatedVoucher.totalQty}`;

          validatedVouchers.push({
            voucher: validatedVoucher,
            lines: validatedLines,
            compositeKey,
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Voucher ${index + 1}: ${errorMessage}`);
        }
      });

      // Step 2: Check for existing vouchers (with totalQty in composite key)
      const vouchersToCheck = validatedVouchers.map(v => ({
        voucherNumber: v.voucher.voucherNumber!,
        store: v.voucher.store!,
        date: v.voucher.date!,
        totalQty: v.voucher.totalQty || 0,
      }));
      
      const existingVouchers = await storage.getExistingVouchers(vouchersToCheck);

      // Step 3: Insert new vouchers and their lines
      for (const { voucher, lines, compositeKey } of validatedVouchers) {
        if (existingVouchers.has(compositeKey)) {
          skippedVouchers++;
          duplicateVouchers.push({
            voucherNumber: voucher.voucherNumber,
            store: voucher.store,
            date: voucher.date,
            reason: 'Duplicate voucher'
          });
          continue;
        }

        try {
          // Insert voucher
          const insertedVoucher = await storage.upsertReceivingVoucher(voucher);
          successfulVouchers++;

          // Insert lines with voucher ID
          if (lines.length > 0) {
            const linesWithVoucherId = lines.map(line => ({
              ...line,
              voucherId: insertedVoucher.id,
            }));
            
            const insertedCount = await storage.bulkInsertReceivingLines(linesWithVoucherId as any);
            successfulLines += insertedCount;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to insert voucher ${voucher.voucherNumber}: ${errorMessage}`);
        }
      }

      // Step 4: Record upload history
      await storage.createUploadHistory({
        fileName,
        uploadType: 'receiving_history',
        totalRecords: vouchers.length,
        successfulRecords: successfulVouchers,
        failedRecords: errors.length,
        skippedRecords: skippedVouchers,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      });

      res.json({
        success: true,
        message: `Upload complete. ${successfulVouchers} vouchers and ${successfulLines} line items uploaded successfully.`,
        uploaded: successfulVouchers,
        lines: successfulLines,
        skipped: skippedVouchers,
        failed: errors.length,
        errors: errors.slice(0, 10),
        duplicateVouchers: duplicateVouchers.slice(0, 10),
      });

    } catch (error) {
      console.error("Error uploading receiving history:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Failed to upload receiving history", details: errorMessage });
    }
  });

  // Delete individual receiving voucher
  app.delete("/api/receiving/vouchers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid voucher ID" });
      }
      
      const deleted = await storage.deleteReceivingVoucher(id);
      if (deleted) {
        res.json({ success: true, message: "Voucher deleted successfully" });
      } else {
        res.status(404).json({ error: "Voucher not found" });
      }
    } catch (error) {
      console.error("Error deleting voucher:", error);
      res.status(500).json({ error: "Failed to delete voucher" });
    }
  });

  // Clear all receiving vouchers
  app.delete("/api/receiving/vouchers", isAuthenticated, async (req, res) => {
    try {
      const deletedCount = await storage.deleteAllReceivingVouchers();
      res.json({ 
        success: true, 
        message: `Cleared ${deletedCount} vouchers from database`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error clearing receiving vouchers:", error);
      res.status(500).json({ error: "Failed to clear receiving vouchers" });
    }
  });

  // Inventory Turnover API endpoints
  app.get("/api/inventory/turnover-metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getInventoryTurnoverMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching inventory turnover metrics:", error);
      res.status(500).json({ error: "Failed to fetch inventory turnover metrics" });
    }
  });

  app.get("/api/inventory/slow-moving", isAuthenticated, async (req, res) => {
    try {
      const daysThreshold = parseInt(req.query.days as string) || 90;
      const limit = parseInt(req.query.limit as string) || 100;
      const slowMovingStock = await storage.getSlowMovingStock(daysThreshold, limit);
      res.json(slowMovingStock);
    } catch (error) {
      console.error("Error fetching slow-moving stock:", error);
      res.status(500).json({ error: "Failed to fetch slow-moving stock" });
    }
  });

  app.get("/api/inventory/overstock-understock", isAuthenticated, async (req, res) => {
    try {
      const daysRange = parseInt(req.query.days as string) || 30;
      const limit = parseInt(req.query.limit as string) || 100;
      const overstockThreshold = parseInt(req.query.overstockThreshold as string) || 90;
      const understockThreshold = parseInt(req.query.understockThreshold as string) || 7;
      const analysis = await storage.getOverstockUnderstockAnalysis(daysRange, limit, overstockThreshold, understockThreshold);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching overstock/understock analysis:", error);
      res.status(500).json({ error: "Failed to fetch overstock/understock analysis" });
    }
  });

  app.get("/api/inventory/category-analysis", isAuthenticated, async (req, res) => {
    try {
      const daysRange = parseInt(req.query.days as string) || 30;
      const categoryAnalysis = await storage.getCategoryInventoryAnalysis(daysRange);
      res.json(categoryAnalysis);
    } catch (error) {
      console.error("Error fetching category inventory analysis:", error);
      res.status(500).json({ error: "Failed to fetch category inventory analysis" });
    }
  });

  // Style-level Inventory Turnover API endpoints (new)
  app.get("/api/inventory/style-metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getStyleInventoryMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching style inventory metrics:", error);
      res.status(500).json({ error: "Failed to fetch style inventory metrics" });
    }
  });

  app.get("/api/inventory/style-slow-moving", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const slowMoving = await storage.getStyleSlowMoving(limit);
      res.json(slowMoving);
    } catch (error) {
      console.error("Error fetching style slow-moving stock:", error);
      res.status(500).json({ error: "Failed to fetch style slow-moving stock" });
    }
  });

  app.get("/api/inventory/style-overstock-understock", isAuthenticated, async (req, res) => {
    try {
      const daysRange = parseInt(req.query.days as string) || 30;
      const limit = parseInt(req.query.limit as string) || 100;
      const analysis = await storage.getStyleOverstockUnderstock(daysRange, limit);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching style overstock/understock analysis:", error);
      res.status(500).json({ error: "Failed to fetch style overstock/understock analysis" });
    }
  });

  app.get("/api/inventory/transfer-recommendations", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const recommendations = await storage.getTransferRecommendations(limit);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching transfer recommendations:", error);
      res.status(500).json({ error: "Failed to fetch transfer recommendations" });
    }
  });

  app.get("/api/inventory/transfer-recommendations-ml", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      // Call Python ML service
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const mlResponse = await fetch(`${mlServiceUrl}/api/ml/predict-transfers?limit=${limit}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!mlResponse.ok) {
        throw new Error(`ML service error: ${mlResponse.statusText}`);
      }

      const mlData = await mlResponse.json();

      // Transform to match frontend interface
      const recommendations = mlData.predictions.map((pred: any) => ({
        styleNumber: pred.style_number,
        itemName: pred.item_name,
        category: pred.category,
        fromStore: pred.from_store,
        toStore: pred.to_store,
        fromStoreQty: pred.from_store_qty,
        toStoreQty: pred.to_store_qty,
        fromStoreDailySales: pred.from_store_daily_sales,
        toStoreDailySales: pred.to_store_daily_sales,
        recommendedQty: pred.recommended_qty,
        priority: pred.ml_priority,
        avgMarginPercent: pred.margin_percent,

        // ML-specific fields
        mlPowered: true,
        successProbability: pred.success_probability,
        mlPriorityScore: pred.ml_priority_score,
        confidenceLevel: pred.success_probability > 0.7 ? 'High' :
                        pred.success_probability > 0.5 ? 'Medium' : 'Low',
        modelVersion: pred.model_version
      }));

      res.json(recommendations);

    } catch (error) {
      console.error('ML prediction error:', error);

      // Fallback to rule-based recommendations
      const limit = parseInt(req.query.limit as string) || 20;
      const fallback = await storage.getTransferRecommendations(limit);
      res.json(fallback.map(item => ({ ...item, mlPowered: false })));
    }
  });

  app.get("/api/inventory/restocking-recommendations", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const recommendations = await storage.getRestockingRecommendations(limit);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching restocking recommendations:", error);
      res.status(500).json({ error: "Failed to fetch restocking recommendations" });
    }
  });

  app.get("/api/inventory/sale-recommendations", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const recommendations = await storage.getSaleRecommendations(limit);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching sale recommendations:", error);
      res.status(500).json({ error: "Failed to fetch sale recommendations" });
    }
  });

  app.get("/api/inventory/product-segmentation", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getProductSegmentationReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching product segmentation report:", error);
      res.status(500).json({ error: "Failed to fetch product segmentation report" });
    }
  });

  // ML-powered product segmentation endpoint
  app.get("/api/inventory/ml-product-segmentation", isAuthenticated, async (req, res) => {
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL;

      if (!mlServiceUrl) {
        console.log("ML_SERVICE_URL not configured, falling back to rule-based segmentation");
        const ruleBasedReport = await storage.getProductSegmentationReport();
        return res.json(ruleBasedReport);
      }

      // Fetch ML-powered segmentation from Python service
      const response = await fetch(`${mlServiceUrl}/api/ml/product-segmentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Could include parameters here if needed
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service responded with status ${response.status}`);
      }

      const mlSegmentation = await response.json();
      res.json(mlSegmentation);

    } catch (error) {
      console.error("ML segmentation failed, falling back to rule-based:", error);
      // Fallback to rule-based segmentation
      try {
        const ruleBasedReport = await storage.getProductSegmentationReport();
        res.json(ruleBasedReport);
      } catch (fallbackError) {
        console.error("Error in fallback segmentation:", fallbackError);
        res.status(500).json({ error: "Failed to fetch product segmentation" });
      }
    }
  });

  // Get filter options (categories, vendors, genders) for ML settings
  app.get("/api/inventory/filter-options", isAuthenticated, async (req, res) => {
    try {
      const options = await storage.getItemListFilterOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching filter options:", error);
      res.status(500).json({ error: "Failed to fetch filter options" });
    }
  });

  // ML Training endpoint with custom settings
  app.post("/api/ml/train-segmentation", isAuthenticated, async (req, res) => {
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL;

      if (!mlServiceUrl) {
        return res.status(503).json({ error: "ML service not configured" });
      }

      // Get settings from request body or use defaults
      const filters = req.body.filters || {};
      const trainingDays = req.body.trainingDays || 90;
      const settings = {
        days_back: trainingDays,
        new_arrivals_days: req.body.newArrivalsDays || 60,
        best_seller_threshold: req.body.bestSellerThreshold || 50,
        core_high_threshold: req.body.coreHighThreshold || 40,
        core_medium_threshold: req.body.coreMediumThreshold || 20,
        core_low_threshold: req.body.coreLowThreshold || 6,
        clearance_days: req.body.clearanceDays || 180,
        filters: {
          sales_period_days: filters.salesPeriodDays || trainingDays,
          exclude_before: filters.excludeBefore,
          included_categories: filters.includedCategories || [],
          excluded_categories: filters.excludedCategories || [],
          included_stores: filters.includedStores || [],
          excluded_vendors: filters.excludedVendors || [],
          included_genders: filters.includedGenders || [],
          min_price: filters.minPrice,
          max_price: filters.maxPrice,
          min_inventory: filters.minInventory,
          max_inventory: filters.maxInventory,
          exclude_zero_inventory: filters.excludeZeroInventory,
          include_receiving_history: filters.includeReceivingHistory,
          receiving_history_days: filters.receivingHistoryDays,
          selected_features: filters.selectedFeatures || [],
        },
      };

      console.log("Training ML model with settings:", settings);

      const startTime = Date.now();
      const response = await fetch(`${mlServiceUrl}/api/ml/train-segmentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ML service error (${response.status}):`, errorText);
        throw new Error(`ML service training failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const trainingDuration = Date.now() - startTime;

      // Log ML settings change
      try {
        const user = (req.user as any);
        const logEntry = {
          userId: user?.claims?.sub || null,
          modelVersion: result.model_version,
          settingsSnapshot: JSON.stringify(req.body),
          changedFields: null, // TODO: Track which fields changed from previous
          trainingDays: req.body.trainingDays,
          newArrivalsDays: req.body.newArrivalsDays,
          bestSellerThreshold: req.body.bestSellerThreshold,
          coreHighThreshold: req.body.coreHighThreshold,
          coreMediumThreshold: req.body.coreMediumThreshold,
          coreLowThreshold: req.body.coreLowThreshold,
          clearanceDays: req.body.clearanceDays,
          filtersEnabled: Object.keys(filters).length > 0,
          receivingHistoryEnabled: filters.includeReceivingHistory || false,
          featureSelectionEnabled: (filters.selectedFeatures && filters.selectedFeatures.length > 0) || false,
          testAccuracy: result.test_accuracy ? result.test_accuracy.toString() : null,
          trainingStatus: 'success',
          errorMessage: null,
          trainingDurationMs: trainingDuration,
        };

        // Save to database
        await storage.createMLSettingsLog(logEntry);

        console.log("📊 ML Settings Log:", {
          user: logEntry.userId,
          version: logEntry.modelVersion,
          accuracy: logEntry.testAccuracy,
          duration: `${trainingDuration}ms`,
          filtersEnabled: logEntry.filtersEnabled,
          receivingHistory: logEntry.receivingHistoryEnabled,
          featureSelection: logEntry.featureSelectionEnabled,
        });
      } catch (logError) {
        console.error("Failed to log ML settings:", logError);
        // Don't fail the request if logging fails
      }

      res.json(result);

    } catch (error) {
      console.error("ML training failed:", error);

      // Log failed training attempt
      try {
        const user = (req.user as any);
        const filters = req.body.filters || {};
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        const failedLogEntry = {
          userId: user?.claims?.sub || null,
          modelVersion: null,
          settingsSnapshot: JSON.stringify(req.body),
          changedFields: null,
          trainingDays: req.body.trainingDays,
          newArrivalsDays: req.body.newArrivalsDays,
          bestSellerThreshold: req.body.bestSellerThreshold,
          coreHighThreshold: req.body.coreHighThreshold,
          coreMediumThreshold: req.body.coreMediumThreshold,
          coreLowThreshold: req.body.coreLowThreshold,
          clearanceDays: req.body.clearanceDays,
          filtersEnabled: Object.keys(filters).length > 0,
          receivingHistoryEnabled: filters.includeReceivingHistory || false,
          featureSelectionEnabled: (filters.selectedFeatures && filters.selectedFeatures.length > 0) || false,
          testAccuracy: null,
          trainingStatus: 'failed',
          errorMessage: errorMessage,
          trainingDurationMs: 0,
        };

        // Save failed attempt to database
        await storage.createMLSettingsLog(failedLogEntry);

        console.log("❌ ML Training Failed:", {
          user: user?.claims?.sub || 'unknown',
          error: errorMessage,
          settings: req.body,
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
        // Ignore logging errors
      }

      res.status(500).json({ error: "Failed to train ML model" });
    }
  });

  // Get ML settings log (training history)
  app.get("/api/ml/settings-log", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getMLSettingsLogs(100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching ML settings log:", error);
      res.status(500).json({ error: "Failed to fetch ML settings log" });
    }
  });

  // Receiving Metrics endpoints
  
  // Get all style numbers for batch processing
  app.get("/api/receiving-metrics/style-numbers", isAuthenticated, async (req, res) => {
    try {
      const styleNumbers = await db.execute(sql`
        SELECT DISTINCT style_number
        FROM item_list
        WHERE style_number IS NOT NULL
        ORDER BY style_number
      `);
      
      res.json({
        styleNumbers: styleNumbers.rows.map((r: any) => r.style_number),
        total: styleNumbers.rows.length
      });
    } catch (error) {
      console.error("Error fetching style numbers:", error);
      res.status(500).json({ error: "Failed to fetch style numbers" });
    }
  });

  // Calculate metrics for a batch of styles
  app.post("/api/receiving-metrics/calculate-batch", isAuthenticated, async (req, res) => {
    try {
      const user = (req.user as any);
      const calculatedBy = user?.claims?.sub || 'unknown';
      const { styleNumbers } = req.body;
      const mode = req.query.mode as string; // 'multidimensional' or default (receiving-only)

      if (!Array.isArray(styleNumbers) || styleNumbers.length === 0) {
        return res.status(400).json({ error: "styleNumbers must be a non-empty array" });
      }

      // Fetch current settings
      const dbSettings = await storage.getReceivingMetricsSettings();

      // Convert null values to undefined for calculator
      const settings = dbSettings ? {
        // Existing receiving-only settings
        newItemDaysFromCreation: dbSettings.newItemDaysFromCreation ?? undefined,
        newItemMaxReceives: dbSettings.newItemMaxReceives ?? undefined,
        coreItemMinMonths: dbSettings.coreItemMinMonths ?? undefined,
        coreItemMinReceives: dbSettings.coreItemMinReceives ?? undefined,
        coreItemMaxDaysBetween: dbSettings.coreItemMaxDaysBetween ?? undefined,
        coreItemMaxDaysSinceLast: dbSettings.coreItemMaxDaysSinceLast ?? undefined,
        seasonalItemMinYears: dbSettings.seasonalItemMinYears ?? undefined,
        seasonalItemConcentrationPct: dbSettings.seasonalItemConcentrationPct ?? undefined,
        seasonalItemMinDaysBetween: dbSettings.seasonalItemMinDaysBetween ?? undefined,
        seasonalOverridesDiscontinued: dbSettings.seasonalOverridesDiscontinued ?? undefined,
        seasonalDiscontinuedThreshold: dbSettings.seasonalDiscontinuedThreshold ?? undefined,
        oneTimeBuyMaxReceives: dbSettings.oneTimeBuyMaxReceives ?? undefined,
        oneTimeBuyMinDaysSinceLast: dbSettings.oneTimeBuyMinDaysSinceLast ?? undefined,
        discontinuedMinDaysSinceLast: dbSettings.discontinuedMinDaysSinceLast ?? undefined,
        // Multi-dimensional settings (Phase 2)
        newItemMustHaveSold: dbSettings.newItemMustHaveSold ?? undefined,
        coreItemMinSalesMonths: dbSettings.coreItemMinSalesMonths ?? undefined,
        coreItemMaxDaysSinceLastSold: dbSettings.coreItemMaxDaysSinceLastSold ?? undefined,
        coreItemMaxDaysSinceLastReceived: dbSettings.coreItemMaxDaysSinceLastReceived ?? undefined,
        coreItemMinInventoryOrRecentSales: dbSettings.coreItemMinInventoryOrRecentSales ?? undefined,
        seasonalItemSalesConcentrationPct: dbSettings.seasonalItemSalesConcentrationPct ?? undefined,
        seasonalItemMaxDaysSinceActivity: dbSettings.seasonalItemMaxDaysSinceActivity ?? undefined,
        discontinuedMinDaysSinceSold: dbSettings.discontinuedMinDaysSinceSold ?? undefined,
        discontinuedMinDaysSinceReceived: dbSettings.discontinuedMinDaysSinceReceived ?? undefined,
        discontinuedRequiresZeroInventory: dbSettings.discontinuedRequiresZeroInventory ?? undefined,
        clearanceMinInventory: dbSettings.clearanceMinInventory ?? undefined,
        clearanceMaxRecentSales: dbSettings.clearanceMaxRecentSales ?? undefined,
        clearanceMinDaysSinceReceived: dbSettings.clearanceMinDaysSinceReceived ?? undefined,
        clearanceMinDaysOfSupply: dbSettings.clearanceMinDaysOfSupply ?? undefined,
        oneTimeBuyMinDaysSinceFirst: dbSettings.oneTimeBuyMinDaysSinceFirst ?? undefined,
        oneTimeBuyMaxDaysSinceSold: dbSettings.oneTimeBuyMaxDaysSinceSold ?? undefined,
      } : undefined;

      let result: any;

      // Use multi-dimensional calculator if mode=multidimensional
      if (mode === 'multidimensional') {
        console.log('Using MULTI-DIMENSIONAL calculator for', styleNumbers.length, 'styles');
        try {
          result = await storage.calculateMetricsMultidimensional(styleNumbers, calculatedBy, settings);
        } catch (err) {
          console.error('Multi-dimensional calculation failed:', err);
          return res.status(500).json({ error: "Multi-dimensional calculation failed" });
        }
      } else {
        // Use original receiving-only calculator (backward compatible)
        console.log('Using RECEIVING-ONLY calculator for', styleNumbers.length, 'styles');
        const metrics: any[] = [];
        const failed: any[] = [];
        let noReceivingHistoryCount = 0;
        let errorCount = 0;

        for (const styleNumber of styleNumbers) {
          try {
            const metric = await calculateMetricsForStyle(styleNumber, calculatedBy, settings);
            if (metric) {
              metrics.push(metric);
            } else {
              noReceivingHistoryCount++;
              failed.push({
                styleNumber,
                reason: 'No receiving history found for this style',
                category: 'NO_RECEIVING_HISTORY'
              });
            }
          } catch (err) {
            errorCount++;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            failed.push({
              styleNumber,
              reason: errorMessage,
              category: 'SQL_ERROR',
              error: errorMessage
            });
            console.error(`Failed to calculate metrics for style ${styleNumber}:`, err);
          }
        }

        result = {
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

      // Save batch to database
      if (result.metrics.length > 0) {
        await storage.batchUpsertReceivingMetrics(result.metrics);
      }

      res.json({
        success: true,
        processed: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
        noReceivingHistory: result.summary.noReceivingHistory,
        errors: result.summary.errors,
        failedItems: result.failed,
        message: `Processed ${result.summary.total} styles: ${result.summary.successful} successful, ${result.summary.failed} failed (${result.summary.noReceivingHistory} no history, ${result.summary.errors} errors)`
      });
    } catch (error) {
      console.error("Error calculating batch metrics:", error);
      res.status(500).json({ error: "Failed to calculate batch metrics" });
    }
  });

  // Legacy: Calculate all metrics at once (keeping for backwards compatibility, but not recommended for large datasets)
  app.post("/api/receiving-metrics/calculate", isAuthenticated, async (req, res) => {
    try {
      const user = (req.user as any);
      const calculatedBy = user?.claims?.sub || 'unknown';

      const startTime = Date.now();
      const result = await calculateAllMetrics(calculatedBy);

      // Save to database
      await storage.batchUpsertReceivingMetrics(result.metrics);

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        total: result.total,
        duration,
        message: `Successfully calculated metrics for ${result.total} styles`
      });
    } catch (error) {
      console.error("Error calculating metrics:", error);
      res.status(500).json({ error: "Failed to calculate metrics" });
    }
  });

  app.post("/api/receiving-metrics/calculate/:styleNumber", isAuthenticated, async (req, res) => {
    try {
      const { styleNumber } = req.params;
      const user = (req.user as any);
      const calculatedBy = user?.claims?.sub || 'unknown';

      // Fetch current settings
      const dbSettings = await storage.getReceivingMetricsSettings();

      // Convert null values to undefined for calculator
      const settings = dbSettings ? {
        newItemDaysFromCreation: dbSettings.newItemDaysFromCreation ?? undefined,
        newItemMaxReceives: dbSettings.newItemMaxReceives ?? undefined,
        coreItemMinMonths: dbSettings.coreItemMinMonths ?? undefined,
        coreItemMinReceives: dbSettings.coreItemMinReceives ?? undefined,
        coreItemMaxDaysBetween: dbSettings.coreItemMaxDaysBetween ?? undefined,
        coreItemMaxDaysSinceLast: dbSettings.coreItemMaxDaysSinceLast ?? undefined,
        seasonalItemMinYears: dbSettings.seasonalItemMinYears ?? undefined,
        seasonalItemConcentrationPct: dbSettings.seasonalItemConcentrationPct ?? undefined,
        seasonalItemMinDaysBetween: dbSettings.seasonalItemMinDaysBetween ?? undefined,
        seasonalOverridesDiscontinued: dbSettings.seasonalOverridesDiscontinued ?? undefined,
        seasonalDiscontinuedThreshold: dbSettings.seasonalDiscontinuedThreshold ?? undefined,
        oneTimeBuyMaxReceives: dbSettings.oneTimeBuyMaxReceives ?? undefined,
        oneTimeBuyMinDaysSinceLast: dbSettings.oneTimeBuyMinDaysSinceLast ?? undefined,
        discontinuedMinDaysSinceLast: dbSettings.discontinuedMinDaysSinceLast ?? undefined,
      } : undefined;

      const metrics = await calculateMetricsForStyle(styleNumber, calculatedBy, settings);

      if (!metrics) {
        return res.status(404).json({ error: "No receiving history found for this style" });
      }

      const result = await storage.upsertReceivingMetrics(metrics);
      res.json(result);
    } catch (error) {
      console.error("Error calculating metrics:", error);
      res.status(500).json({ error: "Failed to calculate metrics" });
    }
  });

  app.get("/api/receiving-metrics", isAuthenticated, async (req, res) => {
    try {
      const lifecycle = req.query.lifecycle as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await storage.getAllReceivingMetrics({ lifecycle, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.get("/api/receiving-metrics/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getReceivingMetricsStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  // Otherwise /export and /settings get matched as :styleNumber
  app.get("/api/receiving-metrics/export", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getReceivingMetricsStats();
      const allMetrics = await storage.getAllReceivingMetrics({ limit: 100000, offset: 0 });

      // Get all unique style numbers from item_list
      const allStylesResult = await db.execute(sql`
        SELECT DISTINCT style_number
        FROM item_list
        WHERE style_number IS NOT NULL
        ORDER BY style_number
      `);
      const allStyleNumbers = allStylesResult.rows.map((r: any) => r.style_number);

      // Get style numbers that have metrics
      const metricsStyleNumbers = new Set(allMetrics.metrics.map((m: any) => m.styleNumber));

      // Find styles without metrics (failed/skipped)
      const failedStyles = allStyleNumbers
        .filter(styleNumber => !metricsStyleNumbers.has(styleNumber))
        .map(styleNumber => ({
          styleNumber,
          reason: 'No receiving history or calculation failed',
          category: 'NO_METRICS'
        }));

      // Get inventory by style number (aggregate all items for each style)
      const inventoryResult = await db.execute(sql`
        SELECT
          style_number,
          SUM(COALESCE(hq_qty, 0)) as hq_total,
          SUM(COALESCE(gm_qty, 0)) as gm_total,
          SUM(COALESCE(hm_qty, 0)) as hm_total,
          SUM(COALESCE(lm_qty, 0)) as lm_total,
          SUM(COALESCE(nm_qty, 0)) as nm_total,
          SUM(COALESCE(avail_qty, 0)) as total_qty
        FROM item_list
        WHERE style_number IS NOT NULL
        GROUP BY style_number
      `);

      // Create a map for quick lookup
      const inventoryMap = new Map();
      inventoryResult.rows.forEach((row: any) => {
        inventoryMap.set(row.style_number, {
          hq: parseInt(row.hq_total) || 0,
          gm: parseInt(row.gm_total) || 0,
          hm: parseInt(row.hm_total) || 0,
          lm: parseInt(row.lm_total) || 0,
          nm: parseInt(row.nm_total) || 0,
          total: parseInt(row.total_qty) || 0
        });
      });

      res.json({
        stats,
        metrics: allMetrics.metrics,
        failedItems: failedStyles,
        inventory: inventoryMap
      });
    } catch (error) {
      console.error("Error exporting metrics:", error);
      res.status(500).json({ error: "Failed to export metrics" });
    }
  });

  // Dashboard data endpoint
  app.get("/api/receiving-metrics/dashboard", isAuthenticated, async (req, res) => {
    try {
      // Parse filter parameters from query string
      const {
        search = '',
        stores = 'all',
        lifecycle = 'all',
        dateFrom,
        dateTo,
        limit = '100'
      } = req.query;

      const storeList = stores === 'all' ? [] : (stores as string).split(',');
      const searchTerm = (search as string).toLowerCase();
      const itemLimit = Math.min(parseInt(limit as string) || 100, 500); // Cap at 500

      console.log('[Dashboard] Query params:', { search, stores, lifecycle, limit: itemLimit });

      const stats = await storage.getReceivingMetricsStats();
      const allMetrics = await storage.getAllReceivingMetrics({ limit: 10000, offset: 0 });

      // Get inventory totals by location
      const inventoryByLocation = await db.execute(sql`
        SELECT
          SUM(COALESCE(hq_qty, 0)) as hq_total,
          SUM(COALESCE(gm_qty, 0)) as gm_total,
          SUM(COALESCE(hm_qty, 0)) as hm_total,
          SUM(COALESCE(lm_qty, 0)) as lm_total,
          SUM(COALESCE(nm_qty, 0)) as nm_total,
          SUM(COALESCE(mm_qty, 0)) as mm_total,
          SUM(COALESCE(pm_qty, 0)) as pm_total,
          SUM(COALESCE(avail_qty, 0)) as total_qty
        FROM item_list
      `);

      // Get total sales count
      const totalSales = await db.execute(sql`
        SELECT COUNT(*) as total_transactions
        FROM sales_transactions
      `);

      // Get sales by month (last 12 months)
      const salesByMonth = await db.execute(sql`
        SELECT
          TO_CHAR(date, 'Mon') as month,
          TO_CHAR(date, 'YYYY-MM') as month_key,
          COUNT(*) as transactions,
          SUM(CAST(price AS DECIMAL)) as revenue
        FROM sales_transactions
        WHERE date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(date, 'Mon'), TO_CHAR(date, 'YYYY-MM'), EXTRACT(MONTH FROM date)
        ORDER BY TO_CHAR(date, 'YYYY-MM')
      `);

      // Top products by sales with filtering
      const topProducts = await db.execute(
        searchTerm
          ? sql`
              SELECT
                s.sku,
                i.item_name,
                COUNT(*) as units_sold,
                SUM(CAST(s.price AS DECIMAL)) as revenue,
                SUM(COALESCE(i.avail_qty, 0)) as current_stock,
                SUM(COALESCE(i.hq_qty, 0)) as hq_inventory,
                SUM(COALESCE(i.gm_qty, 0)) as gm_inventory,
                SUM(COALESCE(i.hm_qty, 0)) as hm_inventory,
                SUM(COALESCE(i.lm_qty, 0)) as lm_inventory,
                SUM(COALESCE(i.nm_qty, 0)) as nm_inventory,
                SUM(COALESCE(i.mm_qty, 0)) as mm_inventory,
                SUM(COALESCE(i.pm_qty, 0)) as pm_inventory
              FROM sales_transactions s
              LEFT JOIN item_list i ON s.sku = i.item_number
              WHERE s.date >= CURRENT_DATE - INTERVAL '90 days'
                AND (LOWER(s.sku) LIKE ${`%${searchTerm}%`} OR LOWER(i.item_name) LIKE ${`%${searchTerm}%`})
              GROUP BY s.sku, i.item_name
              ORDER BY revenue DESC
              LIMIT ${itemLimit}
            `
          : sql`
              SELECT
                s.sku,
                i.item_name,
                COUNT(*) as units_sold,
                SUM(CAST(s.price AS DECIMAL)) as revenue,
                SUM(COALESCE(i.avail_qty, 0)) as current_stock,
                SUM(COALESCE(i.hq_qty, 0)) as hq_inventory,
                SUM(COALESCE(i.gm_qty, 0)) as gm_inventory,
                SUM(COALESCE(i.hm_qty, 0)) as hm_inventory,
                SUM(COALESCE(i.lm_qty, 0)) as lm_inventory,
                SUM(COALESCE(i.nm_qty, 0)) as nm_inventory,
                SUM(COALESCE(i.mm_qty, 0)) as mm_inventory,
                SUM(COALESCE(i.pm_qty, 0)) as pm_inventory
              FROM sales_transactions s
              LEFT JOIN item_list i ON s.sku = i.item_number
              WHERE s.date >= CURRENT_DATE - INTERVAL '90 days'
              GROUP BY s.sku, i.item_name
              ORDER BY revenue DESC
              LIMIT ${itemLimit}
            `
      );

      // Clearance priority items (from metrics) - enrich with inventory data
      let clearanceMetrics = allMetrics.metrics
        .filter((m: any) => m.lifecycleStage === 'Clearance');

      // Apply search filter
      if (searchTerm) {
        clearanceMetrics = clearanceMetrics.filter((m: any) =>
          m.styleNumber.toLowerCase().includes(searchTerm)
        );
      }

      clearanceMetrics = clearanceMetrics
        .sort((a: any, b: any) => {
          const aDays = a.daysOfSupply ? parseFloat(a.daysOfSupply) : 0;
          const bDays = b.daysOfSupply ? parseFloat(b.daysOfSupply) : 0;
          return bDays - aDays;
        })
        .slice(0, Math.min(itemLimit, 100));

      // Enrich clearance items with store-level inventory
      const clearanceItems = await Promise.all(
        clearanceMetrics.map(async (metric: any) => {
          const inventoryData = await db.execute(sql`
            SELECT
              SUM(COALESCE(hq_qty, 0)) as hq_inventory,
              SUM(COALESCE(gm_qty, 0)) as gm_inventory,
              SUM(COALESCE(hm_qty, 0)) as hm_inventory,
              SUM(COALESCE(lm_qty, 0)) as lm_inventory,
              SUM(COALESCE(nm_qty, 0)) as nm_inventory,
              SUM(COALESCE(mm_qty, 0)) as mm_inventory,
              SUM(COALESCE(pm_qty, 0)) as pm_inventory
            FROM item_list
            WHERE style_number = ${metric.styleNumber}
          `);
          return {
            ...metric,
            hqInventory: parseInt(inventoryData.rows[0]?.hq_inventory || '0'),
            gmInventory: parseInt(inventoryData.rows[0]?.gm_inventory || '0'),
            hmInventory: parseInt(inventoryData.rows[0]?.hm_inventory || '0'),
            lmInventory: parseInt(inventoryData.rows[0]?.lm_inventory || '0'),
            nmInventory: parseInt(inventoryData.rows[0]?.nm_inventory || '0'),
            mmInventory: parseInt(inventoryData.rows[0]?.mm_inventory || '0'),
            pmInventory: parseInt(inventoryData.rows[0]?.pm_inventory || '0')
          };
        })
      );

      // Inventory health items (styles with inventory) with filtering
      const inventoryHealth = await db.execute(
        searchTerm && lifecycle !== 'all'
          ? sql`
              SELECT
                i.style_number,
                SUM(COALESCE(i.avail_qty, 0)) as total_inventory,
                SUM(COALESCE(i.hq_qty, 0)) as hq_inventory,
                SUM(COALESCE(i.gm_qty, 0)) as gm_inventory,
                SUM(COALESCE(i.hm_qty, 0)) as hm_inventory,
                SUM(COALESCE(i.lm_qty, 0)) as lm_inventory,
                SUM(COALESCE(i.nm_qty, 0)) as nm_inventory,
                SUM(COALESCE(i.mm_qty, 0)) as mm_inventory,
                SUM(COALESCE(i.pm_qty, 0)) as pm_inventory,
                m.days_since_last_receive,
                m.sales_last_90days,
                m.lifecycle_stage,
                m.days_of_supply
              FROM item_list i
              LEFT JOIN item_receiving_metrics m ON i.style_number = m.style_number
              WHERE i.style_number IS NOT NULL
                AND COALESCE(i.avail_qty, 0) > 0
                AND LOWER(i.style_number) LIKE ${`%${searchTerm}%`}
                AND m.lifecycle_stage = ${lifecycle}
              GROUP BY i.style_number, m.days_since_last_receive, m.sales_last_90days, m.lifecycle_stage, m.days_of_supply
              ORDER BY total_inventory DESC
              LIMIT ${itemLimit}
            `
          : searchTerm
          ? sql`
              SELECT
                i.style_number,
                SUM(COALESCE(i.avail_qty, 0)) as total_inventory,
                SUM(COALESCE(i.hq_qty, 0)) as hq_inventory,
                SUM(COALESCE(i.gm_qty, 0)) as gm_inventory,
                SUM(COALESCE(i.hm_qty, 0)) as hm_inventory,
                SUM(COALESCE(i.lm_qty, 0)) as lm_inventory,
                SUM(COALESCE(i.nm_qty, 0)) as nm_inventory,
                SUM(COALESCE(i.mm_qty, 0)) as mm_inventory,
                SUM(COALESCE(i.pm_qty, 0)) as pm_inventory,
                m.days_since_last_receive,
                m.sales_last_90days,
                m.lifecycle_stage,
                m.days_of_supply
              FROM item_list i
              LEFT JOIN item_receiving_metrics m ON i.style_number = m.style_number
              WHERE i.style_number IS NOT NULL
                AND COALESCE(i.avail_qty, 0) > 0
                AND LOWER(i.style_number) LIKE ${`%${searchTerm}%`}
              GROUP BY i.style_number, m.days_since_last_receive, m.sales_last_90days, m.lifecycle_stage, m.days_of_supply
              ORDER BY total_inventory DESC
              LIMIT ${itemLimit}
            `
          : lifecycle !== 'all'
          ? sql`
              SELECT
                i.style_number,
                SUM(COALESCE(i.avail_qty, 0)) as total_inventory,
                SUM(COALESCE(i.hq_qty, 0)) as hq_inventory,
                SUM(COALESCE(i.gm_qty, 0)) as gm_inventory,
                SUM(COALESCE(i.hm_qty, 0)) as hm_inventory,
                SUM(COALESCE(i.lm_qty, 0)) as lm_inventory,
                SUM(COALESCE(i.nm_qty, 0)) as nm_inventory,
                SUM(COALESCE(i.mm_qty, 0)) as mm_inventory,
                SUM(COALESCE(i.pm_qty, 0)) as pm_inventory,
                m.days_since_last_receive,
                m.sales_last_90days,
                m.lifecycle_stage,
                m.days_of_supply
              FROM item_list i
              LEFT JOIN item_receiving_metrics m ON i.style_number = m.style_number
              WHERE i.style_number IS NOT NULL
                AND COALESCE(i.avail_qty, 0) > 0
                AND m.lifecycle_stage = ${lifecycle}
              GROUP BY i.style_number, m.days_since_last_receive, m.sales_last_90days, m.lifecycle_stage, m.days_of_supply
              ORDER BY total_inventory DESC
              LIMIT ${itemLimit}
            `
          : sql`
              SELECT
                i.style_number,
                SUM(COALESCE(i.avail_qty, 0)) as total_inventory,
                SUM(COALESCE(i.hq_qty, 0)) as hq_inventory,
                SUM(COALESCE(i.gm_qty, 0)) as gm_inventory,
                SUM(COALESCE(i.hm_qty, 0)) as hm_inventory,
                SUM(COALESCE(i.lm_qty, 0)) as lm_inventory,
                SUM(COALESCE(i.nm_qty, 0)) as nm_inventory,
                SUM(COALESCE(i.mm_qty, 0)) as mm_inventory,
                SUM(COALESCE(i.pm_qty, 0)) as pm_inventory,
                m.days_since_last_receive,
                m.sales_last_90days,
                m.lifecycle_stage,
                m.days_of_supply
              FROM item_list i
              LEFT JOIN item_receiving_metrics m ON i.style_number = m.style_number
              WHERE i.style_number IS NOT NULL AND COALESCE(i.avail_qty, 0) > 0
              GROUP BY i.style_number, m.days_since_last_receive, m.sales_last_90days, m.lifecycle_stage, m.days_of_supply
              ORDER BY total_inventory DESC
              LIMIT ${itemLimit}
            `
      );

      res.json({
        stats,
        inventoryByLocation: inventoryByLocation.rows[0],
        totalTransactions: parseInt(totalSales.rows[0]?.total_transactions || '0'),
        salesByMonth: salesByMonth.rows,
        topProducts: topProducts.rows,
        clearanceItems,
        inventoryHealth: inventoryHealth.rows,
        lifecycleDistribution: stats?.byLifecycle || {}
      });
    } catch (error) {
      console.error("[Dashboard] Error fetching dashboard data:", error);
      console.error("[Dashboard] Error stack:", (error as Error).stack);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        message: (error as Error).message
      });
    }
  });

  // Receiving Metrics Settings endpoints (must be before :styleNumber)
  app.get("/api/receiving-metrics/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getReceivingMetricsSettings();
      if (!settings) {
        // Return default settings if none exist (with all multi-dimensional fields)
        return res.json({
          newItemDaysFromCreation: 30,
          newItemMaxReceives: 2,
          coreItemMinMonths: 3,
          coreItemMinReceives: 5,
          coreItemMaxDaysBetween: 60,
          coreItemMaxDaysSinceLast: 90,
          coreItemMinSalesMonths: 6,
          coreItemMaxDaysSinceLastSold: 90,
          coreItemMinInventoryOrRecentSales: true,
          seasonalItemMinYears: 2,
          seasonalItemConcentrationPct: 60,
          seasonalItemMinDaysBetween: 300,
          seasonalOverridesDiscontinued: true,
          seasonalDiscontinuedThreshold: 365,
          seasonalItemSalesConcentrationPct: 15,
          seasonalItemMaxDaysSinceActivity: 365,
          oneTimeBuyMaxReceives: 2,
          oneTimeBuyMinDaysSinceLast: 90,
          oneTimeBuyMinDaysSinceFirst: 90,
          oneTimeBuyMaxDaysSinceSold: 90,
          discontinuedMinDaysSinceLast: 180,
          discontinuedMinDaysSinceSold: 180,
          discontinuedMinDaysSinceReceived: 180,
          discontinuedRequiresZeroInventory: true,
          clearanceMinInventory: 10,
          clearanceMaxRecentSales: 3,
          clearanceMinDaysSinceReceived: 180,
          clearanceMinDaysOfSupply: 180,
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/receiving-metrics/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = req.body;
      const user = (req.user as any);
      const createdBy = user?.claims?.sub || 'unknown';

      const savedSettings = await storage.upsertReceivingMetricsSettings({
        ...settings,
        createdBy,
      });

      res.json(savedSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.get("/api/receiving-metrics/:styleNumber", isAuthenticated, async (req, res) => {
    try {
      const { styleNumber } = req.params;
      const metrics = await storage.getReceivingMetrics(styleNumber);

      if (!metrics) {
        return res.status(404).json({ error: "Metrics not found for this style" });
      }

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.delete("/api/receiving-metrics", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteAllReceivingMetrics();
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error deleting metrics:", error);
      res.status(500).json({ error: "Failed to delete metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
