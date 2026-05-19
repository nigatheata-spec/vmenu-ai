-- ================================================================
-- Vmenu.ai — Tables + Orders Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================


-- ──────────────────────────────────────────────────────────────
-- TABLES (restaurant seating tables)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS table_number  integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS name          text,
  ADD COLUMN IF NOT EXISTS seats         integer     NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS status        text        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS qr_url        text,        -- Supabase Storage CDN URL
  ADD COLUMN IF NOT EXISTS qr_data_url   text,        -- base64 PNG fallback
  ADD COLUMN IF NOT EXISTS menu_url      text;        -- URL encoded in the QR

-- Unique: one table_number per venue
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tables_venue_table_number_key'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_venue_table_number_key UNIQUE (venue_id, table_number);
  END IF;
END $$;

-- RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tables_venue_read"   ON public.tables;
DROP POLICY IF EXISTS "tables_public_read"  ON public.tables;
DROP POLICY IF EXISTS "tables_owner_write"  ON public.tables;

CREATE POLICY "tables_venue_read" ON public.tables FOR SELECT
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
    OR true  -- public (guests scanning QR)
  );

CREATE POLICY "tables_owner_write" ON public.tables FOR ALL
  USING (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- ORDERS
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_id    uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes       text,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_venue_read"    ON public.orders;
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_public_read"   ON public.orders;
DROP POLICY IF EXISTS "orders_staff_update"  ON public.orders;
DROP POLICY IF EXISTS "orders_owner_delete"  ON public.orders;

CREATE POLICY "orders_venue_read" ON public.orders FOR SELECT
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
    OR true  -- guests can see their own order status
  );

CREATE POLICY "orders_public_insert"  ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_staff_update"   ON public.orders FOR UPDATE
  USING (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR   venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid()));
CREATE POLICY "orders_owner_delete"   ON public.orders FOR DELETE
  USING (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- ORDER_ITEMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id     uuid        NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity    integer     NOT NULL CHECK (quantity > 0),
  unit_price  numeric     NOT NULL CHECK (unit_price >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_read"         ON public.order_items;
DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;

CREATE POLICY "order_items_read" ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE venue_id IN (
        SELECT id FROM public.venues WHERE owner_id = auth.uid()
        UNION
        SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid()
      )
    ) OR true
  );
CREATE POLICY "order_items_public_insert" ON public.order_items FOR INSERT WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- STORAGE: create qr-codes bucket (run once)
-- ──────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('qr-codes', 'qr-codes', true)
-- ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tables', 'orders', 'order_items')
ORDER BY table_name, ordinal_position;
