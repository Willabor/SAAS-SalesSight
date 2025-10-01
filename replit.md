# Overview

This full-stack web application is an Excel Sales Data Processor designed to help businesses manage and analyze their sales, inventory, and receiving data. It enables users to upload Excel files from QuickBooks containing item lists, sales transactions, and receiving history. The system processes this data, offering a comprehensive dashboard with advanced analytics, data visualizations, and multi-step processing workflows. Key capabilities include secure user authentication, robust data validation, and real-time progress tracking.

The application provides:
- **Item List Management**: Advanced features for product inventory, including server-side filtering, sorting, real-time statistics, and export capabilities.
- **Sales Data Processing**: Handles sales transactions with duplicate detection.
- **Receiving History**: Processes QuickBooks receiving vouchers, including format consolidation, flattening, and an interactive voucher viewer.
- **Sales & Inventory Analytics**: Offers in-depth insights into sales, inventory turnover, dead stock identification, over/understock analysis, inter-store transfer recommendations, and restocking alerts for core items.
- **Google Marketing Export**: Generates an 8-sheet Excel report optimized for Google Ads/Shopping campaigns, featuring product segmentation, Google-optimized titles, and custom labels.
- **User Authentication**: Secure login using Replit Auth, protecting all application features.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend is built with React, TypeScript, and Tailwind CSS using shadcn/ui for a consistent design system. It emphasizes a component-driven design with reusable UI components.

## Technical Implementations
- **Frontend**: React with Vite, TanStack Query for state management, Wouter for routing, React Hook Form with Zod for forms, and SheetJS for Excel processing.
- **Backend**: Node.js with Express.js, TypeScript, and ESM modules, providing a RESTful API.
- **Authentication**: Replit Auth is used for user authentication, supporting Google, GitHub, and email/password logins. Sessions are managed using PostgreSQL-backed `connect-pg-simple`.
- **Database**: PostgreSQL (Neon Database) is the primary data store, utilizing Drizzle ORM for type-safe operations.
- **File Processing**: Client-side Excel parsing with SheetJS, Zod for data validation, batch processing with progress tracking, and comprehensive error handling.
- **Receiving History Processing**: Multi-step process including consolidation, flattening hierarchical data, recalculating QuickBooks totals, and duplicate detection before bulk insertion.
- **Inventory Turnover Analytics**: Optimized with a single CTE-based SQL query for efficient real-time calculation of key performance indicators, dead stock, overstock/understock, and category-level analysis across large datasets.
- **Google Marketing Export**: Implements product segmentation logic based on receiving frequency, sales velocity, margin, and stock. Generates Google-optimized product titles, keywords, and custom labels for an 8-sheet Excel report.

## Feature Specifications
- **Item List**: View, filter, sort, and export 24 database columns; real-time inventory statistics.
- **Sales Data**: Duplicate detection in sales transactions.
- **Receiving History**: Voucher viewer with search, detail view, and QuickBooks calculation mismatch highlighting.
- **Inventory Analytics**: KPIs for inventory value, dead stock, average days since last sale; identification of slow-moving, dead stock, overstock, and understock items; category-level analysis; transfer recommendations (inter-store inventory redistribution); restocking recommendations (reorder alerts for core items).
- **Google Marketing Export**: Provides Executive Summary, Best Sellers, Core Items, New Arrivals, Seasonal, Clearance Candidates, and a GMC-compliant Google Shopping Feed.

## System Design Choices
- **Separation of Concerns**: Clear modularity in backend for database operations, routing, and business logic.
- **Type Safety**: Full TypeScript implementation across both frontend and backend.
- **Scalability**: Utilizes serverless PostgreSQL (Neon Database) and optimized database queries for performance.
- **Security**: All routes are protected by authentication middleware; secure session management.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe ORM.
- **connect-pg-simple**: PostgreSQL session store.

## Frontend Libraries
- **React**: Core UI library.
- **Vite**: Build tool.
- **shadcn/ui & Radix UI**: UI component system.
- **Tailwind CSS**: Styling framework.
- **TanStack Query**: Server state management.
- **SheetJS (XLSX)**: Excel file processing.
- **React Hook Form**: Form management.
- **Zod**: Validation.
- **date-fns**: Date utilities.
- **Wouter**: Client-side routing.

## Backend Libraries
- **Express.js**: Web framework.
- **TypeScript**: Language.
- **Drizzle Kit**: Database migrations.
- **ws**: WebSocket support (prepared).

## Authentication
- **Replit Auth**: User authentication provider.