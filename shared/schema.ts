import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, date, timestamp, boolean, serial, unique, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  cost: numeric("cost").notNull(), // ⚠️ LINE TOTAL (qty × unit_price), not unit price! Always stored as positive (absolute value)
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// ML Predictions table
export const mlPredictions = pgTable("ml_predictions", {
  id: serial("id").primaryKey(),
  predictionType: varchar("prediction_type", { length: 50 }).notNull(),
  styleNumber: varchar("style_number", { length: 100 }),
  store: varchar("store", { length: 10 }),
  predictionValue: numeric("prediction_value"),
  confidenceScore: numeric("confidence_score"),
  featuresSnapshot: jsonb("features_snapshot"),
  modelVersion: varchar("model_version", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  validUntil: timestamp("valid_until"),
}, (table) => [
  index("idx_prediction_type").on(table.predictionType),
  index("idx_style_store").on(table.styleNumber, table.store),
  index("idx_valid_until").on(table.validUntil),
]);

// ML Models metadata table
export const mlModels = pgTable("ml_models", {
  id: serial("id").primaryKey(),
  modelType: varchar("model_type", { length: 50 }).notNull(),
  modelVersion: varchar("model_version", { length: 20 }).notNull(),
  trainingDate: timestamp("training_date").notNull(),
  trainingSamples: integer("training_samples"),
  accuracyScore: numeric("accuracy_score"),
  precisionScore: numeric("precision_score"),
  recallScore: numeric("recall_score"),
  rocAucScore: numeric("roc_auc_score"),
  modelParams: jsonb("model_params"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.modelType, table.modelVersion),
]);

// ML Feedback table (for future enhancement)
export const mlFeedback = pgTable("ml_feedback", {
  id: serial("id").primaryKey(),
  predictionId: integer("prediction_id").references(() => mlPredictions.id),
  actualOutcome: numeric("actual_outcome"),
  predictionAccuracy: numeric("prediction_accuracy"),
  userFeedback: text("user_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ML Settings Change Log
export const mlSettingsLog = pgTable("ml_settings_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  modelVersion: varchar("model_version"),
  settingsSnapshot: jsonb("settings_snapshot").notNull(), // Complete settings object
  changedFields: jsonb("changed_fields"), // Array of field names that changed
  trainingDays: integer("training_days"),
  newArrivalsDays: integer("new_arrivals_days"),
  bestSellerThreshold: integer("best_seller_threshold"),
  coreHighThreshold: integer("core_high_threshold"),
  coreMediumThreshold: integer("core_medium_threshold"),
  coreLowThreshold: integer("core_low_threshold"),
  clearanceDays: integer("clearance_days"),
  filtersEnabled: boolean("filters_enabled").default(false),
  receivingHistoryEnabled: boolean("receiving_history_enabled").default(false),
  featureSelectionEnabled: boolean("feature_selection_enabled").default(false),
  testAccuracy: numeric("test_accuracy"),
  trainingStatus: varchar("training_status"), // 'success', 'failed', 'in_progress'
  errorMessage: text("error_message"),
  trainingDurationMs: integer("training_duration_ms"),
  createdAt: timestamp("created_at").defaultNow(),
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
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
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

export const insertMlPredictionSchema = createInsertSchema(mlPredictions).omit({
  id: true,
  createdAt: true,
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
});

export const insertMlSettingsLogSchema = createInsertSchema(mlSettingsLog).omit({
  id: true,
  createdAt: true,
});

export const insertMlFeedbackSchema = createInsertSchema(mlFeedback).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ItemList = typeof itemList.$inferSelect;
export type InsertItemList = z.infer<typeof insertItemListSchema>;
export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type InsertSalesTransaction = z.infer<typeof insertSalesTransactionSchema>;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = z.infer<typeof insertUploadHistorySchema>;
// Item Receiving Metrics - Pre-computed receiving pattern analysis
export const itemReceivingMetrics = pgTable("item_receiving_metrics", {
  id: serial("id").primaryKey(),
  styleNumber: text("style_number").notNull().unique(),
  itemNumber: text("item_number"), // Primary item_number for this style

  // Receiving dates
  firstReceiveDate: date("first_receive_date"),
  lastReceiveDate: date("last_receive_date"),
  creationDate: date("creation_date"), // From item_list

  // Receiving counts
  totalReceiveCount: integer("total_receive_count").default(0),
  uniqueReceiveMonths: integer("unique_receive_months").default(0), // Count of distinct months with receives
  uniqueReceiveYears: integer("unique_receive_years").default(0), // Count of distinct years with receives

  // Patterns
  avgDaysBetweenReceives: numeric("avg_days_between_receives"), // Average frequency
  daysSinceFirstReceive: integer("days_since_first_receive"),
  daysSinceLastReceive: integer("days_since_last_receive"),

  // Classifications
  isNewItem: boolean("is_new_item").default(false), // last_rcvd within 7 days of creation_date
  isRestockedItem: boolean("is_restocked_item").default(false), // Multiple receives over time
  isSeasonalItem: boolean("is_seasonal_item").default(false), // Yearly pattern detected
  isOneTimeBuy: boolean("is_one_time_buy").default(false), // No receives for 3+ months
  isCoreItem: boolean("is_core_item").default(false), // Regular restocking pattern

  // Lifecycle stage
  lifecycleStage: text("lifecycle_stage"), // New/Core/Seasonal/Clearance/Discontinued/One-Time

  // Multi-dimensional metrics (Phase 2)
  totalSalesCount: integer("total_sales_count").default(0),
  salesMonthsLastYear: integer("sales_months_last_year").default(0),
  salesLast90days: integer("sales_last_90days").default(0),
  daysOfSupply: numeric("days_of_supply"),
  hasSeasonalSalesPattern: boolean("has_seasonal_sales_pattern").default(false),

  // Metadata
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  calculatedBy: text("calculated_by"), // user_id or 'system'
});

// Receiving Metrics Settings - Business logic configuration
export const receivingMetricsSettings = pgTable("receiving_metrics_settings", {
  id: serial("id").primaryKey(),

  // New Item Rules
  newItemDaysFromCreation: integer("new_item_days_from_creation").default(30), // Changed from 7 to 30
  newItemMaxReceives: integer("new_item_max_receives").default(2),
  newItemMustHaveSold: boolean("new_item_must_have_sold").default(false), // Phase 2

  // Core Item Rules
  coreItemMinMonths: integer("core_item_min_months").default(3),
  coreItemMinReceives: integer("core_item_min_receives").default(5),
  coreItemMaxDaysBetween: integer("core_item_max_days_between").default(60),
  coreItemMaxDaysSinceLast: integer("core_item_max_days_since_last").default(90), // Phase 1: Prevent zombie Core items
  coreItemMinSalesMonths: integer("core_item_min_sales_months").default(6), // Phase 2
  coreItemMaxDaysSinceLastSold: integer("core_item_max_days_since_last_sold").default(90), // Phase 2
  coreItemMaxDaysSinceLastReceived: integer("core_item_max_days_since_last_received").default(90), // Phase 2
  coreItemMinInventoryOrRecentSales: boolean("core_item_min_inventory_or_recent_sales").default(true), // Phase 2

  // Seasonal Item Rules
  seasonalItemMinYears: integer("seasonal_item_min_years").default(2),
  seasonalItemConcentrationPct: integer("seasonal_item_concentration_pct").default(60), // percentage
  seasonalItemMinDaysBetween: integer("seasonal_item_min_days_between").default(300),
  seasonalOverridesDiscontinued: boolean("seasonal_overrides_discontinued").default(true), // Phase 1: Seasonal override
  seasonalDiscontinuedThreshold: integer("seasonal_discontinued_threshold").default(365), // Phase 1: Days before seasonal = discontinued
  seasonalItemSalesConcentrationPct: integer("seasonal_item_sales_concentration_pct").default(15), // Phase 2
  seasonalItemMaxDaysSinceActivity: integer("seasonal_item_max_days_since_activity").default(365), // Phase 2

  // One-Time Buy Rules
  oneTimeBuyMaxReceives: integer("one_time_buy_max_receives").default(2),
  oneTimeBuyMinDaysSinceLast: integer("one_time_buy_min_days_since_last").default(90),
  oneTimeBuyMinDaysSinceFirst: integer("one_time_buy_min_days_since_first").default(90), // Phase 2
  oneTimeBuyMaxDaysSinceSold: integer("one_time_buy_max_days_since_sold").default(90), // Phase 2

  // Discontinued Rules
  discontinuedMinDaysSinceLast: integer("discontinued_min_days_since_last").default(180),
  discontinuedMinDaysSinceSold: integer("discontinued_min_days_since_sold").default(180), // Phase 2
  discontinuedMinDaysSinceReceived: integer("discontinued_min_days_since_received").default(180), // Phase 2
  discontinuedRequiresZeroInventory: boolean("discontinued_requires_zero_inventory").default(true), // Phase 2

  // Clearance Rules (Phase 2 - NEW CATEGORY)
  clearanceMinInventory: integer("clearance_min_inventory").default(10),
  clearanceMaxRecentSales: integer("clearance_max_recent_sales").default(3),
  clearanceMinDaysSinceReceived: integer("clearance_min_days_since_received").default(180),
  clearanceMinDaysOfSupply: integer("clearance_min_days_of_supply").default(180),

  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by"),
});

export const insertItemReceivingMetricsSchema = createInsertSchema(itemReceivingMetrics);
export const insertReceivingMetricsSettingsSchema = createInsertSchema(receivingMetricsSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ReceivingVoucher = typeof receivingVouchers.$inferSelect;
export type InsertReceivingVoucher = z.infer<typeof insertReceivingVoucherSchema>;
export type ReceivingLine = typeof receivingLines.$inferSelect;
export type InsertReceivingLine = z.infer<typeof insertReceivingLineSchema>;
export type MlPrediction = typeof mlPredictions.$inferSelect;
export type InsertMlPrediction = z.infer<typeof insertMlPredictionSchema>;
export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
export type MlFeedback = typeof mlFeedback.$inferSelect;
export type InsertMlFeedback = z.infer<typeof insertMlFeedbackSchema>;
export type MLSettingsLog = typeof mlSettingsLog.$inferSelect;
export type InsertMLSettingsLog = z.infer<typeof insertMlSettingsLogSchema>;
export type ItemReceivingMetrics = typeof itemReceivingMetrics.$inferSelect;
export type InsertItemReceivingMetrics = z.infer<typeof insertItemReceivingMetricsSchema>;
export type ReceivingMetricsSettings = typeof receivingMetricsSettings.$inferSelect;
export type InsertReceivingMetricsSettings = z.infer<typeof insertReceivingMetricsSettingsSchema>;
