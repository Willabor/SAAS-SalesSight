import {
  users,
  itemList,
  salesTransactions,
  uploadHistory,
  receivingVouchers,
  receivingLines,
  itemReceivingMetrics,
  receivingMetricsSettings,
  vendorConfigurations,
  styleConfigurations,
  prepackConfigurations,
  prepackSizeDistributions,
  prepackRecommendationLog,
  inventorySettings,
  skuProfitAnalysis,
  skuFinancialData,
  type User,
  type UpsertUser,
  type InsertUser,
  type ItemList,
  type InsertItemList,
  type SalesTransaction,
  type InsertSalesTransaction,
  type UploadHistory,
  type InsertUploadHistory,
  type ReceivingVoucher,
  type InsertReceivingVoucher,
  type ReceivingLine,
  type InsertReceivingLine,
  type ItemReceivingMetrics,
  type InsertItemReceivingMetrics,
  type VendorConfiguration,
  type InsertVendorConfiguration,
  type StyleConfiguration,
  type InsertStyleConfiguration,
  type StyleWithPacks,
  type PrepackConfiguration,
  type InsertPrepackConfiguration,
  type PrepackSizeDistribution,
  type InsertPrepackSizeDistribution,
  type PrepackWithDistributions,
  mlSettingsLog,
  type MLSettingsLog,
  type InsertMLSettingsLog,
  type InventorySettings,
  type InsertInventorySettings,
  type UpdateInventorySettings,
  type SkuProfitAnalysis,
  type SkuFinancialData,
  warehouseInventory,
  warehouseDistributionPlans,
  warehouseDistributionDetails,
  type WarehouseInventory,
  type InsertWarehouseInventory,
  type WarehouseDistributionPlan,
  type InsertWarehouseDistributionPlan,
  type WarehouseDistributionDetail,
  type InsertWarehouseDistributionDetail
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, count, sum, ilike, or, and, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Item List operations
  createItemList(item: InsertItemList): Promise<ItemList>;
  updateItemList(itemNumber: string, item: Partial<InsertItemList>): Promise<ItemList | undefined>;
  upsertItemList(item: InsertItemList): Promise<ItemList>;
  getAllItemList(limit?: number, offset?: number, search?: string, category?: string, gender?: string, vendor?: string, sortBy?: string, sortDirection?: 'asc' | 'desc'): Promise<{
    items: ItemList[];
    total: number;
  }>;
  deleteItemList(id: number): Promise<boolean>;
  deleteAllItemList(): Promise<number>;
  getItemListStats(): Promise<{
    totalItems: number;
    totalVendors: number;
    totalCategories: number;
    totalAvailable: number;
  }>;
  getItemListFilterOptions(): Promise<{
    categories: string[];
    genders: string[];
    vendors: string[];
  }>;
  getItemListEnhancedStats(): Promise<{
    totalItems: number;
    totalValue: number;
    potentialProfit: number;
    lowStock: number;
  }>;
  getAllItemListForExport(category?: string, gender?: string, vendor?: string, search?: string): Promise<ItemList[]>;
  
  // Sales Transactions operations
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  getExistingTransactions(transactions: Array<{
    date: string | null;
    store: string | null;
    receiptNumber: string | null;
    sku: string | null;
    itemName: string | null;
    transactionStoreType: string | null;
    price: string | null;
    sheet: string | null;
  }>): Promise<Set<string>>;
  getAllSalesTransactions(limit?: number, offset?: number, search?: string, dateFrom?: string, dateTo?: string, stores?: string[], sortBy?: string, sortDirection?: 'asc' | 'desc'): Promise<{
    transactions: SalesTransaction[];
    total: number;
  }>;
  updateSalesTransaction(id: number, transaction: Partial<InsertSalesTransaction>): Promise<SalesTransaction | undefined>;
  deleteSalesTransaction(id: number): Promise<boolean>;
  deleteAllSalesTransactions(): Promise<number>;
  getSalesStats(): Promise<{
    totalTransactions: number;
    totalRevenue: string;
    totalReceipts: number;
    totalStores: number;
  }>;
  getSalesInsights(): Promise<{
    byStore: Array<{ store: string; totalSales: number; totalRevenue: string; transactionCount: number }>;
    byItem: Array<{ sku: string; itemName: string; totalSales: number; totalRevenue: string; vendorName: string | null; category: string | null }>;
    byMonth: Array<{ month: string; totalRevenue: string; transactionCount: number }>;
    byYear: Array<{ year: string; totalRevenue: string; transactionCount: number }>;
    byCategory: Array<{ category: string; totalSales: number; totalRevenue: string; transactionCount: number; avgPrice: string }>;
    inventoryAge: Array<{ ageGroup: string; totalSales: number; totalRevenue: string; itemCount: number }>;
    recentInventory: Array<{ recencyGroup: string; totalSales: number; totalRevenue: string; itemCount: number }>;
  }>;
  getSalesTransactionInsights(dateFrom?: string, dateTo?: string, search?: string, stores?: string[]): Promise<{
    totalRevenue: string;
    totalReceipts: number;
    avgReceiptValue: string;
    revenueByStore: Array<{ store: string; totalRevenue: string; transactionCount: number }>;
    avgTransactionValueByStore: Array<{ store: string; avgTransactionValue: string; transactionCount: number }>;
  }>;
  
  // Upload History operations
  createUploadHistory(history: InsertUploadHistory): Promise<UploadHistory>;
  getRecentUploads(limit?: number): Promise<UploadHistory[]>;
  
  // Receiving History operations
  upsertReceivingVoucher(voucher: InsertReceivingVoucher): Promise<ReceivingVoucher>;
  bulkInsertReceivingLines(lines: InsertReceivingLine[]): Promise<number>;
  getExistingVouchers(vouchers: Array<{
    voucherNumber: string;
    store: string;
    date: string;
    totalQty: number;
  }>): Promise<Set<string>>;
  getReceivingVouchers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    store?: string;
    vendor?: string;
    type?: string;
    voucherNumber?: string;
    exactMatch?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    vouchers: ReceivingVoucher[];
    total: number;
  }>;
  getReceivingFilterOptions(): Promise<{
    stores: string[];
    vendors: string[];
    types: string[];
  }>;
  getAllReceivingVouchersForExport(store?: string, vendor?: string, type?: string, search?: string): Promise<ReceivingVoucher[]>;
  getAllReceivingLinesForExport(store?: string, vendor?: string, type?: string, search?: string): Promise<Array<{
    voucherNumber: string | null;
    date: string | null;
    store: string | null;
    vendor: string | null;
    type: string;
    itemNumber: string | null;
    itemName: string | null;
    qty: number;
    cost: string;
    lineTotal: string;
  }>>;
  getVoucherByIdWithLines(id: number): Promise<(ReceivingVoucher & { lines: ReceivingLine[] }) | null>;
  getReceivingStats(): Promise<{
    totalVouchers: number;
    totalLines: number;
    totalCost: number;
    uniqueStores: number;
    uniqueVendors: number;
  }>;
  deleteReceivingVoucher(id: number): Promise<boolean>;
  deleteAllReceivingVouchers(): Promise<number>;
  
  // Inventory Turnover operations (SKU-level - legacy)
  getInventoryTurnoverMetrics(): Promise<{
    totalInventoryValue: number;
    totalInventoryUnits: number;
    deadStockValue: number;
    deadStockUnits: number;
    avgDaysSinceLastSale: number;
    daysSinceMostRecentSale: number | null;
  }>;
  getSlowMovingStock(daysThreshold: number, limit?: number): Promise<Array<{
    itemNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    availQty: number;
    orderCost: string | null;
    inventoryValue: number;
    lastSold: string | null;
    daysSinceLastSale: number | null;
    stockStatus: string;
  }>>;
  getOverstockUnderstockAnalysis(daysRange: number, limit?: number, overstockThreshold?: number, understockThreshold?: number): Promise<Array<{
    itemNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    availQty: number;
    orderCost: string | null;
    inventoryValue: number;
    unitsSold: number;
    avgDailySales: number;
    daysOfSupply: number;
    stockStatus: string;
  }>>;
  getCategoryInventoryAnalysis(daysRange?: number): Promise<Array<{
    category: string;
    totalInventoryValue: number;
    totalUnits: number;
    totalItemsCount: number;
    totalSales: number;
    avgTurnoverRate: number;
  }>>;

  // Style-level Inventory Turnover operations (new)
  getStyleInventoryMetrics(): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    gender: string | null;
    totalActiveQty: number;
    totalClosedStoresQty: number;
    avgOrderCost: number;
    avgSellingPrice: number;
    avgMarginPercent: number;
    inventoryValue: number;
    classification: string;
    seasonalPattern: string;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    receiveCount: number;
    stockStatus: string;
  }>>;

  getStyleSlowMoving(limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    inventoryValue: number;
    avgMarginPercent: number;
    classification: string;
    seasonalPattern: string;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    stockStatus: string;
  }>>;

  getStyleOverstockUnderstock(daysRange: number, limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    inventoryValue: number;
    avgMarginPercent: number;
    unitsSold: number;
    avgDailySales: number;
    daysOfSupply: number;
    classification: string;
    stockStatus: string;
  }>>;

  getTransferRecommendations(limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    fromStore: string;
    toStore: string;
    fromStoreQty: number;
    toStoreQty: number;
    fromStoreDailySales: number;
    toStoreDailySales: number;
    recommendedQty: number;
    priority: string;
  }>>;

  getTransferRecommendationsWithSKUs(limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    fromStore: string;
    toStore: string;
    fromStoreQty: number;
    toStoreQty: number;
    fromStoreDailySales: number;
    toStoreDailySales: number;
    recommendedQty: number;
    priority: string;
    avgMarginPercent: number;
    skuDetails: Array<{
      sku: string;
      color: string | null;
      size: string | null;
      fromStoreQty: number;
      toStoreQty: number;
    }>;
  }>>;

  getRestockingRecommendations(limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    avgDailySales: number;
    daysOfSupply: number;
    classification: string;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    avgMarginPercent: number;
    recommendedOrderQty: number;
    priority: string;
  }>>;

  getStylesNeedingRestock(limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    usesPrepacks: boolean;
    totalActiveQty: number;
    avgDailySales: number;
    daysOfSupply: number;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    recommendedOrderQty: number;
    urgency: string;
  }>>;

  getSaleRecommendations(limit?: number): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    inventoryValue: number;
    daysSinceLastSale: number | null;
    daysSinceLastReceive: number | null;
    unitsSold90d: number;
    avgCost: number;
    avgPrice: number;
    avgMarginPercent: number;
    classification: string;
    seasonalPattern: string;
    suggestedDiscountPercent: number;
    discountedPrice: number;
    projectedRecovery: number;
    reason: string;
    priority: string;
  }>>;

  getProductSegmentationReport(): Promise<{
    metadata: {
      generatedDate: string;
      totalStyles: number;
      totalActiveInventoryValue: number;
      analysisDateRange: string;
    };
    segments: {
      bestSellers: Array<any>;
      coreHighFrequency: Array<any>;
      coreMediumFrequency: Array<any>;
      coreLowFrequency: Array<any>;
      nonCoreRepeat: Array<any>;
      oneTimePurchase: Array<any>;
      newArrivals: Array<any>;
      summerItems: Array<any>;
      winterItems: Array<any>;
      clearanceCandidates: Array<any>;
    };
  }>;

  // ML Settings Log operations
  createMLSettingsLog(log: InsertMLSettingsLog): Promise<MLSettingsLog>;
  getMLSettingsLogs(limit?: number): Promise<MLSettingsLog[]>;

  // Item Receiving Metrics operations
  getReceivingMetrics(styleNumber: string): Promise<ItemReceivingMetrics | undefined>;
  getAllReceivingMetrics(filters?: {
    lifecycle?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ metrics: ItemReceivingMetrics[]; total: number }>;
  upsertReceivingMetrics(metrics: InsertItemReceivingMetrics): Promise<ItemReceivingMetrics>;
  batchUpsertReceivingMetrics(metrics: InsertItemReceivingMetrics[]): Promise<void>;
  deleteAllReceivingMetrics(): Promise<number>;
  getReceivingMetricsStats(): Promise<{
    total: number;
    byLifecycle: Record<string, number>;
    lastCalculated: Date | null;
  }>;

  // Receiving Metrics Settings
  getReceivingMetricsSettings(): Promise<any | null>;
  upsertReceivingMetricsSettings(settings: any): Promise<any>;

  // Multi-Dimensional Metrics (Phase 2)
  calculateMetricsMultidimensional(styleNumbers: string[], calculatedBy: string, settings?: any): Promise<any>;

  // Vendor Configuration operations (Phase 0)
  getVendorConfigurations(filters?: { usesPrepacks?: boolean; limit?: number; offset?: number }): Promise<{
    vendors: VendorConfiguration[];
    total: number;
  }>;
  getVendorConfiguration(vendorName: string): Promise<VendorConfiguration | undefined>;
  createVendorConfiguration(vendor: InsertVendorConfiguration): Promise<VendorConfiguration>;
  updateVendorConfiguration(vendorName: string, vendor: Partial<InsertVendorConfiguration>): Promise<VendorConfiguration | undefined>;
  deleteVendorConfiguration(vendorName: string): Promise<boolean>;

  // Style Configuration operations (Style-First Architecture)
  listStyleConfigurations(vendorName?: string): Promise<StyleWithPacks[]>;
  getStyleConfiguration(id: number): Promise<StyleWithPacks | undefined>;
  createStyleConfiguration(style: InsertStyleConfiguration): Promise<StyleConfiguration>;
  updateStyleConfiguration(id: number, style: Partial<InsertStyleConfiguration>): Promise<StyleConfiguration | undefined>;
  deleteStyleConfiguration(id: number): Promise<boolean>;

  // Prepack Configuration operations (Style-First Architecture)
  getPrepackConfigurations(filters?: { vendorName?: string; styleNumber?: string; styleConfigId?: number }): Promise<PrepackConfiguration[]>;
  getPrepackConfigurationWithDistributions(id: number): Promise<PrepackWithDistributions | undefined>;
  createPrepackConfiguration(
    prepack: InsertPrepackConfiguration,
    distributions: InsertPrepackSizeDistribution[]
  ): Promise<PrepackWithDistributions>;
  updatePrepackConfiguration(
    id: number,
    prepack: Partial<InsertPrepackConfiguration>,
    distributions?: InsertPrepackSizeDistribution[]
  ): Promise<PrepackWithDistributions | undefined>;
  deletePrepackConfiguration(id: number): Promise<boolean>;
  calculatePackCost(
    vendorName: string,
    styleNumber: string,
    sizeDistributions: Array<{ sizeValue: string; quantity: number }>
  ): Promise<{
    totalCost: string;
    averageCostPerUnit: string;
    sizeBreakdown: Array<{
      sizeValue: string;
      quantity: number;
      averageCost: string;
      subtotal: string;
      itemsFound: number;
    }>;
    totalItemsFound: number;
    totalItemsExpected: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createItemList(item: InsertItemList): Promise<ItemList> {
    const [createdItem] = await db
      .insert(itemList)
      .values(item)
      .returning();
    return createdItem;
  }

  async updateItemList(itemNumber: string, item: Partial<InsertItemList>): Promise<ItemList | undefined> {
    const [updatedItem] = await db
      .update(itemList)
      .set(item)
      .where(eq(itemList.itemNumber, itemNumber))
      .returning();
    return updatedItem || undefined;
  }

  async upsertItemList(item: InsertItemList): Promise<ItemList> {
    const [upsertedItem] = await db
      .insert(itemList)
      .values(item)
      .onConflictDoUpdate({
        target: itemList.itemNumber,
        set: {
          vendorName: item.vendorName,
          itemName: item.itemName,
          category: item.category,
          gender: item.gender,
          availQty: item.availQty,
          hqQty: item.hqQty,
          gmQty: item.gmQty,
          hmQty: item.hmQty,
          mmQty: item.mmQty,
          nmQty: item.nmQty,
          pmQty: item.pmQty,
          lmQty: item.lmQty,
          lastRcvd: item.lastRcvd,
          lastSold: item.lastSold,
          orderCost: item.orderCost,
          sellingPrice: item.sellingPrice,
          notes: item.notes,
          uploadedAt: sql`NOW()`,
        },
      })
      .returning();
    return upsertedItem;
  }

  async getAllItemList(
    limit = 50, 
    offset = 0, 
    search?: string,
    category?: string,
    gender?: string,
    vendor?: string,
    sortBy?: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    items: ItemList[];
    total: number;
  }> {
    // Build filter conditions
    const filters = [];
    
    if (search) {
      filters.push(or(
        ilike(itemList.itemNumber, `%${search}%`),
        ilike(itemList.itemName, `%${search}%`),
        ilike(itemList.vendorName, `%${search}%`),
        ilike(itemList.category, `%${search}%`)
      ));
    }
    
    if (category) {
      filters.push(eq(itemList.category, category));
    }
    
    if (gender) {
      filters.push(eq(itemList.gender, gender));
    }
    
    if (vendor) {
      filters.push(eq(itemList.vendorName, vendor));
    }
    
    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    
    // Determine sort column - default to uploadedAt
    let orderByClause;
    if (sortBy && sortBy in itemList) {
      const column = itemList[sortBy as keyof typeof itemList];
      orderByClause = sortDirection === 'asc' ? sql`${column} ASC` : sql`${column} DESC`;
    } else {
      orderByClause = desc(itemList.uploadedAt);
    }
    
    // Execute queries
    const [itemsResult, [countResult]] = await Promise.all([
      whereClause 
        ? db.select().from(itemList).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset)
        : db.select().from(itemList).orderBy(orderByClause).limit(limit).offset(offset),
      whereClause
        ? db.select({ count: count() }).from(itemList).where(whereClause)
        : db.select({ count: count() }).from(itemList)
    ]);
    
    return { 
      items: itemsResult, 
      total: countResult.count 
    };
  }

  async deleteItemList(id: number): Promise<boolean> {
    const result = await db.delete(itemList).where(eq(itemList.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllItemList(): Promise<number> {
    const result = await db.delete(itemList);
    return result.rowCount || 0;
  }

  async getItemListStats(): Promise<{
    totalItems: number;
    totalVendors: number;
    totalCategories: number;
    totalAvailable: number;
  }> {
    const [stats] = await db
      .select({
        totalItems: count(itemList.id),
        totalVendors: sql<number>`COUNT(DISTINCT ${itemList.vendorName})`,
        totalCategories: sql<number>`COUNT(DISTINCT ${itemList.category})`,
        totalAvailable: sum(itemList.availQty),
      })
      .from(itemList);

    return {
      totalItems: stats.totalItems,
      totalVendors: stats.totalVendors,
      totalCategories: stats.totalCategories,
      totalAvailable: Number(stats.totalAvailable) || 0,
    };
  }

  async getItemListFilterOptions(): Promise<{
    categories: string[];
    genders: string[];
    vendors: string[];
  }> {
    const [categoriesResult] = await db
      .selectDistinct({ value: itemList.category })
      .from(itemList)
      .where(sql`${itemList.category} IS NOT NULL AND ${itemList.category} != ''`);
    
    const [gendersResult] = await db
      .selectDistinct({ value: itemList.gender })
      .from(itemList)
      .where(sql`${itemList.gender} IS NOT NULL AND ${itemList.gender} != ''`);
    
    const [vendorsResult] = await db
      .selectDistinct({ value: itemList.vendorName })
      .from(itemList)
      .where(sql`${itemList.vendorName} IS NOT NULL AND ${itemList.vendorName} != ''`);

    const categories = (await db
      .selectDistinct({ value: itemList.category })
      .from(itemList)
      .where(sql`${itemList.category} IS NOT NULL AND ${itemList.category} != ''`))
      .map(r => r.value!)
      .sort();

    const genders = (await db
      .selectDistinct({ value: itemList.gender })
      .from(itemList)
      .where(sql`${itemList.gender} IS NOT NULL AND ${itemList.gender} != ''`))
      .map(r => r.value!)
      .sort();

    const vendors = (await db
      .selectDistinct({ value: itemList.vendorName })
      .from(itemList)
      .where(sql`${itemList.vendorName} IS NOT NULL AND ${itemList.vendorName} != ''`))
      .map(r => r.value!)
      .sort();

    return { categories, genders, vendors };
  }

  async getItemListEnhancedStats(): Promise<{
    totalItems: number;
    totalValue: number;
    potentialProfit: number;
    lowStock: number;
  }> {
    // Get all items with pricing info
    const items = await db.select().from(itemList);
    
    const totalItems = items.length;
    
    const totalValue = items.reduce((sum, item) => {
      const qty = item.availQty || 0;
      const price = parseFloat(item.sellingPrice || '0');
      return sum + (qty * price);
    }, 0);
    
    const totalCost = items.reduce((sum, item) => {
      const qty = item.availQty || 0;
      const cost = parseFloat(item.orderCost || '0');
      return sum + (qty * cost);
    }, 0);
    
    const lowStock = items.filter(item => 
      (item.availQty || 0) > 0 && (item.availQty || 0) <= 2
    ).length;

    return {
      totalItems,
      totalValue,
      potentialProfit: totalValue - totalCost,
      lowStock
    };
  }

  async getAllItemListForExport(category?: string, gender?: string, vendor?: string, search?: string): Promise<ItemList[]> {
    const conditions = [];
    
    if (category && category !== 'all') {
      conditions.push(eq(itemList.category, category));
    }
    if (gender && gender !== 'all') {
      conditions.push(eq(itemList.gender, gender));
    }
    if (vendor && vendor !== 'all') {
      conditions.push(eq(itemList.vendorName, vendor));
    }
    if (search) {
      conditions.push(
        or(
          ilike(itemList.itemNumber, `%${search}%`),
          ilike(itemList.itemName, `%${search}%`),
          ilike(itemList.vendorName, `%${search}%`),
          ilike(itemList.category, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    if (whereClause) {
      return await db.select().from(itemList).where(whereClause).orderBy(desc(itemList.uploadedAt));
    } else {
      return await db.select().from(itemList).orderBy(desc(itemList.uploadedAt));
    }
  }

  async createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction> {
    const [createdTransaction] = await db
      .insert(salesTransactions)
      .values(transaction)
      .returning();
    return createdTransaction;
  }

  async getExistingTransactions(
    transactions: Array<{
      date: string | null;
      store: string | null;
      receiptNumber: string | null;
      sku: string | null;
      itemName: string | null;
      transactionStoreType: string | null;
      price: string | null;
      sheet: string | null;
    }>
  ): Promise<Set<string>> {
    if (transactions.length === 0) {
      return new Set();
    }
    
    // Deduplicate incoming transactions to reduce query size
    const uniqueTransactions = Array.from(
      new Map(
        transactions.map(t => [
          `${t.receiptNumber}|${t.date}|${t.sku}|${t.store}|${t.itemName}|${t.transactionStoreType}|${t.price}|${t.sheet}`,
          t
        ])
      ).values()
    );
    
    // Process in chunks to avoid parameter limits (500 transactions per query)
    const chunkSize = 500;
    const allExisting = new Set<string>();
    
    for (let i = 0; i < uniqueTransactions.length; i += chunkSize) {
      const chunk = uniqueTransactions.slice(i, i + chunkSize);
      
      // Build exact match conditions using IS NOT DISTINCT FROM for NULL-safe comparison
      const conditions = chunk.map(t => 
        sql`(
          ${salesTransactions.receiptNumber} IS NOT DISTINCT FROM ${t.receiptNumber} 
          AND ${salesTransactions.date} IS NOT DISTINCT FROM ${t.date} 
          AND ${salesTransactions.sku} IS NOT DISTINCT FROM ${t.sku}
          AND ${salesTransactions.store} IS NOT DISTINCT FROM ${t.store}
          AND ${salesTransactions.itemName} IS NOT DISTINCT FROM ${t.itemName}
          AND ${salesTransactions.transactionStoreType} IS NOT DISTINCT FROM ${t.transactionStoreType}
          AND ${salesTransactions.price}::text IS NOT DISTINCT FROM ${t.price}
          AND ${salesTransactions.sheet} IS NOT DISTINCT FROM ${t.sheet}
        )`
      );
      
      const existingTransactions = await db
        .select({
          date: salesTransactions.date,
          store: salesTransactions.store,
          receiptNumber: salesTransactions.receiptNumber,
          sku: salesTransactions.sku,
          itemName: salesTransactions.itemName,
          transactionStoreType: salesTransactions.transactionStoreType,
          price: sql<string>`${salesTransactions.price}::text`,
          sheet: salesTransactions.sheet,
        })
        .from(salesTransactions)
        .where(sql`${sql.join(conditions, sql` OR `)}`);
      
      // Add to set using normalized composite keys
      existingTransactions.forEach(t => {
        allExisting.add(
          `${t.receiptNumber}|${t.date}|${t.sku}|${t.store}|${t.itemName}|${t.transactionStoreType}|${t.price}|${t.sheet}`
        );
      });
    }
    
    return allExisting;
  }

  async getAllSalesTransactions(limit = 50, offset = 0, search?: string, dateFrom?: string, dateTo?: string, stores?: string[], sortBy?: string, sortDirection: 'asc' | 'desc' = 'desc'): Promise<{
    transactions: SalesTransaction[];
    total: number;
  }> {
    let transactions: SalesTransaction[];
    let total: number;

    const filters = [];

    // Search filter
    if (search) {
      filters.push(
        or(
          ilike(salesTransactions.sku, `%${search}%`),
          ilike(salesTransactions.itemName, `%${search}%`),
          ilike(salesTransactions.store, `%${search}%`),
          ilike(salesTransactions.receiptNumber, `%${search}%`)
        )
      );
    }

    // Date range filter
    if (dateFrom) {
      filters.push(gte(salesTransactions.date, dateFrom));
    }
    if (dateTo) {
      filters.push(lte(salesTransactions.date, dateTo));
    }

    // Store filter - use IN clause for multiple stores
    if (stores && stores.length > 0) {
      filters.push(inArray(salesTransactions.store, stores));
    }

    // Determine sort column and direction
    const sortColumn = sortBy && sortBy in salesTransactions ? salesTransactions[sortBy as keyof typeof salesTransactions] : salesTransactions.date;
    const orderByClause = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    if (whereClause) {
      const [transactionsResult, [countResult]] = await Promise.all([
        db.select().from(salesTransactions).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset),
        db.select({ count: count() }).from(salesTransactions).where(whereClause)
      ]);

      transactions = transactionsResult;
      total = countResult.count;
    } else {
      const [transactionsResult, [countResult]] = await Promise.all([
        db.select().from(salesTransactions).orderBy(orderByClause).limit(limit).offset(offset),
        db.select({ count: count() }).from(salesTransactions)
      ]);

      transactions = transactionsResult;
      total = countResult.count;
    }

    return { transactions, total };
  }

  async updateSalesTransaction(id: number, transaction: Partial<InsertSalesTransaction>): Promise<SalesTransaction | undefined> {
    const [updatedTransaction] = await db
      .update(salesTransactions)
      .set(transaction)
      .where(eq(salesTransactions.id, id))
      .returning();
    return updatedTransaction || undefined;
  }

  async deleteSalesTransaction(id: number): Promise<boolean> {
    const result = await db.delete(salesTransactions).where(eq(salesTransactions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllSalesTransactions(): Promise<number> {
    const result = await db.delete(salesTransactions);
    return result.rowCount || 0;
  }

  async getSalesStats(): Promise<{
    totalTransactions: number;
    totalRevenue: string;
    totalReceipts: number;
    totalStores: number;
  }> {
    const [stats] = await db
      .select({
        totalTransactions: count(salesTransactions.id),
        totalRevenue: sum(salesTransactions.price),
        totalReceipts: sql<number>`COUNT(DISTINCT ${salesTransactions.receiptNumber})`,
        totalStores: sql<number>`COUNT(DISTINCT ${salesTransactions.store})`,
      })
      .from(salesTransactions);

    return {
      totalTransactions: stats.totalTransactions,
      totalRevenue: stats.totalRevenue || "0",
      totalReceipts: stats.totalReceipts,
      totalStores: stats.totalStores,
    };
  }

  async getSalesInsights(): Promise<{
    byStore: Array<{ store: string; totalSales: number; totalRevenue: string; transactionCount: number }>;
    byItem: Array<{ sku: string; itemName: string; totalSales: number; totalRevenue: string; vendorName: string | null; category: string | null }>;
    byMonth: Array<{ month: string; totalRevenue: string; transactionCount: number }>;
    byYear: Array<{ year: string; totalRevenue: string; transactionCount: number }>;
    byCategory: Array<{ category: string; totalSales: number; totalRevenue: string; transactionCount: number; avgPrice: string }>;
    inventoryAge: Array<{ ageGroup: string; totalSales: number; totalRevenue: string; itemCount: number }>;
    recentInventory: Array<{ recencyGroup: string; totalSales: number; totalRevenue: string; itemCount: number }>;
  }> {
    // Sales by store
    const byStore = await db
      .select({
        store: salesTransactions.store,
        totalSales: count(salesTransactions.id),
        totalRevenue: sum(salesTransactions.price),
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.receiptNumber})`,
      })
      .from(salesTransactions)
      .groupBy(salesTransactions.store)
      .orderBy(desc(sum(salesTransactions.price)));

    // Sales by item (SKU) with joined item list data
    const byItem = await db
      .select({
        sku: salesTransactions.sku,
        itemName: salesTransactions.itemName,
        totalSales: count(salesTransactions.id),
        totalRevenue: sum(salesTransactions.price),
        vendorName: itemList.vendorName,
        category: itemList.category,
      })
      .from(salesTransactions)
      .leftJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .groupBy(salesTransactions.sku, salesTransactions.itemName, itemList.vendorName, itemList.category)
      .orderBy(desc(sum(salesTransactions.price)));

    // Sales by month
    const byMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${salesTransactions.date}, 'YYYY-MM')`,
        totalRevenue: sum(salesTransactions.price),
        transactionCount: count(salesTransactions.id),
      })
      .from(salesTransactions)
      .groupBy(sql`TO_CHAR(${salesTransactions.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${salesTransactions.date}, 'YYYY-MM') DESC`);

    // Sales by year
    const byYear = await db
      .select({
        year: sql<string>`EXTRACT(YEAR FROM ${salesTransactions.date})::text`,
        totalRevenue: sum(salesTransactions.price),
        transactionCount: count(salesTransactions.id),
      })
      .from(salesTransactions)
      .groupBy(sql`EXTRACT(YEAR FROM ${salesTransactions.date})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${salesTransactions.date}) DESC`);

    // Sales by category
    const byCategory = await db
      .select({
        category: sql<string>`COALESCE(${itemList.category}, 'Uncategorized')`,
        totalSales: count(salesTransactions.id),
        totalRevenue: sum(salesTransactions.price),
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.receiptNumber})`,
        avgPrice: sql<string>`AVG(${salesTransactions.price})`,
      })
      .from(salesTransactions)
      .leftJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .groupBy(sql`COALESCE(${itemList.category}, 'Uncategorized')`)
      .orderBy(desc(sum(salesTransactions.price)));

    // Inventory age analysis (based on creation date)
    const inventoryAge = await db
      .select({
        ageGroup: sql<string>`
          CASE 
            WHEN ${itemList.creationDate} IS NULL THEN 'Unknown'
            WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '3 months' THEN '0-3 months'
            WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '6 months' THEN '3-6 months'
            WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '1 year' THEN '6-12 months'
            WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '2 years' THEN '1-2 years'
            ELSE '2+ years'
          END
        `,
        totalSales: count(salesTransactions.id),
        totalRevenue: sum(salesTransactions.price),
        itemCount: sql<number>`COUNT(DISTINCT ${salesTransactions.sku})`,
      })
      .from(salesTransactions)
      .leftJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .groupBy(sql`
        CASE 
          WHEN ${itemList.creationDate} IS NULL THEN 'Unknown'
          WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '3 months' THEN '0-3 months'
          WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '6 months' THEN '3-6 months'
          WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '1 year' THEN '6-12 months'
          WHEN ${itemList.creationDate} >= CURRENT_DATE - INTERVAL '2 years' THEN '1-2 years'
          ELSE '2+ years'
        END
      `)
      .orderBy(desc(sum(salesTransactions.price)));

    // Recent inventory performance (based on last received)
    const recentInventory = await db
      .select({
        recencyGroup: sql<string>`
          CASE 
            WHEN ${itemList.lastRcvd} IS NULL THEN 'Never Received'
            WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '1 month' THEN 'Last Month'
            WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '3 months' THEN '1-3 months ago'
            WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '6 months' THEN '3-6 months ago'
            WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '1 year' THEN '6-12 months ago'
            ELSE '1+ year ago'
          END
        `,
        totalSales: count(salesTransactions.id),
        totalRevenue: sum(salesTransactions.price),
        itemCount: sql<number>`COUNT(DISTINCT ${salesTransactions.sku})`,
      })
      .from(salesTransactions)
      .leftJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .groupBy(sql`
        CASE 
          WHEN ${itemList.lastRcvd} IS NULL THEN 'Never Received'
          WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '1 month' THEN 'Last Month'
          WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '3 months' THEN '1-3 months ago'
          WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '6 months' THEN '3-6 months ago'
          WHEN ${itemList.lastRcvd} >= CURRENT_DATE - INTERVAL '1 year' THEN '6-12 months ago'
          ELSE '1+ year ago'
        END
      `)
      .orderBy(desc(sum(salesTransactions.price)));

    return {
      byStore: byStore.map(s => ({
        store: s.store || 'Unknown',
        totalSales: s.totalSales,
        totalRevenue: s.totalRevenue || '0',
        transactionCount: s.transactionCount,
      })),
      byItem: byItem.map(i => ({
        sku: i.sku || 'Unknown',
        itemName: i.itemName || 'Unknown',
        totalSales: i.totalSales,
        totalRevenue: i.totalRevenue || '0',
        vendorName: i.vendorName,
        category: i.category,
      })),
      byMonth: byMonth.map(m => ({
        month: m.month || 'Unknown',
        totalRevenue: m.totalRevenue || '0',
        transactionCount: m.transactionCount,
      })),
      byYear: byYear.map(y => ({
        year: y.year || 'Unknown',
        totalRevenue: y.totalRevenue || '0',
        transactionCount: y.transactionCount,
      })),
      byCategory: byCategory.map(c => ({
        category: c.category || 'Uncategorized',
        totalSales: c.totalSales,
        totalRevenue: c.totalRevenue || '0',
        transactionCount: c.transactionCount,
        avgPrice: c.avgPrice || '0',
      })),
      inventoryAge: inventoryAge.map(a => ({
        ageGroup: a.ageGroup || 'Unknown',
        totalSales: a.totalSales,
        totalRevenue: a.totalRevenue || '0',
        itemCount: a.itemCount,
      })),
      recentInventory: recentInventory.map(r => ({
        recencyGroup: r.recencyGroup || 'Unknown',
        totalSales: r.totalSales,
        totalRevenue: r.totalRevenue || '0',
        itemCount: r.itemCount,
      })),
    };
  }

  async getSalesTransactionInsights(dateFrom?: string, dateTo?: string, search?: string, stores?: string[]): Promise<{
    totalRevenue: string;
    totalReceipts: number;
    avgReceiptValue: string;
    revenueByStore: Array<{ store: string; totalRevenue: string; transactionCount: number }>;
    avgTransactionValueByStore: Array<{ store: string; avgTransactionValue: string; transactionCount: number }>;
  }> {
    // Build WHERE clause based on filters
    const conditions = [];

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(salesTransactions.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(salesTransactions.date, dateTo));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(salesTransactions.sku, searchPattern),
          ilike(salesTransactions.itemName, searchPattern),
          ilike(salesTransactions.store, searchPattern),
          ilike(salesTransactions.receiptNumber, searchPattern)
        )!
      );
    }

    // Store filter - use IN clause for multiple stores
    if (stores && stores.length > 0) {
      conditions.push(inArray(salesTransactions.store, stores));
    }

    // Company-wide totals with filters (includes ALL transactions, even with NULL stores)
    // NOTE: Receipt numbers are NOT unique across stores! Same receipt # can exist in multiple stores.
    // We need to count unique (receipt_number, store) pairs, not just unique receipt_numbers.
    const totalsQuery = db
      .select({
        totalRevenue: sum(salesTransactions.price),
        totalReceipts: sql<number>`COUNT(DISTINCT (${salesTransactions.receiptNumber} || '|' || COALESCE(${salesTransactions.store}, 'NULL')))`,
      })
      .from(salesTransactions);

    const [companyTotals] = conditions.length > 0
      ? await totalsQuery.where(and(...conditions))
      : await totalsQuery;

    const totalRevenue = parseFloat(companyTotals.totalRevenue || '0');
    const totalReceipts = companyTotals.totalReceipts || 0;
    const avgReceiptValue = totalReceipts > 0 ? (totalRevenue / totalReceipts).toFixed(2) : '0.00';

    // Revenue by store with filters
    const revenueQuery = db
      .select({
        store: salesTransactions.store,
        totalRevenue: sum(salesTransactions.price),
        transactionCount: sql<number>`COUNT(DISTINCT ${salesTransactions.receiptNumber})`,
      })
      .from(salesTransactions)
      .groupBy(salesTransactions.store)
      .orderBy(desc(sum(salesTransactions.price)));

    const revenueByStore = conditions.length > 0
      ? await revenueQuery.where(and(...conditions))
      : await revenueQuery;

    // Average transaction value by store (totalRevenue / transactionCount)
    const avgTransactionValueByStore = revenueByStore.map(s => ({
      store: s.store || 'Unknown',
      avgTransactionValue: s.transactionCount > 0
        ? (parseFloat(s.totalRevenue || '0') / s.transactionCount).toFixed(2)
        : '0.00',
      transactionCount: s.transactionCount,
    }));

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalReceipts: totalReceipts,
      avgReceiptValue: avgReceiptValue,
      revenueByStore: revenueByStore.map(s => ({
        store: s.store || 'Unknown',
        totalRevenue: s.totalRevenue || '0',
        transactionCount: s.transactionCount,
      })),
      avgTransactionValueByStore,
    };
  }

  async createUploadHistory(history: InsertUploadHistory): Promise<UploadHistory> {
    const [createdHistory] = await db
      .insert(uploadHistory)
      .values(history)
      .returning();
    return createdHistory;
  }

  async getRecentUploads(limit: number = 10): Promise<UploadHistory[]> {
    return await db
      .select()
      .from(uploadHistory)
      .orderBy(desc(uploadHistory.uploadedAt))
      .limit(limit);
  }

  async upsertReceivingVoucher(voucher: InsertReceivingVoucher): Promise<ReceivingVoucher> {
    const [upsertedVoucher] = await db
      .insert(receivingVouchers)
      .values(voucher)
      .onConflictDoUpdate({
        target: [receivingVouchers.voucherNumber, receivingVouchers.store, receivingVouchers.date],
        set: {
          vendor: voucher.vendor,
          type: voucher.type,
          qbTotal: voucher.qbTotal,
          correctedTotal: voucher.correctedTotal,
          totalQty: voucher.totalQty,
          time: voucher.time,
          fileName: voucher.fileName,
        },
      })
      .returning();
    return upsertedVoucher;
  }

  async bulkInsertReceivingLines(lines: InsertReceivingLine[]): Promise<number> {
    if (lines.length === 0) return 0;
    
    const result = await db
      .insert(receivingLines)
      .values(lines)
      .returning();
    
    return result.length;
  }

  async getExistingVouchers(vouchers: Array<{
    voucherNumber: string;
    store: string;
    date: string;
    totalQty: number;
  }>): Promise<Set<string>> {
    if (vouchers.length === 0) return new Set();

    // Deduplicate vouchers before query
    const uniqueVouchers = Array.from(
      new Map(vouchers.map(v => [`${v.voucherNumber}|${v.store}|${v.date}|${v.totalQty}`, v])).values()
    );

    const existingKeys = new Set<string>();
    const chunkSize = 500;

    for (let i = 0; i < uniqueVouchers.length; i += chunkSize) {
      const chunk = uniqueVouchers.slice(i, i + chunkSize);

      // Build OR conditions for NULL-safe comparison (including totalQty)
      const orConditions = chunk.map(v =>
        and(
          sql`${receivingVouchers.voucherNumber} IS NOT DISTINCT FROM ${v.voucherNumber}`,
          sql`${receivingVouchers.store} IS NOT DISTINCT FROM ${v.store}`,
          sql`${receivingVouchers.date} IS NOT DISTINCT FROM ${v.date}`,
          sql`${receivingVouchers.totalQty} = ${v.totalQty}`
        )
      );

      const existing = await db
        .select({
          voucherNumber: receivingVouchers.voucherNumber,
          store: receivingVouchers.store,
          date: receivingVouchers.date,
          totalQty: receivingVouchers.totalQty,
        })
        .from(receivingVouchers)
        .where(or(...orConditions));

      // Add to set with composite key (including totalQty)
      existing.forEach(v => {
        existingKeys.add(`${v.voucherNumber}|${v.store}|${v.date}|${v.totalQty}`);
      });
    }

    return existingKeys;
  }

  async getReceivingVouchers(params: {
    limit?: number;
    offset?: number;
    search?: string;
    store?: string;
    vendor?: string;
    type?: string;
    voucherNumber?: string;
    exactMatch?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  } = {}): Promise<{
    vouchers: ReceivingVoucher[];
    total: number;
  }> {
    const {
      limit = 50,
      offset = 0,
      search,
      store,
      vendor,
      type,
      voucherNumber,
      exactMatch = false,
      sortBy,
      sortDirection = 'desc'
    } = params;

    let vouchers: ReceivingVoucher[];
    let total: number;

    // Build filters
    const filters = [];

    if (store) {
      filters.push(eq(receivingVouchers.store, store));
    }

    if (vendor) {
      filters.push(eq(receivingVouchers.vendor, vendor));
    }

    if (type) {
      filters.push(eq(receivingVouchers.type, type));
    }

    if (voucherNumber) {
      if (exactMatch) {
        filters.push(eq(receivingVouchers.voucherNumber, voucherNumber));
      } else {
        filters.push(ilike(receivingVouchers.voucherNumber, `%${voucherNumber}%`));
      }
    }

    if (search) {
      filters.push(or(
        ilike(receivingVouchers.voucherNumber, `%${search}%`),
        ilike(receivingVouchers.vendor, `%${search}%`),
        ilike(receivingVouchers.store, `%${search}%`)
      ));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Determine sort column - map sortBy string to actual column
    const getSortColumn = () => {
      switch (sortBy) {
        case 'voucherNumber': return receivingVouchers.voucherNumber;
        case 'date': return receivingVouchers.date;
        case 'store': return receivingVouchers.store;
        case 'vendor': return receivingVouchers.vendor;
        case 'type': return receivingVouchers.type;
        case 'qbTotal': return receivingVouchers.qbTotal;
        case 'correctedTotal': return receivingVouchers.correctedTotal;
        case 'totalQty': return receivingVouchers.totalQty;
        case 'time': return receivingVouchers.time;
        case 'fileName': return receivingVouchers.fileName;
        default: return receivingVouchers.date;
      }
    };

    const sortColumn = getSortColumn();
    const orderByClause = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);

    if (whereClause) {
      const [vouchersResult, [countResult]] = await Promise.all([
        db.select().from(receivingVouchers).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset),
        db.select({ count: count() }).from(receivingVouchers).where(whereClause)
      ]);

      vouchers = vouchersResult;
      total = countResult.count;
    } else {
      const [vouchersResult, [countResult]] = await Promise.all([
        db.select().from(receivingVouchers).orderBy(orderByClause).limit(limit).offset(offset),
        db.select({ count: count() }).from(receivingVouchers)
      ]);

      vouchers = vouchersResult;
      total = countResult.count;
    }

    return { vouchers, total };
  }

  async getReceivingFilterOptions(): Promise<{
    stores: string[];
    vendors: string[];
    types: string[];
  }> {
    const stores = (await db
      .selectDistinct({ value: receivingVouchers.store })
      .from(receivingVouchers)
      .where(sql`${receivingVouchers.store} IS NOT NULL AND ${receivingVouchers.store} != ''`))
      .map(r => r.value!)
      .filter(Boolean)
      .sort();

    const vendors = (await db
      .selectDistinct({ value: receivingVouchers.vendor })
      .from(receivingVouchers)
      .where(sql`${receivingVouchers.vendor} IS NOT NULL AND ${receivingVouchers.vendor} != ''`))
      .map(r => r.value!)
      .filter(Boolean)
      .sort();

    const types = (await db
      .selectDistinct({ value: receivingVouchers.type })
      .from(receivingVouchers)
      .where(sql`${receivingVouchers.type} IS NOT NULL AND ${receivingVouchers.type} != ''`))
      .map(r => r.value)
      .filter(Boolean)
      .sort();

    return {
      stores,
      vendors,
      types,
    };
  }

  async getAllReceivingVouchersForExport(
    store?: string,
    vendor?: string,
    type?: string,
    search?: string
  ): Promise<ReceivingVoucher[]> {
    const filters = [];

    if (store) {
      filters.push(eq(receivingVouchers.store, store));
    }

    if (vendor) {
      filters.push(eq(receivingVouchers.vendor, vendor));
    }

    if (type) {
      filters.push(eq(receivingVouchers.type, type));
    }

    if (search) {
      filters.push(or(
        ilike(receivingVouchers.voucherNumber, `%${search}%`),
        ilike(receivingVouchers.vendor, `%${search}%`),
        ilike(receivingVouchers.store, `%${search}%`)
      ));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    if (whereClause) {
      return await db.select().from(receivingVouchers).where(whereClause).orderBy(desc(receivingVouchers.date));
    } else {
      return await db.select().from(receivingVouchers).orderBy(desc(receivingVouchers.date));
    }
  }

  async getAllReceivingLinesForExport(
    store?: string,
    vendor?: string,
    type?: string,
    search?: string
  ): Promise<Array<{
    voucherNumber: string | null;
    date: string | null;
    store: string | null;
    vendor: string | null;
    type: string;
    itemNumber: string | null;
    itemName: string | null;
    qty: number;
    cost: string;
    lineTotal: string;
  }>> {
    const filters = [];

    if (store) {
      filters.push(eq(receivingVouchers.store, store));
    }

    if (vendor) {
      filters.push(eq(receivingVouchers.vendor, vendor));
    }

    if (type) {
      filters.push(eq(receivingVouchers.type, type));
    }

    if (search) {
      filters.push(or(
        ilike(receivingVouchers.voucherNumber, `%${search}%`),
        ilike(receivingVouchers.vendor, `%${search}%`),
        ilike(receivingVouchers.store, `%${search}%`)
      ));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Join receiving_lines with receiving_vouchers to get all line items with voucher details
    const query = db
      .select({
        voucherNumber: receivingVouchers.voucherNumber,
        date: receivingVouchers.date,
        store: receivingVouchers.store,
        vendor: receivingVouchers.vendor,
        type: receivingVouchers.type,
        itemNumber: receivingLines.itemNumber,
        itemName: receivingLines.itemName,
        qty: receivingLines.qty,
        cost: receivingLines.cost,
        lineTotal: sql<string>`(receiving_lines.qty * receiving_lines.cost)::numeric::text`.as('lineTotal'),
      })
      .from(receivingLines)
      .innerJoin(receivingVouchers, eq(receivingLines.voucherId, receivingVouchers.id))
      .orderBy(desc(receivingVouchers.date), receivingVouchers.voucherNumber);

    if (whereClause) {
      return await query.where(whereClause);
    } else {
      return await query;
    }
  }

  async getVoucherByIdWithLines(id: number): Promise<(ReceivingVoucher & { lines: ReceivingLine[] }) | null> {
    const [voucher] = await db
      .select()
      .from(receivingVouchers)
      .where(eq(receivingVouchers.id, id));

    if (!voucher) return null;

    const lines = await db
      .select()
      .from(receivingLines)
      .where(eq(receivingLines.voucherId, id));

    // Return voucher properties spread with lines array (frontend expects flattened structure)
    return { ...voucher, lines };
  }

  async getReceivingStats(): Promise<{
    totalVouchers: number;
    totalLines: number;
    totalCost: number;
    uniqueStores: number;
    uniqueVendors: number;
  }> {
    const [voucherStats] = await db
      .select({
        totalVouchers: count(receivingVouchers.id),
        totalCost: sum(receivingVouchers.correctedTotal),
        uniqueStores: sql<number>`COUNT(DISTINCT ${receivingVouchers.store})`,
        uniqueVendors: sql<number>`COUNT(DISTINCT ${receivingVouchers.vendor})`,
      })
      .from(receivingVouchers);
    
    const [lineStats] = await db
      .select({
        totalLines: count(receivingLines.id),
      })
      .from(receivingLines);
    
    return {
      totalVouchers: voucherStats.totalVouchers,
      totalLines: lineStats.totalLines,
      totalCost: parseFloat(voucherStats.totalCost?.toString() || '0'),
      uniqueStores: voucherStats.uniqueStores,
      uniqueVendors: voucherStats.uniqueVendors,
    };
  }

  async deleteReceivingVoucher(id: number): Promise<boolean> {
    const result = await db.delete(receivingVouchers).where(eq(receivingVouchers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllReceivingVouchers(): Promise<number> {
    const result = await db.delete(receivingVouchers);
    return result.rowCount || 0;
  }

  // Inventory Turnover Methods
  async getInventoryTurnoverMetrics(): Promise<{
    totalInventoryValue: number;
    totalInventoryUnits: number;
    deadStockValue: number;
    deadStockUnits: number;
    avgDaysSinceLastSale: number;
    daysSinceMostRecentSale: number | null;
  }> {
    const result = await db
      .select({
        totalInventoryValue: sql<number>`COALESCE(SUM(CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC)), 0)`,
        totalInventoryUnits: sql<number>`COALESCE(SUM(${itemList.availQty}), 0)`,
        deadStockValue: sql<number>`COALESCE(SUM(CASE WHEN ${itemList.lastSold} IS NULL OR ${itemList.lastSold} < CURRENT_DATE - INTERVAL '90 days' THEN CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC) ELSE 0 END), 0)`,
        deadStockUnits: sql<number>`COALESCE(SUM(CASE WHEN ${itemList.lastSold} IS NULL OR ${itemList.lastSold} < CURRENT_DATE - INTERVAL '90 days' THEN ${itemList.availQty} ELSE 0 END), 0)`,
        avgDaysSinceLastSale: sql<number>`COALESCE(AVG(CASE WHEN ${itemList.lastSold} IS NOT NULL THEN (CURRENT_DATE - ${itemList.lastSold}) ELSE NULL END), 0)`,
        daysSinceMostRecentSale: sql<number>`(CURRENT_DATE - MAX(${itemList.lastSold}))`,
      })
      .from(itemList)
      .where(sql`${itemList.availQty} > 0`);

    return result[0] || {
      totalInventoryValue: 0,
      totalInventoryUnits: 0,
      deadStockValue: 0,
      deadStockUnits: 0,
      avgDaysSinceLastSale: 0,
      daysSinceMostRecentSale: null,
    };
  }

  async getSlowMovingStock(daysThreshold: number = 90, limit: number = 100): Promise<Array<{
    itemNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    availQty: number;
    orderCost: string | null;
    inventoryValue: number;
    lastSold: string | null;
    daysSinceLastSale: number | null;
    stockStatus: string;
  }>> {
    const result = await db
      .select({
        itemNumber: itemList.itemNumber,
        itemName: itemList.itemName,
        category: itemList.category,
        vendorName: itemList.vendorName,
        availQty: itemList.availQty,
        orderCost: itemList.orderCost,
        inventoryValue: sql<number>`CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC)`,
        lastSold: itemList.lastSold,
        daysSinceLastSale: sql<number>`(CURRENT_DATE - ${itemList.lastSold})`,
        stockStatus: sql<string>`CASE 
          WHEN ${itemList.lastSold} IS NULL THEN 'Never Sold'
          WHEN ${itemList.lastSold} < CURRENT_DATE - INTERVAL '180 days' THEN 'Dead Stock'
          WHEN ${itemList.lastSold} < CURRENT_DATE - INTERVAL '90 days' THEN 'Slow Moving'
          ELSE 'Normal'
        END`,
      })
      .from(itemList)
      .where(
        and(
          sql`${itemList.availQty} > 0`,
          or(
            sql`${itemList.lastSold} IS NULL`,
            sql`${itemList.lastSold} < CURRENT_DATE - INTERVAL '${sql.raw(daysThreshold.toString())} days'`
          )
        )
      )
      .orderBy(sql`(CURRENT_DATE - ${itemList.lastSold}) DESC NULLS FIRST`)
      .limit(limit);

    return result.map(row => ({
      ...row,
      itemNumber: row.itemNumber || '',
      itemName: row.itemName || '',
      availQty: row.availQty || 0,
      inventoryValue: Number(row.inventoryValue) || 0,
    }));
  }

  async getOverstockUnderstockAnalysis(
    daysRange: number = 30,
    limit: number = 100,
    overstockThreshold: number = 90,
    understockThreshold: number = 7
  ): Promise<Array<{
    itemNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    availQty: number;
    orderCost: string | null;
    inventoryValue: number;
    unitsSold: number;
    avgDailySales: number;
    daysOfSupply: number;
    stockStatus: string;
  }>> {
    const result = await db
      .select({
        itemNumber: itemList.itemNumber,
        itemName: itemList.itemName,
        category: itemList.category,
        vendorName: itemList.vendorName,
        availQty: itemList.availQty,
        orderCost: itemList.orderCost,
        inventoryValue: sql<number>`CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC)`,
        unitsSold: sql<number>`COALESCE(COUNT(DISTINCT ${salesTransactions.id}), 0)`,
      })
      .from(itemList)
      .leftJoin(
        salesTransactions,
        and(
          sql`${salesTransactions.sku} = ${itemList.itemNumber}`,
          sql`${salesTransactions.date} >= CURRENT_DATE - INTERVAL '${sql.raw(daysRange.toString())} days'`
        )
      )
      .where(sql`${itemList.availQty} > 0`)
      .groupBy(
        itemList.itemNumber,
        itemList.itemName,
        itemList.category,
        itemList.vendorName,
        itemList.availQty,
        itemList.orderCost
      )
      .limit(limit);

    return result.map(row => {
      const avgDailySales = Number(row.unitsSold) / daysRange;
      const daysOfSupply = avgDailySales > 0 ? (row.availQty || 0) / avgDailySales : 999;

      let stockStatus = 'Normal';
      if (daysOfSupply > overstockThreshold) {
        stockStatus = 'Overstock';
      } else if (daysOfSupply < understockThreshold && avgDailySales > 0) {
        stockStatus = 'Understock';
      } else if (avgDailySales === 0 && (row.availQty || 0) > 0) {
        stockStatus = 'No Sales';
      }

      return {
        itemNumber: row.itemNumber || '',
        itemName: row.itemName || '',
        category: row.category,
        vendorName: row.vendorName,
        availQty: row.availQty || 0,
        orderCost: row.orderCost,
        inventoryValue: Number(row.inventoryValue) || 0,
        unitsSold: Number(row.unitsSold),
        avgDailySales: Number(avgDailySales.toFixed(2)),
        daysOfSupply: Number(daysOfSupply.toFixed(1)),
        stockStatus,
      };
    });
  }

  async getCategoryInventoryAnalysis(daysRange: number = 30): Promise<Array<{
    category: string;
    totalInventoryValue: number;
    totalUnits: number;
    totalItemsCount: number;
    totalSales: number;
    avgTurnoverRate: number;
  }>> {
    const result = await db
      .select({
        category: sql<string>`COALESCE(${itemList.category}, 'Uncategorized')`,
        totalInventoryValue: sql<number>`COALESCE(SUM(CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC)), 0)`,
        totalUnits: sql<number>`COALESCE(SUM(${itemList.availQty}), 0)`,
        totalItemsCount: sql<number>`COUNT(DISTINCT ${itemList.itemNumber})`,
        totalSales: sql<number>`COALESCE(COUNT(DISTINCT ${salesTransactions.id}), 0)`,
      })
      .from(itemList)
      .leftJoin(
        salesTransactions,
        and(
          sql`${salesTransactions.sku} = ${itemList.itemNumber}`,
          sql`${salesTransactions.date} >= CURRENT_DATE - INTERVAL '${sql.raw(daysRange.toString())} days'`
        )
      )
      .where(sql`${itemList.availQty} > 0`)
      .groupBy(sql`COALESCE(${itemList.category}, 'Uncategorized')`);

    return result.map(row => ({
      category: row.category,
      totalInventoryValue: Number(row.totalInventoryValue) || 0,
      totalUnits: Number(row.totalUnits) || 0,
      totalItemsCount: Number(row.totalItemsCount) || 0,
      totalSales: Number(row.totalSales) || 0,
      avgTurnoverRate: Number(row.totalUnits) > 0 ? Number((Number(row.totalSales) / Number(row.totalUnits) * 100).toFixed(2)) : 0,
    }));
  }

  // Helper: Check if item is a sellable product (filters non-products)
  private isSellableProduct(category: string | null, itemName: string | null): boolean {
    // Non-sellable categories
    const nonSellableCategories = [
      'Supplies', 'Cleaning Supplies', 'System', 'Refund',
      'Shipping', 'GIFT CARD', 'Certificate', 'Printer', 'Electronic'
    ];

    if (category && nonSellableCategories.includes(category)) {
      return false;
    }

    // Non-sellable item name patterns
    if (!itemName) return true;

    const lowerName = itemName.toLowerCase();
    const nonSellablePatterns = [
      'tax', 'discount', 'shipping insurance', 'shipping protection',
      'route shipping', 'refund', 'adjustment', 'online discount taken'
    ];

    return !nonSellablePatterns.some(pattern => lowerName.includes(pattern));
  }

  // Style-level Inventory Turnover Methods (OPTIMIZED - Single CTE Query)
  async getStyleInventoryMetrics(): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    gender: string | null;
    totalActiveQty: number;
    totalClosedStoresQty: number;
    avgOrderCost: number;
    avgSellingPrice: number;
    avgMarginPercent: number;
    inventoryValue: number;
    classification: string;
    seasonalPattern: string;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    receiveCount: number;
    stockStatus: string;
  }>> {
    // OPTIMIZED: Single CTE-based query with sales data for smart dead stock calculation
    const result = await db.execute(sql`
      WITH base_styles AS (
        SELECT
          il.style_number AS "styleNumber",
          MAX(il.item_name) AS "itemName",
          MAX(il.category) AS "category",
          MAX(il.vendor_name) AS "vendorName",
          MAX(il.gender) AS "gender",
          SUM(COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) + COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0) + COALESCE(il.hq_qty, 0)) AS "totalActiveQty",
          SUM(COALESCE(il.mm_qty, 0) + COALESCE(il.pm_qty, 0)) AS "totalClosedStoresQty",
          AVG(CAST(COALESCE(il.order_cost, '0') AS NUMERIC)) AS "avgOrderCost",
          AVG(CAST(COALESCE(il.selling_price, '0') AS NUMERIC)) AS "avgSellingPrice",
          SUM((COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) + COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0) + COALESCE(il.hq_qty, 0)) * CAST(COALESCE(il.order_cost, '0') AS NUMERIC)) AS "inventoryValue",
          MIN(il.creation_date::date) AS "creationDate"
        FROM item_list il
        WHERE il.style_number IS NOT NULL 
          AND il.style_number <> ''
          AND (COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) + COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0) + COALESCE(il.hq_qty, 0)) > 0
          AND COALESCE(il.category, '') NOT IN ('Supplies', 'Cleaning Supplies', 'System', 'Refund', 'Shipping', 'GIFT CARD', 'Certificate', 'Printer', 'Electronic')
          AND (
            il.item_name IS NULL 
            OR (
              LOWER(il.item_name) NOT LIKE '%tax%'
              AND LOWER(il.item_name) NOT LIKE '%discount%'
              AND LOWER(il.item_name) NOT LIKE '%shipping insurance%'
              AND LOWER(il.item_name) NOT LIKE '%shipping protection%'
              AND LOWER(il.item_name) NOT LIKE '%route shipping%'
              AND LOWER(il.item_name) NOT LIKE '%refund%'
              AND LOWER(il.item_name) NOT LIKE '%adjustment%'
              AND LOWER(il.item_name) NOT LIKE '%online discount taken%'
            )
          )
        GROUP BY il.style_number
      ),
      receiving_counts AS (
        SELECT 
          il.style_number AS "styleNumber",
          COUNT(DISTINCT rv.id) AS "receiveCount",
          SUM(CASE WHEN EXTRACT(MONTH FROM rv.date) IN (6, 7, 8) THEN 1 ELSE 0 END) AS "summerReceives",
          SUM(CASE WHEN EXTRACT(MONTH FROM rv.date) IN (12, 1, 2) THEN 1 ELSE 0 END) AS "winterReceives",
          COUNT(*) AS "totalReceives",
          SUM(rl.qty) AS "totalReceived",
          MIN(rv.date::date) AS "firstReceivedDate",
          MAX(rv.date::date) AS "lastReceivedDate"
        FROM receiving_lines rl
        JOIN receiving_vouchers rv ON rl.voucher_id = rv.id
        JOIN item_list il ON rl.item_number = il.item_number
        WHERE il.style_number IS NOT NULL AND il.style_number <> ''
        GROUP BY il.style_number
      ),
      sales_metrics AS (
        SELECT
          il.style_number AS "styleNumber",
          MAX(st.date::date) AS "lastSaleDate",
          COUNT(CASE WHEN st.date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS "units30d",
          COUNT(CASE WHEN st.date >= CURRENT_DATE - INTERVAL '60 days' THEN 1 END) AS "units60d",
          COUNT(CASE WHEN st.date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) AS "units90d",
          COUNT(*) AS "totalUnits"
        FROM sales_transactions st
        JOIN item_list il ON st.sku = il.item_number
        WHERE il.style_number IS NOT NULL AND il.style_number <> ''
          AND st.store IN ('GM', 'HM', 'NM', 'LM')
        GROUP BY il.style_number
      )
      SELECT 
        bs."styleNumber",
        bs."itemName",
        bs.category,
        bs."vendorName",
        bs.gender,
        bs."totalActiveQty",
        bs."totalClosedStoresQty",
        bs."avgOrderCost",
        bs."avgSellingPrice",
        CASE 
          WHEN bs."avgSellingPrice" > 0 THEN ROUND(((bs."avgSellingPrice" - bs."avgOrderCost") / NULLIF(bs."avgSellingPrice", 0)) * 100, 2)
          ELSE 0
        END AS "avgMarginPercent",
        bs."inventoryValue",
        COALESCE(rc."lastReceivedDate", bs."creationDate") AS "lastReceived",
        COALESCE(bs."creationDate", rc."firstReceivedDate") AS "firstReceived",
        CASE 
          WHEN COALESCE(rc."lastReceivedDate", bs."creationDate") IS NOT NULL 
          THEN (CURRENT_DATE - COALESCE(rc."lastReceivedDate", bs."creationDate"))
          ELSE NULL
        END AS "daysSinceLastReceive",
        CASE 
          WHEN COALESCE(bs."creationDate", rc."firstReceivedDate") IS NOT NULL 
          THEN (CURRENT_DATE - COALESCE(bs."creationDate", rc."firstReceivedDate"))
          ELSE NULL
        END AS "daysSinceFirstReceive",
        COALESCE(rc."receiveCount", 0) AS "receiveCount",
        COALESCE(rc."summerReceives", 0) AS "summerReceives",
        COALESCE(rc."winterReceives", 0) AS "winterReceives",
        COALESCE(rc."totalReceives", 0) AS "totalReceives",
        COALESCE(rc."totalReceived", 0) AS "totalReceived",
        sm."lastSaleDate",
        COALESCE(sm."units30d", 0) AS "units30d",
        COALESCE(sm."units60d", 0) AS "units60d",
        COALESCE(sm."units90d", 0) AS "units90d",
        COALESCE(sm."totalUnits", 0) AS "totalUnits",
        CASE WHEN bs."creationDate" IS NULL THEN true ELSE false END AS "usedReceivingFallback"
      FROM base_styles bs
      LEFT JOIN receiving_counts rc ON bs."styleNumber" = rc."styleNumber"
      LEFT JOIN sales_metrics sm ON bs."styleNumber" = sm."styleNumber"
    `);

    // Post-process results to add classification and seasonal pattern
    const rows = result.rows as Array<{
      styleNumber: string;
      itemName: string;
      category: string | null;
      vendorName: string | null;
      gender: string | null;
      totalActiveQty: number;
      totalClosedStoresQty: number;
      avgOrderCost: number;
      avgSellingPrice: number;
      avgMarginPercent: number;
      inventoryValue: number;
      lastReceived: string | null;
      firstReceived: string | null;
      daysSinceLastReceive: number | null;
      daysSinceFirstReceive: number | null;
      receiveCount: number;
      summerReceives: number;
      winterReceives: number;
      totalReceives: number;
      totalReceived: number;
      lastSaleDate: string | null;
      units30d: number;
      units60d: number;
      units90d: number;
      totalUnits: number;
      usedReceivingFallback: boolean;
    }>;

    return rows.map(row => {
      // Classification based on receiving frequency
      let classification = 'One-Time';
      if (row.receiveCount >= 40) classification = 'Core High';
      else if (row.receiveCount >= 10) classification = 'Core Medium';
      else if (row.receiveCount >= 6) classification = 'Core Low';
      else if (row.receiveCount >= 2) classification = 'Non-Core Repeat';

      // Seasonal pattern detection
      let seasonalPattern = 'Unknown';
      if (row.totalReceives > 0) {
        const summerPct = row.summerReceives / row.totalReceives;
        const winterPct = row.winterReceives / row.totalReceives;

        const itemNameLower = (row.itemName || '').toLowerCase();
        const summerKeywords = ['short', 'tank', 'summer', 'swim', 'sandal'];
        const winterKeywords = ['jacket', 'coat', 'hoodie', 'winter', 'fleece', 'sweater'];

        if (summerPct > 0.6 || summerKeywords.some(kw => itemNameLower.includes(kw))) {
          seasonalPattern = 'Summer';
        } else if (winterPct > 0.6 || winterKeywords.some(kw => itemNameLower.includes(kw))) {
          seasonalPattern = 'Winter';
        } else if (row.receiveCount >= 6) {
          seasonalPattern = 'Year-Round';
        } else {
          seasonalPattern = 'Spring/Fall';
        }
      }

      // Smart stock status based on classification and sales activity
      let stockStatus = 'Active';
      const daysSinceLastReceive = row.daysSinceLastReceive;
      const daysSinceFirstReceive = row.daysSinceFirstReceive;
      const units60d = Number(row.units60d) || 0;
      const units90d = Number(row.units90d) || 0;
      const units30d = Number(row.units30d) || 0;
      const totalReceived = Number(row.totalReceived) || 1; // Avoid division by zero
      const currentStock = Number(row.totalActiveQty);
      
      // Calculate average monthly sales velocity (using 90-day window)
      const monthlyVelocity = (units90d / 90) * 30;
      
      // Check if seasonal (before other status checks)
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const isSummer = currentMonth >= 6 && currentMonth <= 8;
      const isWinter = currentMonth === 12 || currentMonth <= 2;
      const isOffSeason = 
        (seasonalPattern === 'Summer' && !isSummer) ||
        (seasonalPattern === 'Winter' && !isWinter);
      
      if (daysSinceLastReceive === null) {
        stockStatus = 'Never Received';
      } else if (daysSinceLastReceive < 30) {
        stockStatus = 'New Arrival';
      } else if (isOffSeason) {
        stockStatus = 'Seasonal Hold';
      } else if (classification.startsWith('Core')) {
        // Core items: Dead stock if not selling despite recent receives OR excess stock vs velocity OR low sell-through
        const recentlyReceived = daysSinceLastReceive <= 90;
        const notSelling = units60d === 0;
        const excessStock = monthlyVelocity > 0 && currentStock > monthlyVelocity * 3; // More than 3 months of supply
        const lowSellThrough = currentStock > totalReceived * 0.65; // More than 65% still in stock
        
        if (notSelling && recentlyReceived) {
          stockStatus = 'Dead Stock'; // Core item not selling despite being bought recently 🚨
        } else if (excessStock && daysSinceLastReceive > 60) {
          stockStatus = 'Dead Stock'; // Core item with > 3 months supply at current velocity
        } else if (notSelling && lowSellThrough && daysSinceLastReceive > 60) {
          stockStatus = 'Dead Stock'; // Core item with poor sell-through
        } else if (units60d < 2 && daysSinceLastReceive > 60) {
          stockStatus = 'Slow Moving'; // Very slow movement for a core item
        }
      } else if (classification === 'Non-Core Repeat' || classification === 'One-Time') {
        // Non-core items: Dead stock if old and not selling through
        const hadTimeToSell = daysSinceFirstReceive && daysSinceFirstReceive > 180;
        const notSelling = units90d === 0;
        const poorSellThrough = currentStock > totalReceived * 0.5; // More than 50% still in stock
        
        if (hadTimeToSell && notSelling && poorSellThrough) {
          stockStatus = 'Dead Stock'; // Old non-core item not selling through
        } else if (classification === 'One-Time' && daysSinceLastReceive > 180 && units90d === 0) {
          stockStatus = 'Expected One-Time'; // One-time purchase that didn't sell
        } else if (units90d < 2 && daysSinceFirstReceive && daysSinceFirstReceive > 90) {
          stockStatus = 'Slow Moving'; // Slow movement for non-core
        }
      }

      return {
        styleNumber: row.styleNumber || '',
        itemName: row.itemName || '',
        category: row.category,
        vendorName: row.vendorName,
        gender: row.gender,
        totalActiveQty: Number(row.totalActiveQty),
        totalClosedStoresQty: Number(row.totalClosedStoresQty),
        avgOrderCost: Number(Number(row.avgOrderCost).toFixed(2)),
        avgSellingPrice: Number(Number(row.avgSellingPrice).toFixed(2)),
        avgMarginPercent: Number(Number(row.avgMarginPercent).toFixed(2)),
        inventoryValue: Number(Number(row.inventoryValue).toFixed(2)),
        classification,
        seasonalPattern,
        lastReceived: row.lastReceived,
        daysSinceLastReceive,
        receiveCount: Number(row.receiveCount),
        stockStatus,
      };
    });
  }

  async getStyleSlowMoving(limit: number = 100): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    inventoryValue: number;
    avgMarginPercent: number;
    classification: string;
    seasonalPattern: string;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    stockStatus: string;
  }>> {
    const allStyles = await this.getStyleInventoryMetrics();

    // Filter for slow-moving or dead stock
    const slowMoving = allStyles.filter(
      style => style.stockStatus === 'Dead Stock' || style.stockStatus === 'Slow Moving'
    );

    // Sort by inventory value descending (highest value dead stock first)
    slowMoving.sort((a, b) => b.inventoryValue - a.inventoryValue);

    return slowMoving.slice(0, limit);
  }

  async getStyleOverstockUnderstock(
    daysRange: number = 30,
    limit: number = 100
  ): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    inventoryValue: number;
    avgMarginPercent: number;
    unitsSold: number;
    avgDailySales: number;
    daysOfSupply: number;
    classification: string;
    stockStatus: string;
  }>> {
    // OPTIMIZED: Get all styles with their metrics in one call
    const allStyles = await this.getStyleInventoryMetrics();

    // OPTIMIZED: Get sales data for ALL styles in a single query
    const salesByStyle = await db
      .select({
        styleNumber: itemList.styleNumber,
        itemName: itemList.itemName,
        unitsSold: sql<number>`COUNT(DISTINCT ${salesTransactions.id})`,
      })
      .from(salesTransactions)
      .innerJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .where(
        sql`${salesTransactions.date} >= CURRENT_DATE - INTERVAL '${sql.raw(daysRange.toString())} days'`
      )
      .groupBy(itemList.styleNumber, itemList.itemName);

    // Create a map for quick lookup
    const salesMap = new Map(
      salesByStyle.map(s => [`${s.styleNumber}|${s.itemName}`, Number(s.unitsSold)])
    );

    // Calculate metrics for all styles
    const stylesWithSales = allStyles.map(style => {
      const key = `${style.styleNumber}|${style.itemName}`;
      const unitsSold = salesMap.get(key) || 0;
      const avgDailySales = unitsSold / daysRange;
      const daysOfSupply = avgDailySales > 0 ? style.totalActiveQty / avgDailySales : 999;

      let stockStatus = 'Normal';
      if (daysOfSupply > 90) {
        stockStatus = 'Overstock';
      } else if (daysOfSupply < 7 && avgDailySales > 0) {
        stockStatus = 'Understock';
      } else if (avgDailySales === 0 && style.totalActiveQty > 0) {
        stockStatus = 'No Sales';
      }

      return {
        styleNumber: style.styleNumber,
        itemName: style.itemName,
        category: style.category,
        vendorName: style.vendorName,
        totalActiveQty: style.totalActiveQty,
        inventoryValue: style.inventoryValue,
        avgMarginPercent: style.avgMarginPercent,
        unitsSold,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        daysOfSupply: Number(daysOfSupply.toFixed(1)),
        classification: style.classification,
        stockStatus,
      };
    });

    // Filter for overstock or understock
    const filtered = stylesWithSales.filter(
      s => s.stockStatus === 'Overstock' || s.stockStatus === 'Understock'
    );

    // Sort by priority: Understock (high margin) > Overstock (low margin)
    filtered.sort((a, b) => {
      if (a.stockStatus === 'Understock' && b.stockStatus !== 'Understock') return -1;
      if (a.stockStatus !== 'Understock' && b.stockStatus === 'Understock') return 1;
      return b.avgMarginPercent - a.avgMarginPercent;
    });

    return filtered.slice(0, limit);
  }

  async getTransferRecommendations(limit: number = 50): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    fromStore: string;
    toStore: string;
    fromStoreQty: number;
    toStoreQty: number;
    fromStoreDailySales: number;
    toStoreDailySales: number;
    recommendedQty: number;
    priority: string;
    avgMarginPercent: number;
  }>> {
    // Get all styles with per-store quantities
    const stylesWithStoreData = await db
      .select({
        styleNumber: itemList.styleNumber,
        itemName: itemList.itemName,
        category: itemList.category,
        vendorName: itemList.vendorName,
        gmQty: sql<number>`SUM(COALESCE(${itemList.gmQty}, 0))`,
        hmQty: sql<number>`SUM(COALESCE(${itemList.hmQty}, 0))`,
        nmQty: sql<number>`SUM(COALESCE(${itemList.nmQty}, 0))`,
        lmQty: sql<number>`SUM(COALESCE(${itemList.lmQty}, 0))`,
        avgOrderCost: sql<number>`AVG(CAST(COALESCE(${itemList.orderCost}, '0') AS NUMERIC))`,
        avgSellingPrice: sql<number>`AVG(CAST(COALESCE(${itemList.sellingPrice}, '0') AS NUMERIC))`,
      })
      .from(itemList)
      .where(sql`
        ${itemList.styleNumber} IS NOT NULL
        AND ${itemList.styleNumber} != ''
      `)
      .groupBy(
        itemList.styleNumber,
        itemList.itemName,
        itemList.category,
        itemList.vendorName
      );

    // Calculate per-location sales velocities for the last 30 days (active stores only: GM, HM, NM, LM)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const salesVelocityData = await db
      .select({
        styleNumber: itemList.styleNumber,
        store: salesTransactions.store,
        salesCount: sql<number>`COUNT(${salesTransactions.id})`,
        avgDailySales: sql<number>`COUNT(${salesTransactions.id})::numeric / 30.0`,
      })
      .from(salesTransactions)
      .innerJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .where(
        and(
          sql`${itemList.styleNumber} IS NOT NULL`,
          gte(salesTransactions.date, thirtyDaysAgo.toISOString().split('T')[0]),
          sql`${salesTransactions.store} IN ('GM', 'HM', 'NM', 'LM')`
        )
      )
      .groupBy(itemList.styleNumber, salesTransactions.store);

    // Build a map: styleNumber -> { storeName -> avgDailySales }
    const velocityMap = new Map<string, Map<string, number>>();
    for (const row of salesVelocityData) {
      if (!row.styleNumber) continue;
      
      if (!velocityMap.has(row.styleNumber)) {
        velocityMap.set(row.styleNumber, new Map());
      }
      const storeMap = velocityMap.get(row.styleNumber)!;
      storeMap.set(row.store || '', Number(row.avgDailySales) || 0);
    }

    const recommendations: Array<{
      styleNumber: string;
      itemName: string;
      category: string | null;
      fromStore: string;
      toStore: string;
      fromStoreQty: number;
      toStoreQty: number;
      fromStoreDailySales: number;
      toStoreDailySales: number;
      recommendedQty: number;
      priority: string;
      avgMarginPercent: number;
    }> = [];

    // For each style, compare store velocities and identify transfer opportunities
    for (const style of stylesWithStoreData) {
      if (!style.styleNumber) continue;
      
      const stores = [
        { name: 'GM', qty: style.gmQty },
        { name: 'HM', qty: style.hmQty },
        { name: 'NM', qty: style.nmQty },
        { name: 'LM', qty: style.lmQty },
      ];

      // Get sales velocities for this style
      const storeVelocities = velocityMap.get(style.styleNumber) || new Map();

      // Calculate margin percent
      const avgOrderCost = Number(style.avgOrderCost) || 0;
      const avgSellingPrice = Number(style.avgSellingPrice) || 0;
      const avgMarginPercent = avgSellingPrice > 0
        ? ((avgSellingPrice - avgOrderCost) / avgSellingPrice) * 100
        : 0;

      // Find transfer opportunities: high velocity store with low/no stock should get from low velocity store with excess stock
      for (let i = 0; i < stores.length; i++) {
        for (let j = 0; j < stores.length; j++) {
          if (i === j) continue;
          
          const fromStore = stores[i];
          const toStore = stores[j];
          const fromVelocity = storeVelocities.get(fromStore.name) || 0;
          const toVelocity = storeVelocities.get(toStore.name) || 0;

          // Criteria for transfer recommendation:
          // 1. "To" store is selling faster than "from" store (toVelocity > fromVelocity)
          // 2. "From" store has excess stock (qty > 5 units)
          // 3. "To" store has low stock relative to its velocity
          // 4. Either: "to" store is selling but low on stock, OR "from" store has stock but not selling
          
          const fromStockSufficient = fromStore.qty > 5;
          const toStoreNeedsMore = toVelocity > 0 && (toStore.qty < toVelocity * 7); // Less than 7 days supply
          const velocityGap = toVelocity > fromVelocity && toVelocity > 0.1; // Meaningful velocity difference
          
          if (fromStockSufficient && (toStoreNeedsMore || velocityGap)) {
            // Calculate recommended transfer quantity
            // Transfer enough to cover ~14 days of supply at the "to" store, but not more than 50% of "from" store stock
            const targetSupplyDays = 14;
            const recommendedByVelocity = Math.ceil(toVelocity * targetSupplyDays);
            const maxFromHalf = Math.floor(fromStore.qty / 2);
            const recommendedQty = Math.min(recommendedByVelocity, maxFromHalf, 20); // Cap at 20 units

            if (recommendedQty >= 1) {
              // Determine priority based on velocity gap and margin
              let priority = 'Low';
              if (toVelocity > fromVelocity * 2 && avgMarginPercent > 50) {
                priority = 'High'; // Much faster selling + high margin
              } else if (toVelocity > fromVelocity * 1.5 || avgMarginPercent > 60) {
                priority = 'Medium';
              }

              recommendations.push({
                styleNumber: style.styleNumber,
                itemName: style.itemName || '',
                category: style.category,
                fromStore: fromStore.name,
                toStore: toStore.name,
                fromStoreQty: fromStore.qty,
                toStoreQty: toStore.qty,
                fromStoreDailySales: Number(fromVelocity.toFixed(2)),
                toStoreDailySales: Number(toVelocity.toFixed(2)),
                recommendedQty,
                priority,
                avgMarginPercent: Number(avgMarginPercent.toFixed(2)),
              });
            }
          }
        }
      }
    }

    // Sort by priority (High > Medium > Low) then by velocity gap (highest first)
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
      // Sort by velocity gap (larger gap = higher priority)
      const aGap = a.toStoreDailySales - a.fromStoreDailySales;
      const bGap = b.toStoreDailySales - b.fromStoreDailySales;
      return bGap - aGap;
    });

    return recommendations.slice(0, limit);
  }

  async getTransferRecommendationsWithSKUs(limit: number = 50): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    fromStore: string;
    toStore: string;
    fromStoreQty: number;
    toStoreQty: number;
    fromStoreDailySales: number;
    toStoreDailySales: number;
    recommendedQty: number;
    priority: string;
    avgMarginPercent: number;
    skuDetails: Array<{
      sku: string;
      color: string | null;
      size: string | null;
      fromStoreQty: number;
      toStoreQty: number;
    }>;
  }>> {
    // Get all SKUs with per-store quantities and style information
    const skusWithData = await db
      .select({
        sku: itemList.itemNumber,
        styleNumber: itemList.styleNumber,
        itemName: itemList.itemName,
        category: itemList.category,
        size: itemList.size,
        attribute: itemList.attribute,
        gmQty: itemList.gmQty,
        hmQty: itemList.hmQty,
        nmQty: itemList.nmQty,
        lmQty: itemList.lmQty,
        orderCost: itemList.orderCost,
        sellingPrice: itemList.sellingPrice,
      })
      .from(itemList)
      .where(sql`
        ${itemList.styleNumber} IS NOT NULL
        AND ${itemList.styleNumber} != ''
        AND ${itemList.itemNumber} IS NOT NULL
      `);

    // Calculate per-SKU sales velocities for the last 30 days (active stores only)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesVelocityData = await db
      .select({
        sku: salesTransactions.sku,
        store: salesTransactions.store,
        salesCount: sql<number>`COUNT(${salesTransactions.id})`,
        avgDailySales: sql<number>`COUNT(${salesTransactions.id})::numeric / 30.0`,
      })
      .from(salesTransactions)
      .where(
        and(
          gte(salesTransactions.date, thirtyDaysAgo.toISOString().split('T')[0]),
          sql`${salesTransactions.store} IN ('GM', 'HM', 'NM', 'LM')`,
          sql`${salesTransactions.sku} IS NOT NULL`
        )
      )
      .groupBy(salesTransactions.sku, salesTransactions.store);

    // Build velocity map: sku -> { storeName -> avgDailySales }
    const skuVelocityMap = new Map<string, Map<string, number>>();
    for (const row of salesVelocityData) {
      if (!row.sku) continue;

      if (!skuVelocityMap.has(row.sku)) {
        skuVelocityMap.set(row.sku, new Map());
      }
      const storeMap = skuVelocityMap.get(row.sku)!;
      storeMap.set(row.store || '', Number(row.avgDailySales) || 0);
    }

    // Group SKUs by style
    const styleGroups = new Map<string, typeof skusWithData>();
    for (const sku of skusWithData) {
      if (!sku.styleNumber) continue;

      if (!styleGroups.has(sku.styleNumber)) {
        styleGroups.set(sku.styleNumber, []);
      }
      styleGroups.get(sku.styleNumber)!.push(sku);
    }

    // Helper function to parse color from attribute field
    const parseColor = (attribute: string | null): string | null => {
      if (!attribute) return null;
      // Attribute format is typically "Color: Black" or just "Black"
      const match = attribute.match(/(?:Color:\s*)?(.+)/i);
      return match ? match[1].trim() : attribute.trim();
    };

    const recommendations: Array<{
      styleNumber: string;
      itemName: string;
      category: string | null;
      fromStore: string;
      toStore: string;
      fromStoreQty: number;
      toStoreQty: number;
      fromStoreDailySales: number;
      toStoreDailySales: number;
      recommendedQty: number;
      priority: string;
      avgMarginPercent: number;
      skuDetails: Array<{
        sku: string;
        color: string | null;
        size: string | null;
        fromStoreQty: number;
        toStoreQty: number;
      }>;
    }> = [];

    // For each style, calculate aggregated store quantities and velocities
    for (const [styleNumber, skus] of Array.from(styleGroups.entries())) {
      // Aggregate quantities by store
      const storeQtyMap = new Map<string, number>([
        ['GM', 0], ['HM', 0], ['NM', 0], ['LM', 0]
      ]);

      for (const sku of skus) {
        storeQtyMap.set('GM', (storeQtyMap.get('GM') || 0) + (Number(sku.gmQty) || 0));
        storeQtyMap.set('HM', (storeQtyMap.get('HM') || 0) + (Number(sku.hmQty) || 0));
        storeQtyMap.set('NM', (storeQtyMap.get('NM') || 0) + (Number(sku.nmQty) || 0));
        storeQtyMap.set('LM', (storeQtyMap.get('LM') || 0) + (Number(sku.lmQty) || 0));
      }

      // Aggregate velocities by store
      const storeVelocityMap = new Map<string, number>([
        ['GM', 0], ['HM', 0], ['NM', 0], ['LM', 0]
      ]);

      for (const sku of skus) {
        const skuVelocities = skuVelocityMap.get(sku.sku || '') || new Map();
        for (const store of ['GM', 'HM', 'NM', 'LM']) {
          const velocity = skuVelocities.get(store) || 0;
          storeVelocityMap.set(store, (storeVelocityMap.get(store) || 0) + velocity);
        }
      }

      // Calculate average margin
      const avgOrderCost = skus.reduce((sum: number, sku) => sum + (Number(sku.orderCost) || 0), 0) / skus.length;
      const avgSellingPrice = skus.reduce((sum: number, sku) => sum + (Number(sku.sellingPrice) || 0), 0) / skus.length;
      const avgMarginPercent = avgSellingPrice > 0
        ? ((avgSellingPrice - avgOrderCost) / avgSellingPrice) * 100
        : 0;

      const stores = [
        { name: 'GM', qty: storeQtyMap.get('GM') || 0 },
        { name: 'HM', qty: storeQtyMap.get('HM') || 0 },
        { name: 'NM', qty: storeQtyMap.get('NM') || 0 },
        { name: 'LM', qty: storeQtyMap.get('LM') || 0 },
      ];

      // Find transfer opportunities
      for (let i = 0; i < stores.length; i++) {
        for (let j = 0; j < stores.length; j++) {
          if (i === j) continue;

          const fromStore = stores[i];
          const toStore = stores[j];
          const fromVelocity = storeVelocityMap.get(fromStore.name) || 0;
          const toVelocity = storeVelocityMap.get(toStore.name) || 0;

          const fromStockSufficient = fromStore.qty > 5;
          const toStoreNeedsMore = toVelocity > 0 && (toStore.qty < toVelocity * 7);
          const velocityGap = toVelocity > fromVelocity && toVelocity > 0.1;

          if (fromStockSufficient && (toStoreNeedsMore || velocityGap)) {
            const targetSupplyDays = 14;
            const recommendedByVelocity = Math.ceil(toVelocity * targetSupplyDays);
            const maxFromHalf = Math.floor(fromStore.qty / 2);
            const recommendedQty = Math.min(recommendedByVelocity, maxFromHalf, 20);

            if (recommendedQty >= 1) {
              let priority = 'Low';
              if (toVelocity > fromVelocity * 2 && avgMarginPercent > 50) {
                priority = 'High';
              } else if (toVelocity > fromVelocity * 1.5 || avgMarginPercent > 60) {
                priority = 'Medium';
              }

              // Build SKU details for this transfer recommendation
              const skuDetails = skus.map((sku: typeof skusWithData[0]) => {
                const color = parseColor(sku.attribute);
                const size = sku.size;

                let fromStoreQty = 0;
                let toStoreQty = 0;

                if (fromStore.name === 'GM') fromStoreQty = Number(sku.gmQty) || 0;
                else if (fromStore.name === 'HM') fromStoreQty = Number(sku.hmQty) || 0;
                else if (fromStore.name === 'NM') fromStoreQty = Number(sku.nmQty) || 0;
                else if (fromStore.name === 'LM') fromStoreQty = Number(sku.lmQty) || 0;

                if (toStore.name === 'GM') toStoreQty = Number(sku.gmQty) || 0;
                else if (toStore.name === 'HM') toStoreQty = Number(sku.hmQty) || 0;
                else if (toStore.name === 'NM') toStoreQty = Number(sku.nmQty) || 0;
                else if (toStore.name === 'LM') toStoreQty = Number(sku.lmQty) || 0;

                return {
                  sku: sku.sku || '',
                  color,
                  size,
                  fromStoreQty,
                  toStoreQty,
                };
              }).filter((detail: { sku: string; color: string | null; size: string | null; fromStoreQty: number; toStoreQty: number }) => detail.fromStoreQty > 0 || detail.toStoreQty > 0); // Only include SKUs with relevant quantities

              recommendations.push({
                styleNumber,
                itemName: skus[0]?.itemName || '',
                category: skus[0]?.category || null,
                fromStore: fromStore.name,
                toStore: toStore.name,
                fromStoreQty: fromStore.qty,
                toStoreQty: toStore.qty,
                fromStoreDailySales: Number(fromVelocity.toFixed(2)),
                toStoreDailySales: Number(toVelocity.toFixed(2)),
                recommendedQty,
                priority,
                avgMarginPercent: Number(avgMarginPercent.toFixed(2)),
                skuDetails,
              });
            }
          }
        }
      }
    }

    // Sort by priority then velocity gap
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
      const aGap = a.toStoreDailySales - a.fromStoreDailySales;
      const bGap = b.toStoreDailySales - b.fromStoreDailySales;
      return bGap - aGap;
    });

    return recommendations.slice(0, limit);
  }

  async getRestockingRecommendations(limit: number = 50): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    avgDailySales: number;
    daysOfSupply: number;
    classification: string;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    avgMarginPercent: number;
    recommendedOrderQty: number;
    priority: string;
  }>> {
    // Get settings from database instead of hardcoded values
    const settings = await this.getInventorySettings();
    const salesPeriodDays = settings.salesAnalysisPeriodDays;
    const urgencyThresholdDays = settings.restockUrgencyThresholdDays;

    const stylesWithSales = await this.getStyleOverstockUnderstock(salesPeriodDays, 500);
    const allStyles = await this.getStyleInventoryMetrics();

    // Create a map for quick lookup
    const styleMap = new Map(
      allStyles.map(s => [`${s.styleNumber}|${s.itemName}`, s])
    );

    const recommendations = stylesWithSales
      .filter(style => {
        // Only recommend restocking for items that are selling and running low
        const hasClassification = (
          style.classification === 'Core High' ||
          style.classification === 'Core Medium' ||
          style.classification === 'Core Low'
        );

        // Allow urgent items (0 days supply) even without classification
        const isUrgent = style.daysOfSupply === 0;

        return (
          style.daysOfSupply < urgencyThresholdDays &&
          style.avgDailySales > 0 &&
          (hasClassification || isUrgent)
        );
      })
      .map(style => {
        const fullStyle = styleMap.get(`${style.styleNumber}|${style.itemName}`);

        // Calculate recommended order quantity based on classification
        let recommendedOrderQty = 0;
        if (style.classification === 'Core High') {
          recommendedOrderQty = Math.ceil(style.avgDailySales * 30); // 30 days supply
        } else if (style.classification === 'Core Medium') {
          recommendedOrderQty = Math.ceil(style.avgDailySales * 21); // 21 days supply
        } else if (style.classification === 'Core Low') {
          recommendedOrderQty = Math.ceil(style.avgDailySales * 14); // 14 days supply
        } else {
          // Default for unclassified items: 14 days supply
          recommendedOrderQty = Math.ceil(style.avgDailySales * 14);
        }

        // Determine priority
        let priority = 'Low';
        if (
          style.classification === 'Core High' &&
          style.daysOfSupply < 14 &&
          style.avgMarginPercent >= 60
        ) {
          priority = 'High';
        } else if (
          (style.classification === 'Core High' || style.classification === 'Core Medium') &&
          style.daysOfSupply < 14
        ) {
          priority = 'Medium';
        } else if (style.avgDailySales > 0 && style.daysOfSupply < 7) {
          priority = 'Medium';
        }

        return {
          styleNumber: style.styleNumber,
          itemName: style.itemName,
          category: style.category,
          vendorName: style.vendorName,
          totalActiveQty: style.totalActiveQty,
          avgDailySales: style.avgDailySales,
          daysOfSupply: style.daysOfSupply,
          classification: style.classification,
          lastReceived: fullStyle?.lastReceived || null,
          daysSinceLastReceive: fullStyle?.daysSinceLastReceive || null,
          avgMarginPercent: style.avgMarginPercent,
          recommendedOrderQty,
          priority,
        };
      })
      .sort((a, b) => {
        // Sort by priority then by margin
        const priorityOrder = { High: 1, Medium: 2, Low: 3 };
        if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        }
        return b.avgMarginPercent - a.avgMarginPercent;
      });

    return recommendations.slice(0, limit);
  }

  async getStylesNeedingRestock(limit: number = 50): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    usesPrepacks: boolean;
    totalActiveQty: number;
    avgDailySales: number;
    daysOfSupply: number;
    lastReceived: string | null;
    daysSinceLastReceive: number | null;
    recommendedOrderQty: number;
    urgency: string;
  }>> {
    // Get all styles with inventory levels and vendor info
    const stylesWithInventory = await db
      .select({
        styleNumber: itemList.styleNumber,
        itemName: itemList.itemName,
        category: itemList.category,
        vendorName: itemList.vendorName,
        totalActiveQty: sql<number>`SUM(COALESCE(${itemList.gmQty}, 0) + COALESCE(${itemList.hmQty}, 0) + COALESCE(${itemList.nmQty}, 0) + COALESCE(${itemList.lmQty}, 0))`,
      })
      .from(itemList)
      .where(sql`
        ${itemList.styleNumber} IS NOT NULL
        AND ${itemList.styleNumber} != ''
        AND ${itemList.vendorName} IS NOT NULL
      `)
      .groupBy(
        itemList.styleNumber,
        itemList.itemName,
        itemList.category,
        itemList.vendorName
      );

    // Get vendor configurations to check which vendors use prepacks
    const vendorConfigs = await db
      .select({
        vendorName: vendorConfigurations.vendorName,
        usesPrepacks: vendorConfigurations.usesPrepacks,
      })
      .from(vendorConfigurations);

    const vendorPrepackMap = new Map<string, boolean>();
    for (const config of vendorConfigs) {
      vendorPrepackMap.set(config.vendorName || '', config.usesPrepacks || false);
    }

    // Calculate sales velocities for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesVelocityData = await db
      .select({
        styleNumber: itemList.styleNumber,
        salesCount: sql<number>`COUNT(${salesTransactions.id})`,
        avgDailySales: sql<number>`COUNT(${salesTransactions.id})::numeric / 30.0`,
      })
      .from(salesTransactions)
      .innerJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .where(
        and(
          sql`${itemList.styleNumber} IS NOT NULL`,
          gte(salesTransactions.date, thirtyDaysAgo.toISOString().split('T')[0])
        )
      )
      .groupBy(itemList.styleNumber);

    const velocityMap = new Map<string, number>();
    for (const row of salesVelocityData) {
      if (row.styleNumber) {
        velocityMap.set(row.styleNumber, Number(row.avgDailySales) || 0);
      }
    }

    // Get last received dates
    const lastReceivedData = await db
      .select({
        styleNumber: itemList.styleNumber,
        lastReceived: sql<string>`MAX(${receivingVouchers.date})`,
      })
      .from(receivingVouchers)
      .innerJoin(receivingLines, eq(receivingVouchers.id, receivingLines.voucherId))
      .innerJoin(itemList, eq(receivingLines.itemNumber, itemList.itemNumber))
      .where(sql`${itemList.styleNumber} IS NOT NULL`)
      .groupBy(itemList.styleNumber);

    const lastReceivedMap = new Map<string, string>();
    for (const row of lastReceivedData) {
      if (row.styleNumber && row.lastReceived) {
        lastReceivedMap.set(row.styleNumber, row.lastReceived);
      }
    }

    const recommendations: Array<{
      styleNumber: string;
      itemName: string;
      category: string | null;
      vendorName: string | null;
      usesPrepacks: boolean;
      totalActiveQty: number;
      avgDailySales: number;
      daysOfSupply: number;
      lastReceived: string | null;
      daysSinceLastReceive: number | null;
      recommendedOrderQty: number;
      urgency: string;
    }> = [];

    const today = new Date();

    for (const style of stylesWithInventory) {
      if (!style.styleNumber || !style.vendorName) continue;

      // Only include vendors that use prepacks
      const usesPrepacks = vendorPrepackMap.get(style.vendorName) || false;
      if (!usesPrepacks) continue;

      const totalActiveQty = Number(style.totalActiveQty) || 0;
      const avgDailySales = velocityMap.get(style.styleNumber) || 0;

      // Calculate days of supply
      const daysOfSupply = avgDailySales > 0 ? totalActiveQty / avgDailySales : 999;

      // Only recommend restock if days of supply is low
      if (daysOfSupply > 30) continue;

      // Calculate last received info
      const lastReceived = lastReceivedMap.get(style.styleNumber) || null;
      let daysSinceLastReceive: number | null = null;
      if (lastReceived) {
        const lastReceivedDate = new Date(lastReceived);
        daysSinceLastReceive = Math.floor((today.getTime() - lastReceivedDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate recommended order quantity (30 days of supply)
      const recommendedOrderQty = Math.max(
        Math.ceil(avgDailySales * 30) - totalActiveQty,
        0
      );

      // Determine urgency
      let urgency = 'Low';
      if (daysOfSupply < 7) {
        urgency = 'Critical';
      } else if (daysOfSupply < 14) {
        urgency = 'High';
      } else if (daysOfSupply < 21) {
        urgency = 'Medium';
      }

      recommendations.push({
        styleNumber: style.styleNumber,
        itemName: style.itemName || '',
        category: style.category,
        vendorName: style.vendorName,
        usesPrepacks,
        totalActiveQty,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        daysOfSupply: Number(daysOfSupply.toFixed(1)),
        lastReceived,
        daysSinceLastReceive,
        recommendedOrderQty,
        urgency,
      });
    }

    // Sort by urgency (Critical > High > Medium > Low) then by days of supply (lowest first)
    const urgencyOrder = { Critical: 1, High: 2, Medium: 3, Low: 4 };
    recommendations.sort((a, b) => {
      if (urgencyOrder[a.urgency as keyof typeof urgencyOrder] !== urgencyOrder[b.urgency as keyof typeof urgencyOrder]) {
        return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
      }
      return a.daysOfSupply - b.daysOfSupply;
    });

    return recommendations.slice(0, limit);
  }

  async getSaleRecommendations(limit: number = 50): Promise<Array<{
    styleNumber: string;
    itemName: string;
    category: string | null;
    vendorName: string | null;
    totalActiveQty: number;
    inventoryValue: number;
    daysSinceLastSale: number | null;
    daysSinceLastReceive: number | null;
    unitsSold90d: number;
    avgCost: number;
    avgPrice: number;
    avgMarginPercent: number;
    classification: string;
    seasonalPattern: string;
    suggestedDiscountPercent: number;
    discountedPrice: number;
    projectedRecovery: number;
    reason: string;
    priority: string;
  }>> {
    const allStyles = await this.getStyleInventoryMetrics();
    
    // Get sales data:
    // - unitsSold90d: Count sales in last 90 days only
    // - lastSaleDate: Most recent sale across ALL time (not just 90 days)
    // - Filter to active stores only: GM, HM, NM, LM (exclude MM, PM, HQ)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const salesData = await db
      .select({
        styleNumber: itemList.styleNumber,
        totalSold: sql<number>`COALESCE(COUNT(CASE WHEN ${salesTransactions.date} >= ${ninetyDaysAgo.toISOString().split('T')[0]}::date THEN 1 END), 0)`,
        lastSaleDate: sql<string | null>`MAX(${salesTransactions.date})`,
      })
      .from(salesTransactions)
      .innerJoin(itemList, eq(salesTransactions.sku, itemList.itemNumber))
      .where(
        and(
          sql`${itemList.styleNumber} IS NOT NULL`,
          sql`${salesTransactions.store} IN ('GM', 'HM', 'NM', 'LM')`
        )
      )
      .groupBy(itemList.styleNumber);
    
    const salesMap = new Map(
      salesData.map(s => [
        s.styleNumber || '', 
        { 
          totalSold: s.totalSold, 
          lastSaleDate: s.lastSaleDate 
        }
      ])
    );
    
    const recommendations: Array<{
      styleNumber: string;
      itemName: string;
      category: string | null;
      vendorName: string | null;
      totalActiveQty: number;
      inventoryValue: number;
      daysSinceLastSale: number | null;
      daysSinceLastReceive: number | null;
      unitsSold90d: number;
      avgCost: number;
      avgPrice: number;
      avgMarginPercent: number;
      classification: string;
      seasonalPattern: string;
      suggestedDiscountPercent: number;
      discountedPrice: number;
      projectedRecovery: number;
      reason: string;
      priority: string;
    }> = [];

    for (const style of allStyles) {
      const salesInfo = salesMap.get(style.styleNumber);
      const unitsSold90d = salesInfo?.totalSold || 0;
      const lastSaleDate = salesInfo?.lastSaleDate || null;
      
      // Skip if no inventory value
      if (style.inventoryValue <= 0) continue;
      
      // Criteria for sale recommendations
      let shouldRecommend = false;
      let reason = '';
      let suggestedDiscountPercent = 0;
      let priority = 'Low';
      
      // 1. Dead stock - no sales in 90 days and old inventory
      if (
        unitsSold90d === 0 &&
        style.daysSinceLastReceive !== null &&
        style.daysSinceLastReceive > 180 &&
        style.stockStatus !== 'Seasonal Hold'
      ) {
        shouldRecommend = true;
        reason = 'Dead stock - No sales in 90+ days, inventory 180+ days old';
        
        if (style.daysSinceLastReceive > 365) {
          suggestedDiscountPercent = 75;
          priority = 'High';
        } else {
          suggestedDiscountPercent = 50;
          priority = 'Medium';
        }
      }
      
      // 2. Seasonal items past their season with no recent sales
      else if (
        style.seasonalPattern &&
        style.seasonalPattern !== 'None' &&
        style.stockStatus !== 'Seasonal Hold' &&
        unitsSold90d < 3
      ) {
        const currentMonth = new Date().getMonth() + 1;
        const summerMonths = [4, 5, 6, 7, 8];
        const winterMonths = [10, 11, 12, 1, 2];
        
        const isOffSeason = 
          (style.seasonalPattern === 'Summer' && !summerMonths.includes(currentMonth)) ||
          (style.seasonalPattern === 'Winter' && !winterMonths.includes(currentMonth));
        
        if (isOffSeason && style.daysSinceLastReceive && style.daysSinceLastReceive > 180) {
          shouldRecommend = true;
          reason = `${style.seasonalPattern} item - Off-season with minimal sales`;
          suggestedDiscountPercent = 40;
          priority = 'Medium';
        }
      }
      
      // 3. Overstock - high inventory value but very slow sales
      else if (
        style.inventoryValue > 1000 &&
        unitsSold90d > 0 &&
        unitsSold90d < 5 &&
        style.daysSinceLastReceive !== null &&
        style.daysSinceLastReceive > 90
      ) {
        shouldRecommend = true;
        reason = 'Overstock - High inventory value with very slow sales';
        suggestedDiscountPercent = 30;
        priority = style.inventoryValue > 2000 ? 'High' : 'Medium';
      }
      
      // 4. Low margin items blocking capital
      else if (
        style.inventoryValue > 500 &&
        style.avgMarginPercent < 40 &&
        unitsSold90d < 3 &&
        style.daysSinceLastReceive !== null &&
        style.daysSinceLastReceive > 120
      ) {
        shouldRecommend = true;
        reason = 'Low margin with slow movement - Blocking working capital';
        suggestedDiscountPercent = 25;
        priority = 'Low';
      }
      
      if (shouldRecommend) {
        const discountedPrice = style.avgSellingPrice * (1 - suggestedDiscountPercent / 100);
        const projectedRecovery = discountedPrice * style.totalActiveQty;
        
        // Calculate days since last sale if we have the date
        let daysSinceLastSale: number | null = null;
        if (lastSaleDate) {
          const lastSale = new Date(lastSaleDate);
          const today = new Date();
          daysSinceLastSale = Math.floor((today.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        recommendations.push({
          styleNumber: style.styleNumber,
          itemName: style.itemName,
          category: style.category,
          vendorName: style.vendorName,
          totalActiveQty: style.totalActiveQty,
          inventoryValue: style.inventoryValue,
          daysSinceLastSale,
          daysSinceLastReceive: style.daysSinceLastReceive,
          unitsSold90d,
          avgCost: style.avgOrderCost,
          avgPrice: style.avgSellingPrice,
          avgMarginPercent: style.avgMarginPercent,
          classification: style.classification,
          seasonalPattern: style.seasonalPattern || 'None',
          suggestedDiscountPercent,
          discountedPrice: Number(discountedPrice.toFixed(2)),
          projectedRecovery: Number(projectedRecovery.toFixed(2)),
          reason,
          priority,
        });
      }
    }
    
    // Sort by priority (High > Medium > Low), then by inventory value (highest first), 
    // then by days since last receive (oldest first) for stable deterministic ordering
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    recommendations.sort((a, b) => {
      // Primary: Priority
      if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
      // Secondary: Inventory value (highest first)
      if (Math.abs(b.inventoryValue - a.inventoryValue) > 0.01) {
        return b.inventoryValue - a.inventoryValue;
      }
      // Tertiary: Days since last receive (oldest first for tie-breaking)
      const aDays = a.daysSinceLastReceive || 0;
      const bDays = b.daysSinceLastReceive || 0;
      return bDays - aDays;
    });
    
    return recommendations.slice(0, Math.min(limit, 200)); // Cap at 200 for protection
  }

  async getProductSegmentationReport(): Promise<{
    metadata: {
      generatedDate: string;
      totalStyles: number;
      totalActiveInventoryValue: number;
      analysisDateRange: string;
    };
    segments: {
      bestSellers: Array<any>;
      coreHighFrequency: Array<any>;
      coreMediumFrequency: Array<any>;
      coreLowFrequency: Array<any>;
      nonCoreRepeat: Array<any>;
      oneTimePurchase: Array<any>;
      newArrivals: Array<any>;
      summerItems: Array<any>;
      winterItems: Array<any>;
      clearanceCandidates: Array<any>;
    };
  }> {
    const allStyles = await this.getStyleInventoryMetrics();

    // Get sales data for the last 30 and 90 days
    const salesDataResult = await db.execute(sql`
      WITH style_sales AS (
        SELECT 
          il.style_number,
          COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - INTERVAL '30 days') AS sales_30d,
          COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - INTERVAL '90 days') AS sales_90d,
          MAX(st.date) AS last_sale_date
        FROM item_list il
        LEFT JOIN sales_transactions st ON st.sku = il.item_number
        WHERE il.style_number IS NOT NULL AND il.style_number <> ''
        GROUP BY il.style_number
      )
      SELECT * FROM style_sales
    `);

    const salesData = new Map(
      (salesDataResult.rows as Array<{ style_number: string; sales_30d: number; sales_90d: number; last_sale_date: string | null }>)
        .map(row => [row.style_number, row])
    );

    // Helper functions for Google Ads fields
    const generateProductTitle = (style: any): string => {
      const parts = [];
      if (style.vendorName) parts.push(style.vendorName);
      
      const productType = (style.itemName || '')
        .replace(/\b(mens|womens|unisex|men's|women's)\b/gi, '')
        .trim();
      parts.push(productType);
      
      return parts.join(' - ').substring(0, 150);
    };

    const generateKeywords = (style: any): string[] => {
      const keywords = new Set<string>();
      
      if (style.vendorName) {
        keywords.add(style.vendorName.toLowerCase());
        if (style.category) {
          keywords.add(`${style.vendorName.toLowerCase()} ${style.category.toLowerCase()}`);
        }
      }
      
      const words = (style.itemName || '').toLowerCase().split(/\s+/);
      words.filter((w: string) => w.length > 3).forEach((w: string) => keywords.add(w));
      
      if (style.category) keywords.add(style.category.toLowerCase());
      if (style.gender) keywords.add(style.gender.toLowerCase());
      
      const sales = salesData.get(style.styleNumber);
      if (sales && sales.sales_30d >= 10) {
        keywords.add('popular');
        keywords.add('best seller');
        keywords.add('trending');
      }
      
      if (style.daysSinceLastReceive !== null && style.daysSinceLastReceive < 60) {
        keywords.add('new');
        keywords.add('latest');
        keywords.add('just arrived');
      }
      
      if (style.seasonalPattern === 'Summer') {
        keywords.add('summer');
        keywords.add('warm weather');
      } else if (style.seasonalPattern === 'Winter') {
        keywords.add('winter');
        keywords.add('cold weather');
      }
      
      return Array.from(keywords).slice(0, 20);
    };

    const mapToGoogleCategory = (category: string | null): string => {
      if (!category) return 'Apparel & Accessories';
      
      const categoryLower = category.toLowerCase();
      if (categoryLower.includes('pant') || categoryLower.includes('jean')) {
        return 'Apparel & Accessories > Clothing > Pants';
      } else if (categoryLower.includes('shirt') || categoryLower.includes('tee') || categoryLower.includes('top')) {
        return 'Apparel & Accessories > Clothing > Shirts & Tops';
      } else if (categoryLower.includes('jacket') || categoryLower.includes('coat')) {
        return 'Apparel & Accessories > Clothing > Outerwear';
      } else if (categoryLower.includes('shoe') || categoryLower.includes('sneaker')) {
        return 'Apparel & Accessories > Shoes';
      } else if (categoryLower.includes('hat') || categoryLower.includes('cap') || categoryLower.includes('beanie')) {
        return 'Apparel & Accessories > Clothing Accessories > Hats';
      } else if (categoryLower.includes('hoodie') || categoryLower.includes('sweatshirt')) {
        return 'Apparel & Accessories > Clothing > Activewear';
      }
      
      return 'Apparel & Accessories';
    };

    const calculatePriority = (style: any, sales: any): number => {
      if (sales && sales.sales_30d >= 10) return 5; // Best sellers
      if (style.classification === 'Core High') return 4;
      if (style.daysSinceLastReceive !== null && style.daysSinceLastReceive < 30) return 4; // New arrivals
      if (style.classification === 'Core Medium') return 3;
      if (style.classification === 'Core Low') return 2;
      return 1;
    };

    const getBudgetTier = (style: any, sales: any): string => {
      if (sales && sales.sales_30d >= 10) return 'High';
      if (style.classification === 'Core High' || style.classification === 'Core Medium') return 'Medium';
      if (style.daysSinceLastReceive !== null && style.daysSinceLastReceive < 30) return 'Medium';
      return 'Low';
    };

    const getSegmentName = (style: any, sales: any): string => {
      if (sales && sales.sales_30d >= 10) return 'Best Seller';
      if (style.daysSinceLastReceive !== null && style.daysSinceLastReceive < 60) return 'New Arrival';
      if (style.classification.startsWith('Core')) return style.classification;
      if (style.stockStatus === 'Dead Stock' || (style.daysSinceLastReceive !== null && style.daysSinceLastReceive > 180 && (!sales || sales.sales_90d === 0))) {
        return 'Clearance';
      }
      return 'Standard';
    };

    // Enrich all styles with Google Ads fields
    const enrichedStyles = allStyles.map(style => {
      const sales = salesData.get(style.styleNumber);
      const salesVelocity = sales ? sales.sales_30d / 30 : 0;
      
      return {
        ...style,
        unitsSold30d: sales?.sales_30d || 0,
        unitsSold90d: sales?.sales_90d || 0,
        salesVelocity,
        lastSaleDate: sales?.last_sale_date || null,
        productTitle: generateProductTitle(style),
        keywords: generateKeywords(style),
        googleCategory: mapToGoogleCategory(style.category),
        priority: calculatePriority(style, sales),
        budgetTier: getBudgetTier(style, sales),
        segment: getSegmentName(style, sales),
        marginPerUnit: style.avgSellingPrice - style.avgOrderCost,
      };
    });

    const totalActiveInventoryValue = enrichedStyles.reduce((sum, s) => sum + s.inventoryValue, 0);

    return {
      metadata: {
        generatedDate: new Date().toISOString(),
        totalStyles: enrichedStyles.length,
        totalActiveInventoryValue,
        analysisDateRange: 'Last 90 days',
      },
      segments: {
        bestSellers: enrichedStyles
          .filter(s => s.unitsSold30d >= 10)
          .sort((a, b) => b.unitsSold30d - a.unitsSold30d),
        coreHighFrequency: enrichedStyles
          .filter(s => s.classification === 'Core High')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        coreMediumFrequency: enrichedStyles
          .filter(s => s.classification === 'Core Medium')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        coreLowFrequency: enrichedStyles
          .filter(s => s.classification === 'Core Low')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        nonCoreRepeat: enrichedStyles
          .filter(s => s.classification === 'Non-Core Repeat')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        oneTimePurchase: enrichedStyles
          .filter(s => s.classification === 'One-Time')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        newArrivals: enrichedStyles
          .filter(s => s.daysSinceLastReceive !== null && s.daysSinceLastReceive < 60)
          .sort((a, b) => (a.daysSinceLastReceive || 0) - (b.daysSinceLastReceive || 0)),
        summerItems: enrichedStyles
          .filter(s => s.seasonalPattern === 'Summer')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        winterItems: enrichedStyles
          .filter(s => s.seasonalPattern === 'Winter')
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
        clearanceCandidates: enrichedStyles
          .filter(s => {
            const oldStock = s.daysSinceLastReceive !== null && s.daysSinceLastReceive > 180;
            const noSales = s.unitsSold90d === 0;
            return oldStock && noSales && s.stockStatus !== 'Seasonal Hold';
          })
          .sort((a, b) => b.inventoryValue - a.inventoryValue),
      },
    };
  }

  // ML Settings Log operations
  async createMLSettingsLog(log: InsertMLSettingsLog): Promise<MLSettingsLog> {
    const [result] = await db.insert(mlSettingsLog).values(log).returning();
    return result;
  }

  async getMLSettingsLogs(limit: number = 50): Promise<MLSettingsLog[]> {
    const logs = await db
      .select()
      .from(mlSettingsLog)
      .orderBy(desc(mlSettingsLog.createdAt))
      .limit(limit);
    return logs;
  }

  // Item Receiving Metrics operations
  async getReceivingMetrics(styleNumber: string): Promise<ItemReceivingMetrics | undefined> {
    const [result] = await db
      .select()
      .from(itemReceivingMetrics)
      .where(eq(itemReceivingMetrics.styleNumber, styleNumber))
      .limit(1);
    return result;
  }

  async getAllReceivingMetrics(filters?: {
    lifecycle?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ metrics: ItemReceivingMetrics[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = db.select().from(itemReceivingMetrics);

    if (filters?.lifecycle) {
      query = query.where(eq(itemReceivingMetrics.lifecycleStage, filters.lifecycle)) as any;
    }

    const metrics = await query
      .orderBy(desc(itemReceivingMetrics.lastCalculatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(itemReceivingMetrics)
      .where(filters?.lifecycle ? eq(itemReceivingMetrics.lifecycleStage, filters.lifecycle) : sql`1=1`);

    return { metrics, total };
  }

  async upsertReceivingMetrics(metrics: InsertItemReceivingMetrics): Promise<ItemReceivingMetrics> {
    const [result] = await db
      .insert(itemReceivingMetrics)
      .values(metrics)
      .onConflictDoUpdate({
        target: itemReceivingMetrics.styleNumber,
        set: {
          ...metrics,
          lastCalculatedAt: sql`NOW()`
        }
      })
      .returning();
    return result;
  }

  async batchUpsertReceivingMetrics(metrics: InsertItemReceivingMetrics[]): Promise<void> {
    if (metrics.length === 0) return;

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      await db
        .insert(itemReceivingMetrics)
        .values(batch)
        .onConflictDoUpdate({
          target: itemReceivingMetrics.styleNumber,
          set: {
            itemNumber: sql`EXCLUDED.item_number`,
            firstReceiveDate: sql`EXCLUDED.first_receive_date`,
            lastReceiveDate: sql`EXCLUDED.last_receive_date`,
            creationDate: sql`EXCLUDED.creation_date`,
            totalReceiveCount: sql`EXCLUDED.total_receive_count`,
            uniqueReceiveMonths: sql`EXCLUDED.unique_receive_months`,
            uniqueReceiveYears: sql`EXCLUDED.unique_receive_years`,
            avgDaysBetweenReceives: sql`EXCLUDED.avg_days_between_receives`,
            daysSinceFirstReceive: sql`EXCLUDED.days_since_first_receive`,
            daysSinceLastReceive: sql`EXCLUDED.days_since_last_receive`,
            isNewItem: sql`EXCLUDED.is_new_item`,
            isRestockedItem: sql`EXCLUDED.is_restocked_item`,
            isSeasonalItem: sql`EXCLUDED.is_seasonal_item`,
            isOneTimeBuy: sql`EXCLUDED.is_one_time_buy`,
            isCoreItem: sql`EXCLUDED.is_core_item`,
            lifecycleStage: sql`EXCLUDED.lifecycle_stage`,
            // Multi-dimensional metrics (Phase 2)
            totalSalesCount: sql`EXCLUDED.total_sales_count`,
            salesMonthsLastYear: sql`EXCLUDED.sales_months_last_year`,
            salesLast90days: sql`EXCLUDED.sales_last_90days`,
            daysOfSupply: sql`EXCLUDED.days_of_supply`,
            hasSeasonalSalesPattern: sql`EXCLUDED.has_seasonal_sales_pattern`,
            lastCalculatedAt: sql`NOW()`,
            calculatedBy: sql`EXCLUDED.calculated_by`
          }
        });
    }
  }

  async deleteAllReceivingMetrics(): Promise<number> {
    const result = await db.delete(itemReceivingMetrics);
    return result.rowCount || 0;
  }

  async getReceivingMetricsStats(): Promise<{
    total: number;
    byLifecycle: Record<string, number>;
    lastCalculated: Date | null;
  }> {
    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(itemReceivingMetrics);

    // Get count by lifecycle stage
    const lifecycleCounts = await db
      .select({
        lifecycle: itemReceivingMetrics.lifecycleStage,
        count: sql<number>`count(*)::int`
      })
      .from(itemReceivingMetrics)
      .groupBy(itemReceivingMetrics.lifecycleStage);

    const byLifecycle: Record<string, number> = {};
    lifecycleCounts.forEach(row => {
      if (row.lifecycle) {
        byLifecycle[row.lifecycle] = row.count;
      }
    });

    // Get last calculated timestamp
    const [lastCalc] = await db
      .select({ lastCalculated: itemReceivingMetrics.lastCalculatedAt })
      .from(itemReceivingMetrics)
      .orderBy(desc(itemReceivingMetrics.lastCalculatedAt))
      .limit(1);

    return {
      total,
      byLifecycle,
      lastCalculated: lastCalc?.lastCalculated || null
    };
  }

  // Receiving Metrics Settings operations
  async getReceivingMetricsSettings() {
    const result = await db
      .select()
      .from(receivingMetricsSettings)
      .where(eq(receivingMetricsSettings.isActive, true))
      .orderBy(desc(receivingMetricsSettings.createdAt))
      .limit(1);

    return result[0] || null;
  }

  async upsertReceivingMetricsSettings(settings: any) {
    // Mark all existing settings as inactive
    await db
      .update(receivingMetricsSettings)
      .set({ isActive: false });

    // Insert new settings
    const result = await db
      .insert(receivingMetricsSettings)
      .values({
        ...settings,
        isActive: true,
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  // Multi-Dimensional Metrics (Phase 2)
  async calculateMetricsMultidimensional(styleNumbers: string[], calculatedBy: string, settings?: any): Promise<any> {
    const { calculateMetricsForStylesMultidim } = await import("./lib/receiving-metrics-calculator-multidim");
    return await calculateMetricsForStylesMultidim(styleNumbers, calculatedBy, settings);
  }

  // ========================================
  // VENDOR CONFIGURATION OPERATIONS (Phase 0)
  // ========================================

  async getVendorConfigurations(filters?: {
    usesPrepacks?: boolean;
    limit?: number;
    offset?: number
  }): Promise<{ vendors: VendorConfiguration[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = db.select().from(vendorConfigurations);

    if (filters?.usesPrepacks !== undefined) {
      query = query.where(eq(vendorConfigurations.usesPrepacks, filters.usesPrepacks)) as any;
    }

    const vendors = await query
      .orderBy(asc(vendorConfigurations.vendorName))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendorConfigurations)
      .where(
        filters?.usesPrepacks !== undefined
          ? eq(vendorConfigurations.usesPrepacks, filters.usesPrepacks)
          : sql`1=1`
      );

    return { vendors, total };
  }

  async getVendorConfiguration(vendorName: string): Promise<VendorConfiguration | undefined> {
    const [vendor] = await db
      .select()
      .from(vendorConfigurations)
      .where(eq(vendorConfigurations.vendorName, vendorName))
      .limit(1);
    return vendor;
  }

  async createVendorConfiguration(vendor: InsertVendorConfiguration): Promise<VendorConfiguration> {
    const [created] = await db
      .insert(vendorConfigurations)
      .values({
        ...vendor,
        updatedAt: new Date()
      })
      .returning();
    return created;
  }

  async updateVendorConfiguration(
    vendorName: string,
    vendor: Partial<InsertVendorConfiguration>
  ): Promise<VendorConfiguration | undefined> {
    const [updated] = await db
      .update(vendorConfigurations)
      .set({
        ...vendor,
        updatedAt: new Date()
      })
      .where(eq(vendorConfigurations.vendorName, vendorName))
      .returning();
    return updated;
  }

  async deleteVendorConfiguration(vendorName: string): Promise<boolean> {
    const result = await db
      .delete(vendorConfigurations)
      .where(eq(vendorConfigurations.vendorName, vendorName));
    return (result.rowCount || 0) > 0;
  }

  // ========================================
  // STYLE CONFIGURATION OPERATIONS (Style-First Architecture)
  // ========================================

  async listStyleConfigurations(vendorName?: string): Promise<StyleWithPacks[]> {
    let query = db.select().from(styleConfigurations);

    if (vendorName) {
      query = query.where(eq(styleConfigurations.vendorName, vendorName)) as any;
    }

    const styles = await query.orderBy(
      asc(styleConfigurations.vendorName),
      asc(styleConfigurations.styleNumber)
    );

    // Fetch packs and distributions for each style
    const stylesWithPacks: StyleWithPacks[] = await Promise.all(
      styles.map(async (style) => {
        // Get all packs for this style
        const packs = await db
          .select()
          .from(prepackConfigurations)
          .where(eq(prepackConfigurations.styleConfigId, style.id))
          .orderBy(asc(prepackConfigurations.prepackName));

        // Get distributions for each pack
        const packsWithDistributions: PrepackWithDistributions[] = await Promise.all(
          packs.map(async (pack) => {
            const distributions = await db
              .select()
              .from(prepackSizeDistributions)
              .where(eq(prepackSizeDistributions.prepackConfigId, pack.id))
              .orderBy(asc(prepackSizeDistributions.sizeValue));

            return {
              ...pack,
              distributions
            };
          })
        );

        return {
          ...style,
          packs: packsWithDistributions
        };
      })
    );

    return stylesWithPacks;
  }

  async getStyleConfiguration(id: number): Promise<StyleWithPacks | undefined> {
    // Get style
    const [style] = await db
      .select()
      .from(styleConfigurations)
      .where(eq(styleConfigurations.id, id))
      .limit(1);

    if (!style) return undefined;

    // Get all packs for this style
    const packs = await db
      .select()
      .from(prepackConfigurations)
      .where(eq(prepackConfigurations.styleConfigId, id))
      .orderBy(asc(prepackConfigurations.prepackName));

    // Get distributions for each pack
    const packsWithDistributions: PrepackWithDistributions[] = await Promise.all(
      packs.map(async (pack) => {
        const distributions = await db
          .select()
          .from(prepackSizeDistributions)
          .where(eq(prepackSizeDistributions.prepackConfigId, pack.id))
          .orderBy(asc(prepackSizeDistributions.sizeValue));

        return {
          ...pack,
          distributions
        };
      })
    );

    return {
      ...style,
      packs: packsWithDistributions
    };
  }

  async createStyleConfiguration(style: InsertStyleConfiguration): Promise<StyleConfiguration> {
    const [created] = await db
      .insert(styleConfigurations)
      .values({
        ...style,
        updatedAt: new Date()
      })
      .returning();

    return created;
  }

  async updateStyleConfiguration(
    id: number,
    style: Partial<InsertStyleConfiguration>
  ): Promise<StyleConfiguration | undefined> {
    const [updated] = await db
      .update(styleConfigurations)
      .set({
        ...style,
        updatedAt: new Date()
      })
      .where(eq(styleConfigurations.id, id))
      .returning();

    return updated;
  }

  async deleteStyleConfiguration(id: number): Promise<boolean> {
    // Cascade delete will automatically remove associated packs and their distributions
    const result = await db
      .delete(styleConfigurations)
      .where(eq(styleConfigurations.id, id));

    return (result.rowCount || 0) > 0;
  }

  // ========================================
  // PREPACK CONFIGURATION OPERATIONS (Style-First Architecture)
  // ========================================

  async getPrepackConfigurations(filters?: {
    vendorName?: string;
    styleNumber?: string;
    styleConfigId?: number;
  }): Promise<PrepackConfiguration[]> {
    let query = db.select().from(prepackConfigurations);

    const conditions = [];

    // Support legacy vendorName/styleNumber filters by joining with styleConfigurations
    if (filters?.vendorName || filters?.styleNumber) {
      // This will be a join query - implement after migration
      console.warn('Legacy vendorName/styleNumber filters not fully supported yet. Use styleConfigId instead.');
    }

    if (filters?.styleConfigId) {
      conditions.push(eq(prepackConfigurations.styleConfigId, filters.styleConfigId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(asc(prepackConfigurations.prepackName));
  }

  async getPrepackConfigurationWithDistributions(id: number): Promise<PrepackWithDistributions | undefined> {
    const [config] = await db
      .select()
      .from(prepackConfigurations)
      .where(eq(prepackConfigurations.id, id))
      .limit(1);

    if (!config) return undefined;

    const distributions = await db
      .select()
      .from(prepackSizeDistributions)
      .where(eq(prepackSizeDistributions.prepackConfigId, id))
      .orderBy(asc(prepackSizeDistributions.sizeValue));

    return { ...config, distributions };
  }

  async createPrepackConfiguration(
    prepack: InsertPrepackConfiguration,
    distributions: InsertPrepackSizeDistribution[]
  ): Promise<PrepackWithDistributions> {
    // Create the prepack configuration
    const [config] = await db
      .insert(prepackConfigurations)
      .values({
        ...prepack,
        updatedAt: new Date()
      })
      .returning();

    // Calculate percentages and insert distributions
    const distributionsWithPercentage = distributions.map(dist => ({
      ...dist,
      prepackConfigId: config.id,
      percentage: prepack.piecesPerBox
        ? ((dist.quantity / prepack.piecesPerBox) * 100).toFixed(2)
        : null
    }));

    const createdDistributions = await db
      .insert(prepackSizeDistributions)
      .values(distributionsWithPercentage)
      .returning();

    return { ...config, distributions: createdDistributions };
  }

  async updatePrepackConfiguration(
    id: number,
    prepack: Partial<InsertPrepackConfiguration>,
    distributions?: InsertPrepackSizeDistribution[]
  ): Promise<PrepackWithDistributions | undefined> {
    // Update the prepack configuration
    const [config] = await db
      .update(prepackConfigurations)
      .set({
        ...prepack,
        updatedAt: new Date()
      })
      .where(eq(prepackConfigurations.id, id))
      .returning();

    if (!config) return undefined;

    // If distributions are provided, replace them
    if (distributions) {
      // Delete existing distributions
      await db
        .delete(prepackSizeDistributions)
        .where(eq(prepackSizeDistributions.prepackConfigId, id));

      // Calculate percentages and insert new distributions
      const distributionsWithPercentage = distributions.map(dist => ({
        ...dist,
        prepackConfigId: id,
        percentage: config.piecesPerBox
          ? ((dist.quantity / config.piecesPerBox) * 100).toFixed(2)
          : null
      }));

      const createdDistributions = await db
        .insert(prepackSizeDistributions)
        .values(distributionsWithPercentage)
        .returning();

      return { ...config, distributions: createdDistributions };
    }

    // If no distributions provided, return existing ones
    const existingDistributions = await db
      .select()
      .from(prepackSizeDistributions)
      .where(eq(prepackSizeDistributions.prepackConfigId, id))
      .orderBy(asc(prepackSizeDistributions.sizeValue));

    return { ...config, distributions: existingDistributions };
  }

  async deletePrepackConfiguration(id: number): Promise<boolean> {
    // Cascade delete will automatically remove size distributions
    const result = await db
      .delete(prepackConfigurations)
      .where(eq(prepackConfigurations.id, id));
    return (result.rowCount || 0) > 0;
  }

  async calculatePackCost(
    vendorName: string,
    styleNumber: string,
    sizeDistributions: Array<{ sizeValue: string; quantity: number }>
  ): Promise<{
    totalCost: string;
    averageCostPerUnit: string;
    sizeBreakdown: Array<{
      sizeValue: string;
      quantity: number;
      averageCost: string;
      subtotal: string;
      itemsFound: number;
    }>;
    totalItemsFound: number;
    totalItemsExpected: number;
  }> {
    const sizeBreakdown = await Promise.all(
      sizeDistributions.map(async (dist) => {
        // Strategy: Prioritize costs from the specified style number first,
        // then fall back to other styles from the same vendor if not found.
        // This ensures Pack E uses 8501E costs ($17) instead of averaging with 8501B ($14).

        // Step 1: Try to find items matching vendor + specified style + size
        const itemsFromStyle = await db
          .select({
            orderCost: itemList.orderCost,
            styleNumber: itemList.styleNumber,
          })
          .from(itemList)
          .where(
            and(
              eq(itemList.vendorName, vendorName),
              or(
                eq(itemList.styleNumber, styleNumber),
                eq(itemList.styleNumber2, styleNumber)
              ),
              eq(itemList.size, dist.sizeValue)
            )
          );

        // Step 2: If not found in the specified style, search across ALL styles from vendor
        let items = itemsFromStyle;
        if (items.length === 0) {
          items = await db
            .select({
              orderCost: itemList.orderCost,
              styleNumber: itemList.styleNumber,
            })
            .from(itemList)
            .where(
              and(
                eq(itemList.vendorName, vendorName),
                eq(itemList.size, dist.sizeValue)
              )
            );
        }

        // Calculate average cost for this size across all colors
        const validCosts = items
          .map(item => item.orderCost ? parseFloat(item.orderCost) : null)
          .filter(cost => cost !== null && !isNaN(cost)) as number[];

        const averageCost = validCosts.length > 0
          ? validCosts.reduce((sum, cost) => sum + cost, 0) / validCosts.length
          : 0;

        const subtotal = averageCost * dist.quantity;

        return {
          sizeValue: dist.sizeValue,
          quantity: dist.quantity,
          averageCost: averageCost.toFixed(2),
          subtotal: subtotal.toFixed(2),
          itemsFound: items.length,
        };
      })
    );

    const totalCost = sizeBreakdown.reduce(
      (sum, item) => sum + parseFloat(item.subtotal),
      0
    );

    const totalPieces = sizeDistributions.reduce(
      (sum, dist) => sum + dist.quantity,
      0
    );

    const averageCostPerUnit = totalPieces > 0 ? totalCost / totalPieces : 0;

    const totalItemsFound = sizeBreakdown.reduce(
      (sum, item) => sum + item.itemsFound,
      0
    );

    return {
      totalCost: totalCost.toFixed(2),
      averageCostPerUnit: averageCostPerUnit.toFixed(2),
      sizeBreakdown,
      totalItemsFound,
      totalItemsExpected: sizeDistributions.length,
    };
  }

  // Prepack Recommendation Logging
  async logPrepackRecommendation(log: {
    userId: string | null;
    requestLimit: number;
    stylesFound: number;
    recommendationsGenerated: number;
    recommendations: any[];
    processingTimeMs: number;
    success: boolean;
    errorMessage: string | null;
  }) {
    await db.insert(prepackRecommendationLog).values(log);
  }

  async getPrepackRecommendationLogs(limit: number = 50) {
    const logs = await db
      .select()
      .from(prepackRecommendationLog)
      .orderBy(desc(prepackRecommendationLog.createdAt))
      .limit(limit);

    return logs;
  }

  // Inventory Settings - Centralized configuration
  async getInventorySettings(): Promise<InventorySettings> {
    const settings = await db
      .select()
      .from(inventorySettings)
      .limit(1);

    // Return first row or defaults if none exist
    if (settings.length === 0) {
      const defaultSettings: InsertInventorySettings = {
        salesAnalysisPeriodDays: 90,
        restockUrgencyThresholdDays: 21,
        overstockThresholdDays: 90,
        understockThresholdDays: 7,
        transferMinStockLevel: 5,
        transferTargetDaysSupply: 14,
        createdBy: 'system'
      };

      const [created] = await db.insert(inventorySettings).values(defaultSettings).returning();
      return created;
    }

    return settings[0];
  }

  async updateInventorySettings(
    updates: UpdateInventorySettings,
    userId?: string
  ): Promise<InventorySettings> {
    const current = await this.getInventorySettings();

    const [updated] = await db
      .update(inventorySettings)
      .set({
        ...updates,
        updatedAt: new Date(),
        updatedBy: userId
      })
      .where(eq(inventorySettings.id, current.id))
      .returning();

    return updated;
  }

  // ========================================
  // PROFIT ANALYSIS METHODS
  // ========================================

  /**
   * Get summary statistics for profit analysis dashboard
   */
  async getProfitAnalysisSummary() {
    const result = await db
      .select({
        total_opportunity: sql<string>`COALESCE(SUM(${skuProfitAnalysis.profitOpportunity}), 0)`,
        critical_opportunity: sql<string>`COALESCE(SUM(CASE WHEN ${skuProfitAnalysis.urgencyLevel} = 'CRITICAL' THEN ${skuProfitAnalysis.profitOpportunity} ELSE 0 END), 0)`,
        sku_count: sql<number>`COUNT(*)`,
        avg_roi: sql<string>`COALESCE(AVG(${skuProfitAnalysis.predictedRoi}), 0)`,
        last_updated: sql<string>`MAX(${skuProfitAnalysis.analysisTimestamp})`
      })
      .from(skuProfitAnalysis)
      .where(eq(skuProfitAnalysis.isCurrent, true));

    const row = result[0];
    return {
      total_opportunity: parseFloat(row.total_opportunity) || 0,
      critical_opportunity: parseFloat(row.critical_opportunity) || 0,
      sku_count: row.sku_count || 0,
      avg_roi: parseFloat(row.avg_roi) || 0,
      last_updated: row.last_updated || new Date().toISOString()
    };
  }

  /**
   * Get filtered profit opportunities
   */
  async getProfitOpportunities(
    vendor?: string,
    color?: string,
    urgency?: string,
    limit: number = 50
  ): Promise<SkuProfitAnalysis[]> {
    const conditions = [eq(skuProfitAnalysis.isCurrent, true)];

    if (vendor && vendor !== 'all') {
      conditions.push(eq(skuProfitAnalysis.vendorName, vendor));
    }
    if (color && color !== 'all') {
      conditions.push(eq(skuProfitAnalysis.color, color));
    }
    if (urgency && urgency !== 'all') {
      conditions.push(eq(skuProfitAnalysis.urgencyLevel, urgency));
    }

    const opportunities = await db
      .select()
      .from(skuProfitAnalysis)
      .where(and(...conditions))
      .orderBy(desc(skuProfitAnalysis.profitOpportunity))
      .limit(limit);

    return opportunities;
  }

  /**
   * Get count of active SKUs (for progress tracking)
   */
  async getActiveSkuCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${skuFinancialData.sku})` })
      .from(skuFinancialData)
      .where(sql`${skuFinancialData.currentInventory} >= 0`);

    return result[0]?.count || 0;
  }

  /**
   * Recalculate profit analysis for all SKUs
   * This is a background job that updates the sku_profit_analysis table
   */
  async recalculateProfitAnalysis(
    jobId: string,
    progressCallback: (progress: {
      status: 'processing' | 'completed' | 'error';
      progress: number;
      skus_processed: number;
      total_skus: number;
      opportunities_found?: number;
      total_opportunity?: number;
      error_message?: string;
    }) => void
  ): Promise<void> {
    try {
      // Get all SKUs with financial data
      const allSkus = await db
        .select()
        .from(skuFinancialData)
        .where(sql`${skuFinancialData.currentInventory} >= 0`);

      const totalSkus = allSkus.length;
      let skusProcessed = 0;
      let opportunitiesFound = 0;
      let totalOpportunity = 0;

      // Mark all current records as not current
      await db
        .update(skuProfitAnalysis)
        .set({ isCurrent: false })
        .where(eq(skuProfitAnalysis.isCurrent, true));

      const today = new Date().toISOString().split('T')[0];

      // Process SKUs in batches
      const batchSize = 50;
      for (let i = 0; i < allSkus.length; i += batchSize) {
        const batch = allSkus.slice(i, Math.min(i + batchSize, allSkus.length));

        // Calculate profit opportunities for each SKU in batch
        const analysisRecords = batch.map((sku) => {
          // Calculate shortage (if days of supply < 30, we have a shortage)
          const targetDaysSupply = 90;
          const velocity = parseFloat(sku.velocity90d?.toString() || '0');
          const currentInventory = sku.currentInventory || 0;
          const targetQty = Math.ceil(velocity * targetDaysSupply);
          const shortageUnits = Math.max(0, targetQty - currentInventory);

          const profitPerUnit = parseFloat(sku.profitPerUnit?.toString() || '0');
          const profitOpportunity = shortageUnits * profitPerUnit;

          // Determine urgency level
          const daysOfSupply = parseFloat(sku.daysOfSupply?.toString() || '999');
          let urgencyLevel = 'HEALTHY';
          if (daysOfSupply < 14 && velocity > 0.1) {
            urgencyLevel = 'CRITICAL';
          } else if (daysOfSupply < 30) {
            urgencyLevel = 'LOW';
          } else if (daysOfSupply < 60) {
            urgencyLevel = 'MONITOR';
          } else if (daysOfSupply < 90) {
            urgencyLevel = 'GOOD';
          }

          const daysUntilStockout = velocity > 0 ? Math.floor(currentInventory / velocity) : 999;

          // Only count as opportunity if shortage > 0 and urgency is not HEALTHY
          if (shortageUnits > 0 && urgencyLevel !== 'HEALTHY') {
            opportunitiesFound++;
            totalOpportunity += profitOpportunity;
          }

          return {
            sku: sku.sku,
            styleNumber: sku.styleNumber || 'UNKNOWN',
            vendorName: sku.vendorName || 'UNKNOWN',
            color: sku.color || 'N/A',
            size: sku.size || 'N/A',
            inseam: sku.inseam || null,
            analysisDate: today,
            currentInventory: currentInventory,
            daysOfSupply: sku.daysOfSupply,
            velocity30d: sku.velocity30d,
            velocity90d: sku.velocity90d,
            velocity365d: sku.velocity365d,
            velocityTrend: 'STABLE',
            sellingPrice: sku.avgSellingPrice,
            unitCost: sku.unitCost,
            profitPerUnit: sku.profitPerUnit,
            marginPct: sku.marginPct,
            shortageUnits: shortageUnits,
            profitOpportunity: profitOpportunity.toString(),
            lostRevenuePerDay: (velocity * profitPerUnit).toString(),
            cumulativeOpportunity: (velocity * profitPerUnit * 30).toString(),
            recommendedAction: shortageUnits > 0 ? 'ORDER' : 'MONITOR',
            recommendedBoxes: null,
            recommendedPrepackName: null,
            recommendedColor: sku.color || 'N/A',
            predictedNetProfit: (profitOpportunity * 0.7).toString(), // 70% expected realization
            predictedRevenue: (shortageUnits * parseFloat(sku.avgSellingPrice?.toString() || '0')).toString(),
            predictedHoldingCost: '0',
            predictedOpportunityCost: profitOpportunity.toString(),
            predictedRoi: '0',
            profitabilityTier: profitOpportunity > 500 ? 'EXCELLENT' : profitOpportunity > 200 ? 'GOOD' : profitOpportunity > 50 ? 'MARGINAL' : 'UNPROFITABLE',
            urgencyLevel: urgencyLevel,
            daysUntilStockout: daysUntilStockout,
            stockoutRiskScore: Math.min(100, Math.max(0, 100 - daysOfSupply)).toString(),
            actualNetProfit: null,
            actualRevenue: null,
            predictionError: null,
            predictionAccuracyPct: null,
            isCurrent: true,
            notes: null
          };
        });

        // Insert batch into database
        if (analysisRecords.length > 0) {
          await db.insert(skuProfitAnalysis).values(analysisRecords);
        }

        skusProcessed += batch.length;
        const progress = Math.floor((skusProcessed / totalSkus) * 100);

        // Report progress
        progressCallback({
          status: 'processing',
          progress,
          skus_processed: skusProcessed,
          total_skus: totalSkus,
          opportunities_found: opportunitiesFound,
          total_opportunity: totalOpportunity
        });

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Report completion
      progressCallback({
        status: 'completed',
        progress: 100,
        skus_processed: totalSkus,
        total_skus: totalSkus,
        opportunities_found: opportunitiesFound,
        total_opportunity: totalOpportunity
      });

    } catch (error) {
      console.error('Recalculation error:', error);
      progressCallback({
        status: 'error',
        progress: 0,
        skus_processed: 0,
        total_skus: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ========================================
  // WAREHOUSE DISTRIBUTION FUNCTIONS
  // Network-level restocking with warehouse distribution
  // ========================================

  /**
   * Generate a distribution plan from ML recommendation
   */
  async generateDistributionPlan(data: {
    styleNumber: string;
    vendorName?: string;
    totalBoxes: number;
    totalPieces: number;
    totalCost?: number;
    orderDate?: Date;
    expectedArrivalDate?: Date;
    distributionDetails: Array<{
      phase: 'initial' | 'reserve';
      targetStore?: string;
      sku: string;
      color: string;
      size: string;
      quantity: number;
      priority?: string;
      rationale?: string;
    }>;
    createdBy?: string;
  }): Promise<{ planId: string }> {
    // Generate unique plan ID
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Insert distribution plan
    await db.insert(warehouseDistributionPlans).values({
      planId,
      styleNumber: data.styleNumber,
      vendorName: data.vendorName || null,
      totalBoxes: data.totalBoxes,
      totalPieces: data.totalPieces,
      totalCost: data.totalCost?.toString() || null,
      orderDate: data.orderDate ? data.orderDate.toISOString().split('T')[0] : null,
      expectedArrivalDate: data.expectedArrivalDate ? data.expectedArrivalDate.toISOString().split('T')[0] : null,
      status: 'pending',
      createdBy: data.createdBy || null,
    });

    // Insert distribution details
    if (data.distributionDetails.length > 0) {
      await db.insert(warehouseDistributionDetails).values(
        data.distributionDetails.map(detail => ({
          planId,
          distributionPhase: detail.phase,
          targetStore: detail.targetStore || null,
          sku: detail.sku,
          color: detail.color,
          size: detail.size,
          quantity: detail.quantity,
          priority: detail.priority || null,
          rationale: detail.rationale || null,
          status: 'planned',
        }))
      );
    }

    return { planId };
  }

  /**
   * Get a specific distribution plan by ID
   */
  async getDistributionPlan(planId: string): Promise<{
    plan: any;
    details: any[];
  } | null> {
    const [plan] = await db
      .select()
      .from(warehouseDistributionPlans)
      .where(eq(warehouseDistributionPlans.planId, planId));

    if (!plan) {
      return null;
    }

    const details = await db
      .select()
      .from(warehouseDistributionDetails)
      .where(eq(warehouseDistributionDetails.planId, planId))
      .orderBy(
        asc(warehouseDistributionDetails.distributionPhase),
        asc(warehouseDistributionDetails.targetStore)
      );

    return { plan, details };
  }

  /**
   * Get all distribution plans with optional filters
   */
  async getDistributionPlans(filters?: {
    styleNumber?: string;
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    const conditions: any[] = [];

    if (filters?.styleNumber) {
      conditions.push(eq(warehouseDistributionPlans.styleNumber, filters.styleNumber));
    }
    if (filters?.status) {
      conditions.push(eq(warehouseDistributionPlans.status, filters.status));
    }

    let query = db
      .select()
      .from(warehouseDistributionPlans)
      .orderBy(desc(warehouseDistributionPlans.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  /**
   * Update distribution plan status
   */
  async updateDistributionPlanStatus(planId: string, status: string): Promise<void> {
    await db
      .update(warehouseDistributionPlans)
      .set({ status })
      .where(eq(warehouseDistributionPlans.planId, planId));
  }

  /**
   * Mark SKU as distributed to a store
   */
  async markSkuDistributed(data: {
    planId: string;
    sku: string;
    targetStore?: string;
    status: string;
  }): Promise<void> {
    const conditions: any[] = [
      eq(warehouseDistributionDetails.planId, data.planId),
      eq(warehouseDistributionDetails.sku, data.sku)
    ];

    if (data.targetStore) {
      conditions.push(eq(warehouseDistributionDetails.targetStore, data.targetStore));
    }

    await db
      .update(warehouseDistributionDetails)
      .set({
        status: data.status,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(and(...conditions));
  }
}

export const storage = new DatabaseStorage();
