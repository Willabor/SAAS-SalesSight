import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertItemListSchema, insertSalesTransactionSchema, insertUploadHistorySchema, insertReceivingVoucherSchema, insertReceivingLineSchema, type InsertSalesTransaction } from "@shared/schema";
import { z } from "zod";

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
      
      // Parse and validate year/month as numbers
      let year: number | undefined;
      let month: number | undefined;
      
      if (req.query.year) {
        const parsedYear = parseInt(String(req.query.year));
        if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100) {
          year = parsedYear;
        }
      }
      
      if (req.query.month) {
        const parsedMonth = parseInt(String(req.query.month));
        if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
          month = parsedMonth;
        }
      }
      
      const result = await storage.getAllSalesTransactions(limit, offset, search, year, month);
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
      const voucherNumber = req.query.voucherNumber ? String(req.query.voucherNumber) : undefined;
      const exactMatch = req.query.exactMatch === 'true';
      
      const result = await storage.getReceivingVouchers({
        limit,
        offset,
        search,
        store,
        voucherNumber,
        exactMatch,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching receiving vouchers:", error);
      res.status(500).json({ error: "Failed to fetch receiving vouchers" });
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

          // Create composite key for duplicate detection
          const compositeKey = `${validatedVoucher.voucherNumber}|${validatedVoucher.store}|${validatedVoucher.date}`;
          
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

      // Step 2: Check for existing vouchers
      const vouchersToCheck = validatedVouchers.map(v => ({
        voucherNumber: v.voucher.voucherNumber!,
        store: v.voucher.store!,
        date: v.voucher.date!,
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

  const httpServer = createServer(app);
  return httpServer;
}
