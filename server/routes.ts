import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertItemListSchema, insertSalesTransactionSchema, insertUploadHistorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // Get dashboard statistics
  app.get("/api/stats/item-list", async (req, res) => {
    try {
      const stats = await storage.getItemListStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching item list stats:", error);
      res.status(500).json({ error: "Failed to fetch item list statistics" });
    }
  });

  app.get("/api/stats/sales", async (req, res) => {
    try {
      const stats = await storage.getSalesStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sales stats:", error);
      res.status(500).json({ error: "Failed to fetch sales statistics" });
    }
  });

  // Upload item list data
  app.post("/api/upload/item-list", async (req, res) => {
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
            itemNumber: item.item_number || item.itemNumber,
            vendorName: item.vendor_name || item.vendorName,
            itemName: item.item_name || item.itemName,
            category: item.category,
            gender: item.gender,
            availQty: parseInt(item.avail_qty || item.availQty || "0"),
            hqQty: parseInt(item.hq_qty || item.hqQty || "0"),
            gmQty: parseInt(item.gm_qty || item.gmQty || "0"),
            hmQty: parseInt(item.hm_qty || item.hmQty || "0"),
            mmQty: parseInt(item.mm_qty || item.mmQty || "0"),
            nmQty: parseInt(item.nm_qty || item.nmQty || "0"),
            pmQty: parseInt(item.pm_qty || item.pmQty || "0"),
            lmQty: parseInt(item.lm_qty || item.lmQty || "0"),
            lastRcvd: item.last_rcvd || item.lastRcvd || null,
            creationDate: item.creation_date || item.creationDate || null,
            lastSold: item.last_sold || item.lastSold || null,
            styleNumber: item.style_number || item.styleNumber,
            styleNumber2: item.style_number_2 || item.styleNumber2,
            orderCost: item.order_cost || item.orderCost || null,
            sellingPrice: item.selling_price || item.sellingPrice || null,
            notes: item.notes,
            size: item.size,
            attribute: item.attribute,
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
  app.post("/api/upload/sales-transactions", async (req, res) => {
    try {
      const { data, fileName } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      let uploaded = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let index = 0; index < data.length; index++) {
        const transaction = data[index];
        try {
          // Validate the transaction data
          const validatedTransaction = insertSalesTransactionSchema.parse({
            date: transaction.Date || transaction.date,
            store: transaction.Store || transaction.store,
            receiptNumber: transaction["Receipt #"] || transaction.receiptNumber,
            sku: transaction.SKU || transaction.sku,
            itemName: transaction["Item Name"] || transaction.itemName,
            transactionStoreType: transaction["Transaction Store Type"] || transaction.transactionStoreType,
            price: parseFloat(transaction.Price || transaction.price || "0"),
            sheet: transaction.Sheet || transaction.sheet,
          });

          await storage.createSalesTransaction(validatedTransaction);
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
        uploadType: "sales_transactions",
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

  // Get recent upload history
  app.get("/api/upload-history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await storage.getRecentUploads(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
