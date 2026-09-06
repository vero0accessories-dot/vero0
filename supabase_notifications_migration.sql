-- =============================================================================
-- VERO Luxury Boutique - Notifications Table Migration
-- =============================================================================

-- 1. Create notifications table if it doesn't exist
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

-- 2. Add columns if table already existed without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_id') THEN
    ALTER TABLE public.notifications ADD COLUMN order_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
    ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'order_update';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies
DROP POLICY IF EXISTS "Notifications: read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications: update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications: insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications: admin full control" ON public.notifications;

-- 6. RLS Policies
CREATE POLICY "Notifications: read own notifications" ON public.notifications
  FOR SELECT USING (
    auth.uid()::text = user_id 
    OR user_id = auth.jwt() ->> 'email' 
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Notifications: update own notifications" ON public.notifications
  FOR UPDATE USING (
    auth.uid()::text = user_id 
    OR user_id = auth.jwt() ->> 'email' 
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Notifications: insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Notifications: admin full control" ON public.notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 7. Realtime Publication (if Supabase realtime is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
