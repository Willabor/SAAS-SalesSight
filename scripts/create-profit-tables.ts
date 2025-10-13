import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(DATABASE_URL);

async function createProfitTables() {
  console.log("Creating profit analysis tables...");

  try {
    // Create sku_financial_data table
    await sql`
      CREATE TABLE IF NOT EXISTS sku_financial_data (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(50) NOT NULL UNIQUE,
        style_number VARCHAR(50),
        vendor_name VARCHAR(100),
        color VARCHAR(50),
        size VARCHAR(20),
        inseam VARCHAR(10),

        avg_selling_price NUMERIC,
        unit_cost NUMERIC,
        profit_per_unit NUMERIC,
        margin_pct NUMERIC,

        velocity_30d NUMERIC,
        velocity_90d NUMERIC,
        velocity_365d NUMERIC,
        velocity_alltime NUMERIC,

        current_inventory INTEGER DEFAULT 0,
        days_of_supply NUMERIC,

        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✓ Created sku_financial_data table");

    // Create indexes for sku_financial_data
    await sql`CREATE INDEX IF NOT EXISTS idx_sku_financial_sku ON sku_financial_data(sku)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sku_financial_style ON sku_financial_data(style_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sku_financial_vendor ON sku_financial_data(vendor_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sku_financial_updated ON sku_financial_data(last_updated)`;
    console.log("✓ Created indexes for sku_financial_data");

    // Create vendor_pricing table
    await sql`
      CREATE TABLE IF NOT EXISTS vendor_pricing (
        id SERIAL PRIMARY KEY,
        vendor_name VARCHAR(100) NOT NULL,
        style_number VARCHAR(50) NOT NULL,
        unit_cost NUMERIC NOT NULL,
        effective_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(vendor_name, style_number, effective_date)
      );
    `;
    console.log("✓ Created vendor_pricing table");

    // Create indexes for vendor_pricing
    await sql`CREATE INDEX IF NOT EXISTS idx_vendor_pricing_vendor ON vendor_pricing(vendor_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vendor_pricing_style ON vendor_pricing(style_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vendor_pricing_date ON vendor_pricing(effective_date)`;
    console.log("✓ Created indexes for vendor_pricing");

    // Create sku_profit_analysis table
    await sql`
      CREATE TABLE IF NOT EXISTS sku_profit_analysis (
        id SERIAL PRIMARY KEY,

        sku VARCHAR(50) NOT NULL,
        style_number VARCHAR(50) NOT NULL,
        vendor_name VARCHAR(100) NOT NULL,
        color VARCHAR(50) NOT NULL,
        size VARCHAR(20) NOT NULL,
        inseam VARCHAR(10),

        analysis_date DATE NOT NULL,
        analysis_timestamp TIMESTAMP DEFAULT NOW(),

        current_inventory INTEGER,
        days_of_supply NUMERIC,

        velocity_30d NUMERIC,
        velocity_90d NUMERIC,
        velocity_365d NUMERIC,
        velocity_trend VARCHAR(20),

        selling_price NUMERIC,
        unit_cost NUMERIC,
        profit_per_unit NUMERIC,
        margin_pct NUMERIC,

        shortage_units INTEGER,
        profit_opportunity NUMERIC,
        lost_revenue_per_day NUMERIC,
        cumulative_opportunity NUMERIC,

        recommended_action VARCHAR(50),
        recommended_boxes INTEGER,
        recommended_prepack_name VARCHAR(50),
        recommended_color VARCHAR(50),

        predicted_net_profit NUMERIC,
        predicted_revenue NUMERIC,
        predicted_holding_cost NUMERIC,
        predicted_opportunity_cost NUMERIC,
        predicted_roi NUMERIC,
        profitability_tier VARCHAR(20),

        urgency_level VARCHAR(20),
        days_until_stockout INTEGER,
        stockout_risk_score NUMERIC,

        actual_net_profit NUMERIC,
        actual_revenue NUMERIC,
        prediction_error NUMERIC,
        prediction_accuracy_pct NUMERIC,

        is_current BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(sku, analysis_date)
      );
    `;
    console.log("✓ Created sku_profit_analysis table");

    // Create indexes for sku_profit_analysis
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_date ON sku_profit_analysis(analysis_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_current ON sku_profit_analysis(is_current)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_style ON sku_profit_analysis(style_number, color)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_vendor ON sku_profit_analysis(vendor_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_opportunity ON sku_profit_analysis(profit_opportunity)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_urgency ON sku_profit_analysis(urgency_level, profit_opportunity)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_current_opportunities ON sku_profit_analysis(is_current, profit_opportunity)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profit_analysis_current_urgency ON sku_profit_analysis(is_current, urgency_level)`;
    console.log("✓ Created indexes for sku_profit_analysis");

    console.log("\n✅ All profit analysis tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
}

createProfitTables();
