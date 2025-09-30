# SalesSight - Excel Sales Data Processor

A full-stack retail SAAS application for processing, managing, and analyzing retail inventory and sales data from Excel files with real-time dashboard analytics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)

## 🚀 Features

### 📦 Item List Management
- Upload and manage complete product inventory
- Track inventory levels across 8 store locations
- Monitor stock availability in real-time
- Search and filter items by vendor, category, or item number
- Automatic duplicate handling with weekly update mode

### 💰 Sales Transaction Processing
- Import sales transactions from Excel files
- Automatic duplicate receipt detection
- Comprehensive sales analytics and insights
- Filter by date, store, or product
- Monthly and yearly revenue tracking

### 📊 Advanced Analytics
- **Inventory Turnover Metrics** - Track dead stock and slow-moving items
- **Sales Insights** - Revenue by store, category, and time period
- **Category Analysis** - Performance metrics by product category
- **Overstock/Understock Detection** - Intelligent inventory recommendations

### 🚚 Receiving History
- Process QuickBooks receiving vouchers
- Multi-step processing workflow
- Automatic QuickBooks error correction
- Search and filter vouchers by store or vendor

### 🔐 Security
- Replit OAuth authentication
- PostgreSQL session storage
- Protected API routes
- Secure cookie handling
- Token refresh logic

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Wouter** - Lightweight routing
- **TanStack Query** - Server state management
- **shadcn/ui** - Beautiful UI components (48 Radix UI components)
- **Tailwind CSS** - Utility-first styling
- **SheetJS (xlsx)** - Excel file processing
- **Recharts** - Data visualization

### Backend
- **Node.js 20** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe backend
- **Drizzle ORM** - Type-safe database queries
- **Neon PostgreSQL** - Serverless database
- **Passport.js** - Authentication middleware
- **Zod** - Schema validation

### Database (PostgreSQL)
- `users` - User accounts with OAuth data
- `sessions` - Secure session storage
- `item_list` - Inventory items (22 fields)
- `sales_transactions` - Sales records
- `receiving_vouchers` + `receiving_lines` - Receiving history
- `upload_history` - File upload tracking

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** database (or Neon serverless account)
- **Replit account** (for OAuth authentication)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Willabor/SAAS-SalesSight.git
cd SAAS-SalesSight
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
PORT=5000
NODE_ENV=development

# Replit Auth (required)
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.repl.co
SESSION_SECRET=your-secret-key-here
ISSUER_URL=https://replit.com/oidc
```

### 4. Database Setup

Push the database schema:

```bash
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🗂️ Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ui/       # shadcn/ui components (48 components)
│   │   │   └── ...       # Feature components
│   │   ├── pages/        # Page components (7 pages)
│   │   ├── lib/          # Utilities and API client
│   │   ├── hooks/        # Custom React hooks
│   │   └── App.tsx       # Root component
│   └── index.html
│
├── server/                # Backend Express API
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes (30+ endpoints)
│   ├── storage.ts        # Database layer
│   ├── db.ts             # Database connection
│   └── replitAuth.ts     # Authentication setup
│
├── shared/                # Shared types and schemas
│   └── schema.ts         # Drizzle schemas + Zod validation
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── tailwind.config.ts
```

## 🔌 API Endpoints

### Authentication
- `GET /api/login` - Initiate OAuth login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout user
- `GET /api/auth/user` - Get current user

### Item List
- `GET /api/item-list` - Get items with pagination
- `POST /api/upload/item-list` - Upload item data
- `DELETE /api/item-list/:id` - Delete item
- `DELETE /api/item-list` - Clear all items

### Sales
- `GET /api/sales-transactions` - Get transactions
- `POST /api/upload/sales-transactions` - Upload sales data
- `PUT /api/sales-transactions/:id` - Update transaction
- `DELETE /api/sales-transactions/:id` - Delete transaction
- `GET /api/sales-insights` - Get analytics

### Receiving
- `GET /api/receiving/vouchers` - Get vouchers
- `POST /api/receiving/upload` - Upload vouchers
- `GET /api/receiving/vouchers/:id` - Get voucher details
- `DELETE /api/receiving/vouchers/:id` - Delete voucher

### Analytics
- `GET /api/stats/item-list` - Item statistics
- `GET /api/stats/sales` - Sales statistics
- `GET /api/inventory/turnover-metrics` - Inventory metrics
- `GET /api/inventory/slow-moving` - Slow-moving stock
- `GET /api/inventory/overstock-understock` - Stock analysis

All endpoints (except `/api/health` and auth routes) require authentication.

## 📝 Excel File Format

### Item List Format
Excel file should contain an "Item Detail" sheet with columns:
- Item Number, Vendor Name, Item Name, Category, Gender
- Available Qty, HQ Qty, GM Qty, HM Qty, MM Qty, NM Qty, PM Qty, LM Qty
- Last Received, Creation Date, Last Sold
- Style Number, Order Cost, Selling Price, Notes, Size, Attribute

### Sales Transaction Format
Excel file should contain "Sales Detail" sheets with columns:
- Date, Store, Receipt #, SKU, Item Name
- Transaction Store Type, Price, Sheet

### Receiving History Format
Excel file with voucher information and line items.

## 🧪 Development Commands

```bash
npm run dev        # Start development server (port 5000)
npm run build      # Build for production
npm start          # Run production server
npm run check      # TypeScript type checking
npm run db:push    # Push database schema changes
```

## 🔒 Security Features

- ✅ **OAuth Authentication** - Secure login via Replit
- ✅ **Session Management** - PostgreSQL-backed sessions (7-day TTL)
- ✅ **Protected Routes** - All data endpoints require authentication
- ✅ **Token Refresh** - Automatic token refresh for expired sessions
- ✅ **Secure Cookies** - httpOnly and secure flags enabled
- ✅ **Input Validation** - Zod schema validation on all inputs
- ✅ **SQL Injection Protection** - Drizzle ORM parameterized queries

## 📊 Database Schema

### Users Table
- `id` (UUID), `email`, `firstName`, `lastName`
- `profileImageUrl`, `createdAt`, `updatedAt`

### Item List Table (22 fields)
- Basic info: item_number, vendor_name, item_name, category, gender
- Quantities: avail_qty, hq_qty, gm_qty, hm_qty, mm_qty, nm_qty, pm_qty, lm_qty
- Dates: last_rcvd, creation_date, last_sold
- Pricing: order_cost, selling_price
- Metadata: notes, size, attribute, file_name

### Sales Transactions Table
- `id`, `date`, `store`, `receipt_number`
- `sku`, `item_name`, `transaction_store_type`
- `price`, `sheet`, `uploaded_at`

### Receiving Vouchers + Lines
- Voucher: voucher_number, date, store, vendor, type, qb_total, corrected_total
- Lines: item_number, item_name, qty, cost

## 🐛 Known Issues & Limitations

- Large Excel files (>50MB) may cause browser memory issues (client-side processing)
- No database migrations system (using `drizzle-kit push`)
- Bundle size is 857KB (consider code-splitting for optimization)

## 🗺️ Roadmap

- [ ] Add test coverage (Jest/Vitest)
- [ ] Implement database migrations
- [ ] Add error tracking (Sentry)
- [ ] Structured logging (Winston/Pino)
- [ ] Code-split large bundles
- [ ] Add CI/CD pipeline
- [ ] API documentation (Swagger)
- [ ] Docker containerization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ for retail inventory management

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database queries
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Replit](https://replit.com/) - OAuth authentication provider

---

**Need Help?** Check out the [CLAUDE.md](./CLAUDE.md) file for detailed technical documentation.
