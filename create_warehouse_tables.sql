-- Warehouse Inventory Table
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  style_number VARCHAR(100),
  color VARCHAR(100),
  size VARCHAR(50),
  inseam VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(50),
  received_date DATE,
  available_date DATE,
  allocated_to_store VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouse_inv_sku ON warehouse_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_warehouse_inv_style ON warehouse_inventory(style_number);
CREATE INDEX IF NOT EXISTS idx_warehouse_inv_color ON warehouse_inventory(color);
CREATE INDEX IF NOT EXISTS idx_warehouse_inv_source ON warehouse_inventory(source);

-- Warehouse Distribution Plans Table
CREATE TABLE IF NOT EXISTS warehouse_distribution_plans (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL UNIQUE,
  style_number VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(255),
  total_boxes INTEGER NOT NULL,
  total_pieces INTEGER NOT NULL,
  total_cost NUMERIC,
  order_date DATE,
  expected_arrival_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dist_plan_style ON warehouse_distribution_plans(style_number);
CREATE INDEX IF NOT EXISTS idx_dist_plan_status ON warehouse_distribution_plans(status);
CREATE INDEX IF NOT EXISTS idx_dist_plan_created ON warehouse_distribution_plans(created_at);

-- Warehouse Distribution Details Table
CREATE TABLE IF NOT EXISTS warehouse_distribution_details (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL,
  distribution_phase VARCHAR(50),
  target_store VARCHAR(50),
  sku VARCHAR(50),
  color VARCHAR(100),
  size VARCHAR(50),
  quantity INTEGER NOT NULL,
  priority VARCHAR(50),
  rationale TEXT,
  status VARCHAR(50) DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dist_detail_plan ON warehouse_distribution_details(plan_id);
CREATE INDEX IF NOT EXISTS idx_dist_detail_store ON warehouse_distribution_details(target_store);
CREATE INDEX IF NOT EXISTS idx_dist_detail_sku ON warehouse_distribution_details(sku);
CREATE INDEX IF NOT EXISTS idx_dist_detail_phase ON warehouse_distribution_details(distribution_phase);
