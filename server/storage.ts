import { 
  users, 
  itemList, 
  salesTransactions, 
  uploadHistory,
  receivingVouchers,
  receivingLines,
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
  type InsertReceivingLine
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, count, sum, ilike, or, and } from "drizzle-orm";

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
  getAllSalesTransactions(limit?: number, offset?: number, search?: string, year?: number, month?: number): Promise<{
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

  getProductSegmentationReport(): Promise<{
    coreHighFrequency: Array<any>;
    coreMediumFrequency: Array<any>;
    coreLowFrequency: Array<any>;
    nonCoreRepeat: Array<any>;
    oneTimePurchase: Array<any>;
    summerItems: Array<any>;
    winterItems: Array<any>;
    highMarginItems: Array<any>;
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

  async getAllSalesTransactions(limit = 50, offset = 0, search?: string, year?: number, month?: number): Promise<{
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
    
    // Year filter using date range for index efficiency
    if (year) {
      filters.push(sql`${salesTransactions.date} >= make_date(${year}, 1, 1)`);
      filters.push(sql`${salesTransactions.date} < make_date(${year + 1}, 1, 1)`);
    }
    
    // Month filter using date range (1-12)
    if (month && year) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      filters.push(sql`${salesTransactions.date} >= make_date(${year}, ${month}, 1)`);
      filters.push(sql`${salesTransactions.date} < make_date(${nextYear}, ${nextMonth}, 1)`);
    }

    const whereClause = filters.length > 0 ? sql`${sql.join(filters, sql` AND `)}` : undefined;
    
    if (whereClause) {
      const [transactionsResult, [countResult]] = await Promise.all([
        db.select().from(salesTransactions).where(whereClause).orderBy(desc(salesTransactions.date)).limit(limit).offset(offset),
        db.select({ count: count() }).from(salesTransactions).where(whereClause)
      ]);
      
      transactions = transactionsResult;
      total = countResult.count;
    } else {
      const [transactionsResult, [countResult]] = await Promise.all([
        db.select().from(salesTransactions).orderBy(desc(salesTransactions.date)).limit(limit).offset(offset),
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
    // OPTIMIZED: Single CTE-based query instead of N+1 queries
    const result = await db.execute(sql`
      WITH base_styles AS (
        SELECT
          il.style_number AS "styleNumber",
          il.item_name AS "itemName",
          il.category,
          il.vendor_name AS "vendorName",
          il.gender,
          SUM(COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) + COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0) + COALESCE(il.hq_qty, 0)) AS "totalActiveQty",
          SUM(COALESCE(il.mm_qty, 0) + COALESCE(il.pm_qty, 0)) AS "totalClosedStoresQty",
          AVG(CAST(COALESCE(il.order_cost, '0') AS NUMERIC)) AS "avgOrderCost",
          AVG(CAST(COALESCE(il.selling_price, '0') AS NUMERIC)) AS "avgSellingPrice",
          MAX(il.last_rcvd) AS "lastReceived"
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
        GROUP BY il.style_number, il.item_name, il.category, il.vendor_name, il.gender
      ),
      receiving_counts AS (
        SELECT 
          il.style_number AS "styleNumber",
          il.item_name AS "itemName",
          COUNT(DISTINCT rv.id) AS "receiveCount",
          SUM(CASE WHEN EXTRACT(MONTH FROM rv.date) IN (6, 7, 8) THEN 1 ELSE 0 END) AS "summerReceives",
          SUM(CASE WHEN EXTRACT(MONTH FROM rv.date) IN (12, 1, 2) THEN 1 ELSE 0 END) AS "winterReceives",
          COUNT(*) AS "totalReceives"
        FROM receiving_lines rl
        JOIN receiving_vouchers rv ON rl.voucher_id = rv.id
        JOIN item_list il ON rl.item_number = il.item_number
        WHERE il.style_number IS NOT NULL AND il.style_number <> ''
        GROUP BY il.style_number, il.item_name
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
        (bs."totalActiveQty" * bs."avgOrderCost") AS "inventoryValue",
        bs."lastReceived",
        CASE 
          WHEN bs."lastReceived" IS NOT NULL THEN (CURRENT_DATE - bs."lastReceived"::date)
          ELSE NULL
        END AS "daysSinceLastReceive",
        COALESCE(rc."receiveCount", 0) AS "receiveCount",
        COALESCE(rc."summerReceives", 0) AS "summerReceives",
        COALESCE(rc."winterReceives", 0) AS "winterReceives",
        COALESCE(rc."totalReceives", 0) AS "totalReceives"
      FROM base_styles bs
      LEFT JOIN receiving_counts rc ON bs."styleNumber" = rc."styleNumber" AND bs."itemName" = rc."itemName"
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
      daysSinceLastReceive: number | null;
      receiveCount: number;
      summerReceives: number;
      winterReceives: number;
      totalReceives: number;
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

      // Smart stock status
      let stockStatus = 'Active';
      const daysSinceLastReceive = row.daysSinceLastReceive;
      if (daysSinceLastReceive === null) {
        stockStatus = 'Never Received';
      } else if (classification === 'One-Time' && daysSinceLastReceive > 180) {
        stockStatus = 'Expected One-Time';
      } else if (classification.startsWith('Core') && daysSinceLastReceive > 90) {
        // Check if seasonal hold
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const isSummer = currentMonth >= 6 && currentMonth <= 8;
        const isWinter = currentMonth === 12 || currentMonth <= 2;

        if (seasonalPattern === 'Summer' && !isSummer) {
          stockStatus = 'Seasonal Hold';
        } else if (seasonalPattern === 'Winter' && !isWinter) {
          stockStatus = 'Seasonal Hold';
        } else {
          stockStatus = 'Dead Stock';
        }
      } else if (daysSinceLastReceive < 30) {
        stockStatus = 'New Arrival';
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

    // For each style, compare store velocities (simplified - assumes equal velocity for now)
    for (const style of stylesWithStoreData) {
      const stores = [
        { name: 'GM', qty: style.gmQty },
        { name: 'HM', qty: style.hmQty },
        { name: 'NM', qty: style.nmQty },
        { name: 'LM', qty: style.lmQty },
      ];

      // Calculate margin percent
      const avgOrderCost = Number(style.avgOrderCost) || 0;
      const avgSellingPrice = Number(style.avgSellingPrice) || 0;
      const avgMarginPercent = avgSellingPrice > 0
        ? ((avgSellingPrice - avgOrderCost) / avgSellingPrice) * 100
        : 0;

      // Find imbalances (simple heuristic: if one store has >10 units and another has 0)
      for (let i = 0; i < stores.length; i++) {
        for (let j = 0; j < stores.length; j++) {
          if (i !== j && stores[i].qty > 10 && stores[j].qty === 0) {
            recommendations.push({
              styleNumber: style.styleNumber || '',
              itemName: style.itemName || '',
              category: style.category,
              fromStore: stores[i].name,
              toStore: stores[j].name,
              fromStoreQty: stores[i].qty,
              toStoreQty: stores[j].qty,
              fromStoreDailySales: 0, // TODO: Calculate from sales data
              toStoreDailySales: 0, // TODO: Calculate from sales data
              recommendedQty: Math.min(5, Math.floor(stores[i].qty / 2)),
              priority: 'Medium',
              avgMarginPercent: Number(avgMarginPercent.toFixed(2)),
            });
          }
        }
      }
    }

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
    const stylesWithSales = await this.getStyleOverstockUnderstock(30, 500);
    const allStyles = await this.getStyleInventoryMetrics();

    // Create a map for quick lookup
    const styleMap = new Map(
      allStyles.map(s => [`${s.styleNumber}|${s.itemName}`, s])
    );

    const recommendations = stylesWithSales
      .filter(style => {
        // Only recommend restocking for items that are selling and running low
        return (
          style.daysOfSupply < 21 &&
          style.avgDailySales > 0 &&
          (style.classification === 'Core High' ||
            style.classification === 'Core Medium' ||
            style.classification === 'Core Low')
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

  async getProductSegmentationReport(): Promise<{
    coreHighFrequency: Array<any>;
    coreMediumFrequency: Array<any>;
    coreLowFrequency: Array<any>;
    nonCoreRepeat: Array<any>;
    oneTimePurchase: Array<any>;
    summerItems: Array<any>;
    winterItems: Array<any>;
    highMarginItems: Array<any>;
  }> {
    const allStyles = await this.getStyleInventoryMetrics();

    return {
      coreHighFrequency: allStyles
        .filter(s => s.classification === 'Core High')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      coreMediumFrequency: allStyles
        .filter(s => s.classification === 'Core Medium')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      coreLowFrequency: allStyles
        .filter(s => s.classification === 'Core Low')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      nonCoreRepeat: allStyles
        .filter(s => s.classification === 'Non-Core Repeat')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      oneTimePurchase: allStyles
        .filter(s => s.classification === 'One-Time')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      summerItems: allStyles
        .filter(s => s.seasonalPattern === 'Summer')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      winterItems: allStyles
        .filter(s => s.seasonalPattern === 'Winter')
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
      highMarginItems: allStyles
        .filter(s => s.avgMarginPercent >= 70)
        .sort((a, b) => b.avgMarginPercent - a.avgMarginPercent),
    };
  }
}

export const storage = new DatabaseStorage();
