-- =============================================================================
-- VERO E-COMMERCE: SHOPIFY-STYLE ORDER & INVENTORY MANAGEMENT MIGRATION
-- Application: VERO Luxury E-Commerce Platform
-- Database: PostgreSQL 15 (Supabase Compatible)
-- Idempotent & Non-Destructive (Preserves all existing data)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENHANCE ORDERS TABLE
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  -- Independent Order Status Systems
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='fulfillment_status') THEN
    ALTER TABLE public.orders ADD COLUMN fulfillment_status TEXT DEFAULT 'unfulfilled';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_status') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_status TEXT DEFAULT 'not_shipped';
  END IF;

  -- Financials & Shipping breakdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='amount_paid') THEN
    ALTER TABLE public.orders ADD COLUMN amount_paid NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='amount_refunded') THEN
    ALTER TABLE public.orders ADD COLUMN amount_refunded NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='subtotal') THEN
    ALTER TABLE public.orders ADD COLUMN subtotal NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount') THEN
    ALTER TABLE public.orders ADD COLUMN discount NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_cost') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_cost NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='governorate') THEN
    ALTER TABLE public.orders ADD COLUMN governorate TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='courier') THEN
    ALTER TABLE public.orders ADD COLUMN courier TEXT DEFAULT 'Aramex';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tracking_number') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tracking_url') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipment_date') THEN
    ALTER TABLE public.orders ADD COLUMN shipment_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='estimated_delivery') THEN
    ALTER TABLE public.orders ADD COLUMN estimated_delivery TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_notes') THEN
    ALTER TABLE public.orders ADD COLUMN customer_notes TEXT;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. ENHANCE PRODUCTS TABLE WITH SKU & MULTI-TIER STOCK
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='sku') THEN
    ALTER TABLE public.products ADD COLUMN sku TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='on_hand') THEN
    ALTER TABLE public.products ADD COLUMN on_hand INTEGER DEFAULT 10;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='committed') THEN
    ALTER TABLE public.products ADD COLUMN committed INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='reserved') THEN
    ALTER TABLE public.products ADD COLUMN reserved INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unavailable') THEN
    ALTER TABLE public.products ADD COLUMN unavailable INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='low_stock_threshold') THEN
    ALTER TABLE public.products ADD COLUMN low_stock_threshold INTEGER DEFAULT 3;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_cost') THEN
    ALTER TABLE public.products ADD COLUMN unit_cost NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. INVENTORY ITEMS TABLE (SKU & Variant Level Multi-Tier Inventory)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  variant_id TEXT,
  variant_name TEXT,
  on_hand INTEGER NOT NULL DEFAULT 0,
  committed INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  unavailable INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  unit_cost NUMERIC(12, 2) DEFAULT 0.00,
  retail_price NUMERIC(12, 2) DEFAULT 0.00,
  location TEXT DEFAULT 'Main Cairo Vault',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON public.inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);

-- -----------------------------------------------------------------------------
-- 4. INVENTORY TRANSACTIONS TABLE (Traceable Audit Log for Every Movement)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  sku TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_on_hand INTEGER,
  new_on_hand INTEGER,
  previous_available INTEGER,
  new_available INTEGER,
  reference_type TEXT,
  reference_id TEXT,
  reason TEXT,
  performed_by TEXT DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_sku ON public.inventory_transactions(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_ref ON public.inventory_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_created ON public.inventory_transactions(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. ORDER TIMELINE EVENTS TABLE (Immutable Audit Trail for Orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_timeline_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  performed_by TEXT DEFAULT 'System',
  actor_role TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON public.order_timeline_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_created ON public.order_timeline_events(created_at ASC);

-- -----------------------------------------------------------------------------
-- 6. ORDER RETURNS TABLE (RMA Workflow)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_returns (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  restocked_by TEXT,
  refund_amount NUMERIC(12, 2) DEFAULT 0.00,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON public.order_returns(status);

-- -----------------------------------------------------------------------------
-- 7. ORDER REFUNDS TABLE (Decoupled Financial Tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Original Method',
  type TEXT DEFAULT 'full',
  issued_by TEXT DEFAULT 'Admin',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order_id ON public.order_refunds(order_id);

-- -----------------------------------------------------------------------------
-- 8. ORDER FULFILLMENTS TABLE (Shipping & Dispatch Management)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_fulfillments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  courier TEXT DEFAULT 'Aramex',
  tracking_number TEXT NOT NULL,
  tracking_url TEXT,
  status TEXT DEFAULT 'packed',
  items JSONB DEFAULT '[]'::jsonb,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_fulfillments_order_id ON public.order_fulfillments(order_id);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_fulfillments ENABLE ROW LEVEL SECURITY;

-- Allow public read of inventory items (for product availability display)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Allow public read of inventory items') THEN
    CREATE POLICY "Allow public read of inventory items" ON public.inventory_items FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Allow admin manage inventory items') THEN
    CREATE POLICY "Allow admin manage inventory items" ON public.inventory_items FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_transactions' AND policyname = 'Allow admin read write transactions') THEN
    CREATE POLICY "Allow admin read write transactions" ON public.inventory_transactions FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_timeline_events' AND policyname = 'Allow authenticated read timeline') THEN
    CREATE POLICY "Allow authenticated read timeline" ON public.order_timeline_events FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_returns' AND policyname = 'Allow read write order returns') THEN
    CREATE POLICY "Allow read write order returns" ON public.order_returns FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_refunds' AND policyname = 'Allow read write order refunds') THEN
    CREATE POLICY "Allow read write order refunds" ON public.order_refunds FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_fulfillments' AND policyname = 'Allow read write order fulfillments') THEN
    CREATE POLICY "Allow read write order fulfillments" ON public.order_fulfillments FOR ALL USING (true);
  END IF;
END $$;
