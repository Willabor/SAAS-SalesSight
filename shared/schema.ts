import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, date, timestamp, boolean, serial, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const itemList = pgTable("item_list", {
  id: serial("id").primaryKey(),
  itemNumber: text("item_number").unique(),
  vendorName: text("vendor_name"),
  itemName: text("item_name"),
  category: text("category"),
  gender: text("gender"),
  availQty: integer("avail_qty").default(0),
  hqQty: integer("hq_qty").default(0),
  gmQty: integer("gm_qty").default(0),
  hmQty: integer("hm_qty").default(0),
  mmQty: integer("mm_qty").default(0),
  nmQty: integer("nm_qty").default(0),
  pmQty: integer("pm_qty").default(0),
  lmQty: integer("lm_qty").default(0),
  lastRcvd: date("last_rcvd"),
  creationDate: date("creation_date"),
  lastSold: date("last_sold"),
  styleNumber: text("style_number"),
  styleNumber2: text("style_number_2"),
  orderCost: numeric("order_cost"),
  sellingPrice: numeric("selling_price"),
  notes: text("notes"),
  size: text("size"),
  attribute: text("attribute"),
  fileName: text("file_name"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const salesTransactions = pgTable("sales_transactions", {
  id: serial("id").primaryKey(),
  date: date("date"),
  store: text("store"),
  receiptNumber: text("receipt_number"),
  sku: text("sku"),
  itemName: text("item_name"),
  transactionStoreType: text("transaction_store_type"),
  price: numeric("price"),
  sheet: text("sheet"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const uploadHistory = pgTable("upload_history", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  uploadType: text("upload_type").notNull(), // 'item_list', 'sales_transactions', or 'receiving_history'
  uploadMode: text("upload_mode"), // 'initial' or 'weekly_update' for item_list
  totalRecords: integer("total_records").default(0),
  successfulRecords: integer("successful_records").default(0),
  failedRecords: integer("failed_records").default(0),
  skippedRecords: integer("skipped_records").default(0), // Duplicate receipt numbers skipped
  errors: text("errors"), // JSON string of error messages
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const receivingVouchers = pgTable("receiving_vouchers", {
  id: serial("id").primaryKey(),
  voucherNumber: text("voucher_number").notNull(),
  date: date("date").notNull(),
  store: text("store").notNull(),
  vendor: text("vendor"),
  type: text("type").notNull(), // 'Receiving' or 'Reversal'
  qbTotal: numeric("qb_total"), // QuickBooks total (potentially buggy)
  correctedTotal: numeric("corrected_total"), // Calculated correct total
  totalQty: integer("total_qty").default(0),
  time: text("time"), // Time of transaction
  fileName: text("file_name"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => ({
  uniqueVoucher: unique().on(table.voucherNumber, table.store, table.date),
}));

export const receivingLines = pgTable("receiving_lines", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id").notNull().references(() => receivingVouchers.id, { onDelete: 'cascade' }),
  itemNumber: text("item_number"),
  itemName: text("item_name"),
  qty: integer("qty").notNull(), // Can be negative for reversals
  cost: numeric("cost").notNull(), // Always positive (absolute value)
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Relations
export const itemListRelations = relations(itemList, ({ many }) => ({
  transactions: many(salesTransactions),
  receivingLines: many(receivingLines),
}));

export const salesTransactionsRelations = relations(salesTransactions, ({ one }) => ({
  item: one(itemList, {
    fields: [salesTransactions.sku],
    references: [itemList.itemNumber],
  }),
}));

export const receivingVouchersRelations = relations(receivingVouchers, ({ many }) => ({
  lines: many(receivingLines),
}));

export const receivingLinesRelations = relations(receivingLines, ({ one }) => ({
  voucher: one(receivingVouchers, {
    fields: [receivingLines.voucherId],
    references: [receivingVouchers.id],
  }),
  item: one(itemList, {
    fields: [receivingLines.itemNumber],
    references: [itemList.itemNumber],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertItemListSchema = createInsertSchema(itemList).omit({
  id: true,
  uploadedAt: true,
});

export const insertSalesTransactionSchema = createInsertSchema(salesTransactions).omit({
  id: true,
  uploadedAt: true,
});

export const insertUploadHistorySchema = createInsertSchema(uploadHistory).omit({
  id: true,
  uploadedAt: true,
});

export const insertReceivingVoucherSchema = createInsertSchema(receivingVouchers).omit({
  id: true,
  uploadedAt: true,
});

export const insertReceivingLineSchema = createInsertSchema(receivingLines).omit({
  id: true,
  uploadedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ItemList = typeof itemList.$inferSelect;
export type InsertItemList = z.infer<typeof insertItemListSchema>;
export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type InsertSalesTransaction = z.infer<typeof insertSalesTransactionSchema>;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = z.infer<typeof insertUploadHistorySchema>;
export type ReceivingVoucher = typeof receivingVouchers.$inferSelect;
export type InsertReceivingVoucher = z.infer<typeof insertReceivingVoucherSchema>;
export type ReceivingLine = typeof receivingLines.$inferSelect;
export type InsertReceivingLine = z.infer<typeof insertReceivingLineSchema>;
