# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Starts the development server with Vite HMR and Express backend
- **Build**: `npm run build` - Builds the client (Vite) and server (esbuild) for production
- **Production**: `npm start` - Runs the production build
- **Type Checking**: `npm run check` - Runs TypeScript compiler to check types
- **Database Push**: `npm run db:push` - Pushes Drizzle schema changes to the database

## Architecture Overview

This is a full-stack TypeScript application with React frontend and Express backend, using a monorepo structure.

### Project Structure

- **`client/`** - React frontend (Vite)
  - Uses Wouter for routing (not React Router)
  - TanStack Query for data fetching
  - shadcn/ui components with Tailwind CSS
  - Main entry: `client/src/main.tsx` → `App.tsx`

- **`server/`** - Express backend
  - Entry point: `server/index.ts`
  - Routes: `server/routes.ts` (API endpoints)
  - Database: `server/db.ts` (Neon PostgreSQL with Drizzle ORM)
  - Storage layer: `server/storage.ts` (database operations)

- **`shared/`** - Code shared between client and server
  - `shared/schema.ts` - Drizzle schema definitions and Zod validation schemas

### Database Architecture

Uses Drizzle ORM with Neon serverless PostgreSQL:

- **Schema location**: `shared/schema.ts` (shared between client/server)
- **Three main tables**:
  - `item_list` - Inventory items with quantities across locations
  - `sales_transactions` - Sales records
  - `upload_history` - Tracks file uploads and their results
- **Storage interface**: `server/storage.ts` exports `storage` singleton implementing `IStorage`
- All database operations go through the storage layer, never directly via `db`

### Import Aliases

- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Development Workflow

In development mode, the server:
1. Starts Express on port 5000 (or PORT env var)
2. Sets up Vite middleware for HMR
3. Serves both API routes and the React app

API routes are under `/api/*`, all other routes serve the React app.

### Data Upload Flow

The application handles Excel file uploads for inventory and sales data:
1. Client parses Excel files using `xlsx` library
2. Data is validated against Zod schemas (from `shared/schema.ts`)
3. Server processes rows individually, tracking success/failures
4. Upload history is recorded in `upload_history` table
5. Item list supports two modes: "initial" (insert) and "weekly_update" (upsert by item_number)

### Key Technical Details

- Session handling uses `express-session` with `memorystore` in dev
- Database connection uses WebSocket-based Neon serverless driver
- Build produces two outputs: `dist/public` (client) and `dist/index.js` (server)
- Production server serves static files from `dist/public`