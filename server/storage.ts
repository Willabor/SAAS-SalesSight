import { 
  users, 
  itemList, 
  salesTransactions, 
  uploadHistory,
  type User, 
  type InsertUser,
  type ItemList,
  type InsertItemList,
  type SalesTransaction,
  type InsertSalesTransaction,
  type UploadHistory,
  type InsertUploadHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count, sum, ilike, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  
  // Sales Transactions operations
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
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
  }>;
  
  // Upload History operations
  createUploadHistory(history: InsertUploadHistory): Promise<UploadHistory>;
  getRecentUploads(limit?: number): Promise<UploadHistory[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
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

  async createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction> {
    const [createdTransaction] = await db
      .insert(salesTransactions)
      .values(transaction)
      .returning();
    return createdTransaction;
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
}

export const storage = new DatabaseStorage();
