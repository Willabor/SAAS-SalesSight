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
import { eq, desc, sql, count, sum, ilike, or, and } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Item List operations
  createItemList(item: InsertItemList): Promise<ItemList>;
  updateItemList(itemNumber: string, item: Partial<InsertItemList>): Promise<ItemList | undefined>;
  upsertItemList(item: InsertItemList): Promise<ItemList>;
  getAllItemList(limit?: number, offset?: number, search?: string): Promise<{
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
  }>): Promise<Set<string>>;
  getReceivingVouchers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    store?: string;
    voucherNumber?: string;
    exactMatch?: boolean;
  }): Promise<{
    vouchers: ReceivingVoucher[];
    total: number;
  }>;
  getVoucherByIdWithLines(id: number): Promise<{
    voucher: ReceivingVoucher;
    lines: ReceivingLine[];
  } | null>;
  getReceivingStats(): Promise<{
    totalVouchers: number;
    totalLines: number;
    totalCost: number;
    uniqueStores: number;
    uniqueVendors: number;
  }>;
  deleteReceivingVoucher(id: number): Promise<boolean>;
  deleteAllReceivingVouchers(): Promise<number>;
  
  // Inventory Turnover operations
  getInventoryTurnoverMetrics(): Promise<{
    totalInventoryValue: number;
    totalInventoryUnits: number;
    deadStockValue: number;
    deadStockUnits: number;
    avgDaysSinceLastSale: number;
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

  async getAllItemList(limit = 50, offset = 0, search?: string): Promise<{
    items: ItemList[];
    total: number;
  }> {
    let items: ItemList[];
    let total: number;

    if (search) {
      const searchFilter = or(
        ilike(itemList.itemNumber, `%${search}%`),
        ilike(itemList.itemName, `%${search}%`),
        ilike(itemList.vendorName, `%${search}%`),
        ilike(itemList.category, `%${search}%`)
      );
      
      const [itemsResult, [countResult]] = await Promise.all([
        db.select().from(itemList).where(searchFilter).orderBy(desc(itemList.uploadedAt)).limit(limit).offset(offset),
        db.select({ count: count() }).from(itemList).where(searchFilter)
      ]);
      
      items = itemsResult;
      total = countResult.count;
    } else {
      const [itemsResult, [countResult]] = await Promise.all([
        db.select().from(itemList).orderBy(desc(itemList.uploadedAt)).limit(limit).offset(offset),
        db.select({ count: count() }).from(itemList)
      ]);
      
      items = itemsResult;
      total = countResult.count;
    }

    return { items, total };
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
  }>): Promise<Set<string>> {
    if (vouchers.length === 0) return new Set();
    
    // Deduplicate vouchers before query
    const uniqueVouchers = Array.from(
      new Map(vouchers.map(v => [`${v.voucherNumber}|${v.store}|${v.date}`, v])).values()
    );
    
    const existingKeys = new Set<string>();
    const chunkSize = 500;
    
    for (let i = 0; i < uniqueVouchers.length; i += chunkSize) {
      const chunk = uniqueVouchers.slice(i, i + chunkSize);
      
      // Build OR conditions for NULL-safe comparison
      const orConditions = chunk.map(v => 
        and(
          sql`${receivingVouchers.voucherNumber} IS NOT DISTINCT FROM ${v.voucherNumber}`,
          sql`${receivingVouchers.store} IS NOT DISTINCT FROM ${v.store}`,
          sql`${receivingVouchers.date} IS NOT DISTINCT FROM ${v.date}`
        )
      );
      
      const existing = await db
        .select({
          voucherNumber: receivingVouchers.voucherNumber,
          store: receivingVouchers.store,
          date: receivingVouchers.date,
        })
        .from(receivingVouchers)
        .where(or(...orConditions));
      
      // Add to set with composite key
      existing.forEach(v => {
        existingKeys.add(`${v.voucherNumber}|${v.store}|${v.date}`);
      });
    }
    
    return existingKeys;
  }

  async getReceivingVouchers(params: {
    limit?: number;
    offset?: number;
    search?: string;
    store?: string;
    voucherNumber?: string;
    exactMatch?: boolean;
  } = {}): Promise<{
    vouchers: ReceivingVoucher[];
    total: number;
  }> {
    const { limit = 50, offset = 0, search, store, voucherNumber, exactMatch = false } = params;
    
    let vouchers: ReceivingVoucher[];
    let total: number;
    
    // Build filters
    const filters = [];
    
    if (store) {
      filters.push(eq(receivingVouchers.store, store));
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
    
    if (whereClause) {
      const [vouchersResult, [countResult]] = await Promise.all([
        db.select().from(receivingVouchers).where(whereClause).orderBy(desc(receivingVouchers.date)).limit(limit).offset(offset),
        db.select({ count: count() }).from(receivingVouchers).where(whereClause)
      ]);
      
      vouchers = vouchersResult;
      total = countResult.count;
    } else {
      const [vouchersResult, [countResult]] = await Promise.all([
        db.select().from(receivingVouchers).orderBy(desc(receivingVouchers.date)).limit(limit).offset(offset),
        db.select({ count: count() }).from(receivingVouchers)
      ]);
      
      vouchers = vouchersResult;
      total = countResult.count;
    }
    
    return { vouchers, total };
  }

  async getVoucherByIdWithLines(id: number): Promise<{
    voucher: ReceivingVoucher;
    lines: ReceivingLine[];
  } | null> {
    const [voucher] = await db
      .select()
      .from(receivingVouchers)
      .where(eq(receivingVouchers.id, id));
    
    if (!voucher) return null;
    
    const lines = await db
      .select()
      .from(receivingLines)
      .where(eq(receivingLines.voucherId, id));
    
    return { voucher, lines };
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
  }> {
    const result = await db
      .select({
        totalInventoryValue: sql<number>`COALESCE(SUM(CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC)), 0)`,
        totalInventoryUnits: sql<number>`COALESCE(SUM(${itemList.availQty}), 0)`,
        deadStockValue: sql<number>`COALESCE(SUM(CASE WHEN ${itemList.lastSold} IS NULL OR ${itemList.lastSold} < CURRENT_DATE - INTERVAL '90 days' THEN CAST(${itemList.availQty} AS NUMERIC) * CAST(COALESCE(${itemList.orderCost}, 0) AS NUMERIC) ELSE 0 END), 0)`,
        deadStockUnits: sql<number>`COALESCE(SUM(CASE WHEN ${itemList.lastSold} IS NULL OR ${itemList.lastSold} < CURRENT_DATE - INTERVAL '90 days' THEN ${itemList.availQty} ELSE 0 END), 0)`,
        avgDaysSinceLastSale: sql<number>`COALESCE(AVG(CASE WHEN ${itemList.lastSold} IS NOT NULL THEN (CURRENT_DATE - ${itemList.lastSold}) ELSE NULL END), 0)`,
      })
      .from(itemList)
      .where(sql`${itemList.availQty} > 0`);

    return result[0] || {
      totalInventoryValue: 0,
      totalInventoryUnits: 0,
      deadStockValue: 0,
      deadStockUnits: 0,
      avgDaysSinceLastSale: 0,
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
}

export const storage = new DatabaseStorage();
