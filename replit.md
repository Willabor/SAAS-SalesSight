# Overview

This is an Excel Sales Data Processor application built as a full-stack web application. The system allows users to upload Excel files containing item lists and sales transaction data, processes them, and provides a dashboard with analytics and statistics. The application features file upload capabilities, data visualization, and real-time progress tracking for data processing operations.

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

## Data Storage Solutions

**Primary Database**: PostgreSQL via Neon Database (serverless)

**Schema Design**:
- `item_list`: Stores product inventory data with detailed item information, quantities, pricing, and metadata
- `sales_transactions`: Stores sales transaction records with receipt information and item details
- `upload_history`: Tracks file upload operations with success/failure statistics
- `users`: User management for authentication (prepared but not fully implemented)

The database uses Drizzle ORM for type-safe queries and schema management, with automatic migration support.

## File Processing Architecture

The application implements a sophisticated Excel file processing system:

- **Client-side Processing**: Uses SheetJS to parse Excel files in the browser before upload
- **Data Validation**: Zod schemas validate data structure before database insertion
- **Batch Processing**: Supports large file uploads with progress tracking
- **Error Handling**: Comprehensive error reporting with detailed failure logs
- **Multiple Upload Modes**: Supports initial uploads and weekly updates with different processing logic

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