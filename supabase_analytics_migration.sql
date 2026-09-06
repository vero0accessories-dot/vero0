-- =============================================================================
-- PRODUCTION-READY SUPABASE MIGRATION FOR VERO ANALYTICS & VISITOR TRACKING
-- Application: VERO E-Commerce Platform
-- Database: PostgreSQL 15 (Supabase Compatible)
-- Idempotent & Safe for Re-execution (Preserves all existing data)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ANALYTICS SESSIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  device_type TEXT DEFAULT 'desktop', -- 'mobile' | 'tablet' | 'desktop'
  browser TEXT,
  os TEXT,
  referrer TEXT,
  landing_page TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id)
);

-- -----------------------------------------------------------------------------
-- 2. ANALYTICS PAGE VIEWS TABLE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. ANALYTICS PRODUCT VIEWS TABLE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. ANALYTICS EVENTS TABLE (General Event Stream)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  event_name TEXT NOT NULL, -- 'PAGE_VIEW' | 'PRODUCT_VIEW' | 'ADD_TO_CART' | 'REMOVE_FROM_CART' | 'WISHLIST_ADD' | 'CHECKOUT_STARTED' | 'PURCHASE' | 'SEARCH' | 'LOGIN' | 'SIGNUP'
  event_data JSONB DEFAULT '{}'::jsonb,
  path TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. HIGH-PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_vid ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created ON public.analytics_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_active ON public.analytics_sessions(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_vid ON public.analytics_page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_path ON public.analytics_page_views(path);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_created ON public.analytics_page_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_prodviews_product ON public.analytics_product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_prodviews_vid ON public.analytics_product_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_prodviews_created ON public.analytics_product_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_vid ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anonymous and Authenticated users can insert their own events safely
DO $$ 
BEGIN
  -- analytics_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sessions' AND policyname = 'Allow public insert into analytics_sessions') THEN
    CREATE POLICY "Allow public insert into analytics_sessions" ON public.analytics_sessions
      FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sessions' AND policyname = 'Allow admin read on analytics_sessions') THEN
    CREATE POLICY "Allow admin read on analytics_sessions" ON public.analytics_sessions
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin')
      );
  END IF;

  -- analytics_page_views
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_page_views' AND policyname = 'Allow public insert into analytics_page_views') THEN
    CREATE POLICY "Allow public insert into analytics_page_views" ON public.analytics_page_views
      FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_page_views' AND policyname = 'Allow admin read on analytics_page_views') THEN
    CREATE POLICY "Allow admin read on analytics_page_views" ON public.analytics_page_views
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin')
      );
  END IF;

  -- analytics_product_views
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_product_views' AND policyname = 'Allow public insert into analytics_product_views') THEN
    CREATE POLICY "Allow public insert into analytics_product_views" ON public.analytics_product_views
      FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_product_views' AND policyname = 'Allow admin read on analytics_product_views') THEN
    CREATE POLICY "Allow admin read on analytics_product_views" ON public.analytics_product_views
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin')
      );
  END IF;

  -- analytics_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Allow public insert into analytics_events') THEN
    CREATE POLICY "Allow public insert into analytics_events" ON public.analytics_events
      FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Allow admin read on analytics_events') THEN
    CREATE POLICY "Allow admin read on analytics_events" ON public.analytics_events
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin')
      );
  END IF;
END $$;
