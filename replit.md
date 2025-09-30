# Overview

This is an Excel Sales Data Processor application built as a full-stack web application. The system allows users to upload Excel files containing item lists, sales transaction data, and receiving history from QuickBooks. The application processes these files and provides a dashboard with analytics and statistics. Key features include file upload capabilities, data visualization, multi-step processing workflows, real-time progress tracking, and **secure user authentication** using Replit Auth.

The system now includes three major workflows and comprehensive analytics:
1. **Item List Management**: Upload and manage product inventory data
2. **Sales Data Processing**: Process sales transactions with duplicate detection
3. **Receiving History**: Process QuickBooks receiving vouchers with format & consolidate, flatten operations, voucher viewer with search capabilities, and automatic handling of QuickBooks calculation bugs and reversals
4. **Sales & Inventory Analytics**: Advanced analytics including sales insights and inventory turnover reporting with dead stock identification, overstock/understock analysis, and category-level inventory metrics
5. **User Authentication** (NEW): Secure login with Replit Auth supporting Google, GitHub, and email/password authentication. All application features are protected behind authentication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript and follows a modern component-based architecture:

- **UI Framework**: React with Vite as the build tool and development server
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **File Processing**: SheetJS (XLSX) for Excel file parsing and processing

The application uses a component-driven design with reusable UI components organized in a `/components/ui` structure. The main application logic is split into feature-specific components for file uploads, statistics display, and progress tracking.

## Backend Architecture

The backend follows a Node.js Express.js REST API pattern:

- **Runtime**: Node.js with TypeScript and ESM modules
- **Web Framework**: Express.js for HTTP server and API routes
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Design**: RESTful endpoints organized by feature (stats, uploads, health checks)

The server implements a clean separation of concerns with dedicated modules for database operations, routing, and business logic. The storage layer abstracts database operations through an interface pattern.

## Authentication & Security

The application uses **Replit Auth** (OpenID Connect) for user authentication:

- **Authentication Provider**: Replit Auth with Google, GitHub, and email/password login options
- **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple` for secure, server-side session storage
- **Protected Routes**: All API endpoints (except health check) require authentication via `isAuthenticated` middleware
- **User Management**: Automatic user creation/update on login using claims from ID token (sub, email, first_name, last_name, profile_image_url)
- **Security Features**: HTTP-only cookies, secure session configuration, token expiry validation, automatic token refresh

**Frontend Authentication Flow**:
- Unauthenticated users see a landing page with feature overview
- Login redirects to Replit Auth for authentication
- Authenticated users access the full dashboard with unified navigation
- User profile dropdown displays user info and logout option
- All pages protected with authentication checks

**Database Schema for Auth**:
- `users` table: Stores user profiles (id, email, firstName, lastName, profileImageUrl, timestamps)
- `sessions` table: Stores Express sessions with expiry management (sid, sess, expire)

## Data Storage Solutions

**Primary Database**: PostgreSQL via Neon Database (serverless)

**Schema Design**:
- `item_list`: Stores product inventory data with detailed item information, quantities, pricing, and metadata
- `sales_transactions`: Stores sales transaction records with receipt information and item details
- `receiving_vouchers`: Stores receiving voucher headers with voucher number, date, store, vendor, type, totals (QB and corrected), and metadata. Includes composite unique constraint on (voucherNumber, store, date) for duplicate prevention
- `receiving_lines`: Stores receiving voucher line items with item number, item name, quantity, cost, linked to vouchers via foreign key with cascade delete
- `upload_history`: Tracks file upload operations with success/failure statistics
- `users`: Stores user profiles with Replit Auth ID, email, name, and profile image
- `sessions`: Stores Express session data for authenticated users with automatic expiry management

The database uses Drizzle ORM for type-safe queries and schema management, with automatic migration support.

## File Processing Architecture

The application implements a sophisticated Excel file processing system:

- **Client-side Processing**: Uses SheetJS to parse Excel files in the browser before upload
- **Data Validation**: Zod schemas validate data structure before database insertion
- **Batch Processing**: Supports large file uploads with progress tracking
- **Error Handling**: Comprehensive error reporting with detailed failure logs
- **Multiple Upload Modes**: Supports initial uploads and weekly updates with different processing logic

### Receiving History Processing

The application includes specialized processing for QuickBooks receiving voucher exports:

1. **Format & Consolidate** (Step 1):
   - Consolidates multiple sheets in reverse chronological order
   - Deletes top 5 rows from each sheet (header cleanup)
   - Removes alternating columns (A, C, E, G, I, K, M, O)
   - Inserts 4 empty columns after Voucher # for item details
   - Adds headers: Item #, Item Name, Qty, cost

2. **Flatten** (Step 2):
   - Parses hierarchical voucher structure into flat table
   - Detects voucher headers (contains Date object)
   - Extracts line items (Item #, Item Name, Qty, Cost)
   - Handles QuickBooks calculation bugs by recalculating totals with absolute cost values
   - Identifies reversals (negative quantities) and marks transaction type
   - Calculates corrected totals for comparison with QB totals

3. **Upload** (Step 3):
   - Validates all vouchers and line items with Zod schemas
   - Checks for duplicates using composite key (voucherNumber + store + date)
   - Bulk inserts vouchers and associated line items
   - Tracks upload statistics (uploaded, skipped, failed)
   - Records upload history with detailed error messages

4. **Voucher Viewer**:
   - Search and filter vouchers by number, vendor, store, or item
   - Paginated table view with key metrics
   - Detail view shows voucher header, totals comparison, and all line items
   - Highlights QuickBooks calculation mismatches
   - Shows reversal badges for negative quantities

### Inventory Turnover Analytics

The application provides comprehensive inventory analysis and reporting through the Sales Insights page:

**Key Performance Indicators**:
- Total Inventory Value: Aggregate value of all available inventory
- Dead Stock Value: Value of items with no sales in 90+ days
- Average Days Since Last Sale: Overall inventory age metric
- Dead Stock Percentage: Proportion of inventory that is dead stock

**Slow-Moving & Dead Stock Identification**:
- Identifies items with no sales in the last 90+ days
- Categorizes as "Never Sold", "Dead Stock" (180+ days), or "Slow Moving" (90+ days)
- Displays item details, current quantity, inventory value, and days since last sale
- Limited to top 20 items by default for performance

**Overstock & Understock Analysis**:
- Calculates average daily sales based on last 30 days
- Computes days of supply (current quantity / average daily sales)
- Flags overstock (90+ days supply) and understock (<7 days supply)
- Helps optimize inventory levels and prevent stockouts

**Category-Level Inventory Analysis**:
- Aggregates inventory value, units, and sales by product category
- Calculates turnover rate per category (sales / inventory units)
- Identifies categories with poor turnover performance
- Supports strategic inventory management decisions

**Technical Implementation**:
- Optimized SQL queries using LEFT JOINs for performance
- Handles 35K+ items and 277K+ transactions efficiently
- All queries complete in <5 seconds
- Real-time calculation without pre-aggregation
- Links item_list, sales_transactions, and receiving_lines tables via item_number

## Development and Deployment

- **Development**: Vite dev server with hot module replacement
- **Build Process**: Vite for frontend bundling, ESBuild for backend compilation
- **Environment**: Configured for Replit deployment with specific Vite plugins
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Code Quality**: Structured with path aliases and consistent import patterns

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database provider
- **Drizzle ORM**: Type-safe ORM for database operations
- **connect-pg-simple**: PostgreSQL session store for Express

## Frontend Libraries
- **React Ecosystem**: React 18 with TypeScript, Vite, React DOM
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with PostCSS for utility-first styling
- **Data Fetching**: TanStack Query for server state management
- **File Processing**: SheetJS (XLSX) for Excel file manipulation
- **Form Management**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for runtime type checking and validation
- **Date Handling**: date-fns for date manipulation utilities
- **Routing**: Wouter for lightweight client-side routing

## Backend Libraries
- **Express.js**: Web application framework
- **TypeScript**: Static type checking
- **Drizzle Kit**: Database migrations and schema management
- **WebSocket Support**: ws library for real-time features (prepared)

## Development Tools
- **Vite**: Build tool and development server
- **ESBuild**: Fast JavaScript/TypeScript bundler
- **PostCSS**: CSS processing with Autoprefixer
- **Replit Plugins**: Development banner, error overlay, and cartographer for Replit integration