-- =============================================================================
-- PRODUCTION-READY SUPABASE POSTGRESQL MIGRATION SCRIPT
-- Application: VERO Luxury E-Commerce Platform
-- Database: PostgreSQL 15+ (Supabase Compatible)
-- Idempotent & Non-Destructive: 100% Safe for Re-execution on Existing Databases
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USERS & PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT 'default',
  phone TEXT,
  role TEXT DEFAULT 'customer',
  tier TEXT DEFAULT 'Bronze',
  loyalty_points INTEGER DEFAULT 250,
  total_spent NUMERIC(12, 2) DEFAULT 0.00,
  addresses JSONB DEFAULT '[]'::jsonb,
  redeemed_rewards TEXT[] DEFAULT ARRAY[]::TEXT[],
  password_hash TEXT,
  session_token TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations for users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='loyalty_points') THEN
    ALTER TABLE public.users ADD COLUMN loyalty_points INTEGER DEFAULT 250;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='total_spent') THEN
    ALTER TABLE public.users ADD COLUMN total_spent NUMERIC(12, 2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='tier') THEN
    ALTER TABLE public.users ADD COLUMN tier TEXT DEFAULT 'Bronze';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='role') THEN
    ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='avatar') THEN
    ALTER TABLE public.users ADD COLUMN avatar TEXT DEFAULT 'default';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone') THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='addresses') THEN
    ALTER TABLE public.users ADD COLUMN addresses JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='redeemed_rewards') THEN
    ALTER TABLE public.users ADD COLUMN redeemed_rewards TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='password_hash') THEN
    ALTER TABLE public.users ADD COLUMN password_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='session_token') THEN
    ALTER TABLE public.users ADD COLUMN session_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='last_login_at') THEN
    ALTER TABLE public.users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.users;

-- =============================================================================
-- 2. CATEGORIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  slug TEXT UNIQUE,
  image TEXT,
  description TEXT,
  parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations for categories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='name_ar') THEN
    ALTER TABLE public.categories ADD COLUMN name_ar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='name_en') THEN
    ALTER TABLE public.categories ADD COLUMN name_en TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='slug') THEN
    ALTER TABLE public.categories ADD COLUMN slug TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='description') THEN
    ALTER TABLE public.categories ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='parent_id') THEN
    ALTER TABLE public.categories ADD COLUMN parent_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='status') THEN
    ALTER TABLE public.categories ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='sort_order') THEN
    ALTER TABLE public.categories ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='updated_at') THEN
    ALTER TABLE public.categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Default Categories Seeding with verified high quality imagery
INSERT INTO public.categories (id, name, name_en, name_ar, slug, image)
VALUES
  ('fine-jewelry', 'Fine Jewelry', 'Fine Jewelry', 'المجوهرات الراقية', 'fine-jewelry', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_4xPadl5w6Pl2wmap9TNWjuW3eRqmSaee8UcVUYb5Ob0tjxyVXXgSUz8bd800TgShznRuwLsCSE8fL8g54lW8D6Y2Wqn77Y3VnnDy11ZQQyS78UrFyUgxqRXe83BtXdaR7o05YC071Tjfyge5uII8vI9eb_n0zITggflZzz8_ocIceRDAsQovQqPZTN6SXT9FkEnH750_FvFUxz-___-L_RW-wCIyddPds8SWGNUvJZlb-z3tgbVqUqsnmttQOxLDZXqdfrdHuOs'),
  ('timepieces', 'Timepieces', 'Timepieces', 'الساعات الفاخرة', 'timepieces', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHURVDMw0Ut_yNnemHeLgqN9kEmRJy9KfyIJhWGm36fQh-CMtrO0pGYuaCr4MR-OaDy0sUnfzCwvRWYY9815RVkpasZq00PZ0fRbmOmCVpkPwSWKRtiicrCUREgDhVRGMuHYa792wqM27VJFjYjxLBhHEpkVf0Ipvb3HquyCydhbrE5uPWIC5KS6E4w4d31wBTOnNQIu3ooZafSZ0qWewaHaQeiPuHaoRpnPOY5j01Hhjk48HWuTgKuMfPyIs5QbInR7O3tUJq5c8'),
  ('necklaces', 'Necklaces', 'Necklaces', 'القلائد والسلاسل', 'necklaces', '/images/luxury-necklace-banner.jpg'),
  ('rings', 'Rings', 'Rings', 'الخواتم', 'rings', '/images/sculpted-aurelian-ring.jpg'),
  ('earrings', 'Earrings', 'Earrings', 'الأقراط', 'earrings', '/images/desert-moon-hoops.jpg'),
  ('bracelets', 'Bracelets', 'Bracelets', 'الأساور', 'bracelets', '/images/eternal-bangle.jpg'),
  ('leather-goods', 'Leather Goods', 'Leather Goods', 'المنتجات الجلدية', 'leather-goods', '/images/essential-cardholder.jpg'),
  ('accessories', 'Accessories', 'Accessories', 'الإكسسوارات', 'accessories', '/images/artisan-watch-roll.jpg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  slug = EXCLUDED.slug,
  image = COALESCE(EXCLUDED.image, categories.image);

-- =============================================================================
-- 3. PRODUCTS & INVENTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  description TEXT,
  description_ar TEXT,
  description_en TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  original_price NUMERIC(12, 2),
  sale_price NUMERIC(12, 2),
  sku TEXT,
  stock INTEGER DEFAULT 10,
  on_hand INTEGER DEFAULT 10,
  committed INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  unavailable INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 3,
  unit_cost NUMERIC(12, 2) DEFAULT 0.00,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  is_new BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  coming_soon BOOLEAN DEFAULT FALSE,
  pre_order BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  image TEXT,
  secondary_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  size_options TEXT[] DEFAULT ARRAY[]::TEXT[],
  materials TEXT[] DEFAULT ARRAY[]::TEXT[],
  material_options TEXT[] DEFAULT ARRAY[]::TEXT[],
  colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  details TEXT[] DEFAULT ARRAY[]::TEXT[],
  craftsmanship TEXT DEFAULT '',
  variants JSONB DEFAULT '[]'::jsonb,
  specifications JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations for products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='name_ar') THEN
    ALTER TABLE public.products ADD COLUMN name_ar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='name_en') THEN
    ALTER TABLE public.products ADD COLUMN name_en TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='description_ar') THEN
    ALTER TABLE public.products ADD COLUMN description_ar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='description_en') THEN
    ALTER TABLE public.products ADD COLUMN description_en TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='sku') THEN
    ALTER TABLE public.products ADD COLUMN sku TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='stock') THEN
    ALTER TABLE public.products ADD COLUMN stock INTEGER DEFAULT 10;
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='sale_price') THEN
    ALTER TABLE public.products ADD COLUMN sale_price NUMERIC(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='original_price') THEN
    ALTER TABLE public.products ADD COLUMN original_price NUMERIC(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_featured') THEN
    ALTER TABLE public.products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_bestseller') THEN
    ALTER TABLE public.products ADD COLUMN is_bestseller BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='coming_soon') THEN
    ALTER TABLE public.products ADD COLUMN coming_soon BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='pre_order') THEN
    ALTER TABLE public.products ADD COLUMN pre_order BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='points_earned') THEN
    ALTER TABLE public.products ADD COLUMN points_earned INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='variants') THEN
    ALTER TABLE public.products ADD COLUMN variants JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='specifications') THEN
    ALTER TABLE public.products ADD COLUMN specifications JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='seo_title') THEN
    ALTER TABLE public.products ADD COLUMN seo_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='seo_description') THEN
    ALTER TABLE public.products ADD COLUMN seo_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='image') THEN
    ALTER TABLE public.products ADD COLUMN image TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='secondary_images') THEN
    ALTER TABLE public.products ADD COLUMN secondary_images TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='size_options') THEN
    ALTER TABLE public.products ADD COLUMN size_options TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='material_options') THEN
    ALTER TABLE public.products ADD COLUMN material_options TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='details') THEN
    ALTER TABLE public.products ADD COLUMN details TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='craftsmanship') THEN
    ALTER TABLE public.products ADD COLUMN craftsmanship TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='gender') THEN
    ALTER TABLE public.products ADD COLUMN gender TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='products' AND constraint_name='chk_products_gender') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_gender CHECK (gender IS NULL OR gender IN ('Men', 'Women', 'Unisex'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);

-- Non-destructive backfill for existing products from specifications (does not modify products with no reliable gender)
UPDATE public.products
SET gender = 'Men'
WHERE gender IS NULL AND (
  specifications::text ILIKE '%gender:Men%'
);

UPDATE public.products
SET gender = 'Women'
WHERE gender IS NULL AND (
  specifications::text ILIKE '%gender:Women%'
);

UPDATE public.products
SET gender = 'Unisex'
WHERE gender IS NULL AND (
  specifications::text ILIKE '%gender:Unisex%'
);


-- =============================================================================
-- 4. PRODUCT IMAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  image_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. CART TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cart (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  selected_size TEXT,
  selected_material TEXT,
  selected_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. WISHLIST TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- =============================================================================
-- 7. ORDERS & FINANCIALS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE,
  user_id TEXT,
  email TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  governorate TEXT,
  shipping_zip TEXT,
  shipping_phone TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'unfulfilled',
  shipping_status TEXT DEFAULT 'not_shipped',
  status TEXT DEFAULT 'Order Placed',
  subtotal NUMERIC(12, 2) DEFAULT 0.00,
  shipping_cost NUMERIC(12, 2) DEFAULT 0.00,
  discount NUMERIC(12, 2) DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) DEFAULT 0.00,
  amount_refunded NUMERIC(12, 2) DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  earned_points INTEGER DEFAULT 0,
  used_points INTEGER DEFAULT 0,
  courier TEXT DEFAULT 'Aramex',
  tracking_number TEXT,
  tracking_url TEXT,
  shipment_date TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  estimated_delivery_date TIMESTAMPTZ,
  admin_notes TEXT,
  customer_notes TEXT,
  returns JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations for orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='fulfillment_status') THEN
    ALTER TABLE public.orders ADD COLUMN fulfillment_status TEXT DEFAULT 'unfulfilled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_status') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_status TEXT DEFAULT 'not_shipped';
  END IF;
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='estimated_delivery_date') THEN
    ALTER TABLE public.orders ADD COLUMN estimated_delivery_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='admin_notes') THEN
    ALTER TABLE public.orders ADD COLUMN admin_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_notes') THEN
    ALTER TABLE public.orders ADD COLUMN customer_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='returns') THEN
    ALTER TABLE public.orders ADD COLUMN returns JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='timeline') THEN
    ALTER TABLE public.orders ADD COLUMN timeline JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- =============================================================================
-- 8. ORDER ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2),
  quantity INTEGER DEFAULT 1,
  size TEXT,
  material TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 9. ORDER TRACKING & TIMELINE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'status_change',
  performed_by TEXT DEFAULT 'System',
  actor_role TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 10. ORDER RETURNS & REFUNDS TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_returns (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  refund_method TEXT NOT NULL DEFAULT 'original_payment',
  refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  restock_items BOOLEAN NOT NULL DEFAULT TRUE,
  restocked BOOLEAN NOT NULL DEFAULT FALSE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  refund_method TEXT NOT NULL DEFAULT 'original_payment',
  processed_by TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 11. INVENTORY ITEMS & TRANSACTIONS AUDIT
-- =============================================================================
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

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  sku TEXT NOT NULL,
  type TEXT NOT NULL,
  movement_type TEXT,
  quantity INTEGER NOT NULL,
  previous_on_hand INTEGER,
  new_on_hand INTEGER,
  previous_available INTEGER,
  new_available INTEGER,
  reference_type TEXT,
  reference_id TEXT,
  reason TEXT NOT NULL,
  performed_by TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 12. REVIEWS, RATINGS & COMMUNITY
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  user_email TEXT,
  rating NUMERIC(2, 1) NOT NULL,
  title TEXT,
  comment TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'approved',
  reply TEXT,
  reply_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id TEXT REFERENCES public.reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id TEXT REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  UNIQUE(review_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id TEXT REFERENCES public.reviews(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reporter_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id TEXT REFERENCES public.reviews(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 13. COUPONS & PROMOTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  discount_value NUMERIC(12, 2) DEFAULT 0.00,
  discount_type TEXT DEFAULT 'percentage',
  max_discount NUMERIC(12, 2),
  min_order_amount NUMERIC(12, 2) DEFAULT 0.00,
  active BOOLEAN DEFAULT TRUE,
  expiry_date TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default coupons
INSERT INTO public.coupons (id, code, discount_percent, discount_value, discount_type, max_discount, min_order_amount, active)
VALUES
  ('c-welcome10', 'WELCOME10', 10.00, 10.00, 'percentage', 2000.00, 5000.00, true),
  ('c-vero20', 'VERO20', 20.00, 20.00, 'percentage', 5000.00, 10000.00, true),
  ('c-vip50', 'VIP50', 50.00, 50.00, 'percentage', 15000.00, 30000.00, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  discount_percent = EXCLUDED.discount_percent,
  active = EXCLUDED.active;

-- =============================================================================
-- 14. LOYALTY POINTS & REWARDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'earn' | 'redeem' | 'adjustment' | 'deduction'
  description TEXT,
  reason TEXT,
  reference_id TEXT,
  performed_by TEXT DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 15. NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  order_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'order_update',
  is_read BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 16. ADDRESSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  governorate TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 17. AUDIT LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 18. ANALYTICS & VISITOR TELEMETRY TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  device_type TEXT DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  referrer TEXT,
  landing_page TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  path TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 19. HIGH-PERFORMANCE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_order ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON public.inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sku ON public.inventory_transactions(sku);
CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON public.order_tracking_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_vid ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_vid ON public.analytics_events(visitor_id);

-- =============================================================================
-- 20. AUTOMATIC TIMESTAMPS & TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_modtime') THEN
    CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_modtime') THEN
    CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_modtime') THEN
    CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_modtime') THEN
    CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_items_modtime') THEN
    CREATE TRIGGER update_inventory_items_modtime BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
  END IF;
END $$;

-- =============================================================================
-- 21. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Clean and idempotent RLS Policies
DO $$ BEGIN
  -- Public Read Policies
  DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
  CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public Read Products" ON public.products;
  CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public Read Product Images" ON public.product_images;
  CREATE POLICY "Public Read Product Images" ON public.product_images FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public Read Reviews" ON public.reviews;
  CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public Read Review Images" ON public.review_images;
  CREATE POLICY "Public Read Review Images" ON public.review_images FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
  CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);

  -- Full Access Policies for App Engine & Service API
  DROP POLICY IF EXISTS "Allow All Full Access Users" ON public.users;
  CREATE POLICY "Allow All Full Access Users" ON public.users FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Categories" ON public.categories;
  CREATE POLICY "Allow All Full Access Categories" ON public.categories FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Products" ON public.products;
  CREATE POLICY "Allow All Full Access Products" ON public.products FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Orders" ON public.orders;
  CREATE POLICY "Allow All Full Access Orders" ON public.orders FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Order Items" ON public.order_items;
  CREATE POLICY "Allow All Full Access Order Items" ON public.order_items FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Cart" ON public.cart;
  CREATE POLICY "Allow All Full Access Cart" ON public.cart FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Wishlist" ON public.wishlist;
  CREATE POLICY "Allow All Full Access Wishlist" ON public.wishlist FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Reviews" ON public.reviews;
  CREATE POLICY "Allow All Full Access Reviews" ON public.reviews FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Review Replies" ON public.review_replies;
  CREATE POLICY "Allow All Full Access Review Replies" ON public.review_replies FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Loyalty" ON public.loyalty_points;
  CREATE POLICY "Allow All Full Access Loyalty" ON public.loyalty_points FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Notifications" ON public.notifications;
  CREATE POLICY "Allow All Full Access Notifications" ON public.notifications FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Inventory Items" ON public.inventory_items;
  CREATE POLICY "Allow All Full Access Inventory Items" ON public.inventory_items FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Inventory Tx" ON public.inventory_transactions;
  CREATE POLICY "Allow All Full Access Inventory Tx" ON public.inventory_transactions FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Order Returns" ON public.order_returns;
  CREATE POLICY "Allow All Full Access Order Returns" ON public.order_returns FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Order Refunds" ON public.order_refunds;
  CREATE POLICY "Allow All Full Access Order Refunds" ON public.order_refunds FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Full Access Audit Logs" ON public.audit_logs;
  CREATE POLICY "Allow All Full Access Audit Logs" ON public.audit_logs FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Analytics Sessions" ON public.analytics_sessions;
  CREATE POLICY "Allow All Analytics Sessions" ON public.analytics_sessions FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Analytics Pageviews" ON public.analytics_page_views;
  CREATE POLICY "Allow All Analytics Pageviews" ON public.analytics_page_views FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Analytics Prodviews" ON public.analytics_product_views;
  CREATE POLICY "Allow All Analytics Prodviews" ON public.analytics_product_views FOR ALL USING (true);

  DROP POLICY IF EXISTS "Allow All Analytics Events" ON public.analytics_events;
  CREATE POLICY "Allow All Analytics Events" ON public.analytics_events FOR ALL USING (true);
END $$;

-- =============================================================================
-- 22. REALTIME PUBLICATION SETUP
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- =============================================================================
-- 23. STORAGE BUCKET CONFIGURATION
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-assets', 'product-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public Read Storage" ON storage.objects;
  CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (bucket_id = 'product-assets');

  DROP POLICY IF EXISTS "Public Upload Storage" ON storage.objects;
  CREATE POLICY "Public Upload Storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-assets');
END $$;
