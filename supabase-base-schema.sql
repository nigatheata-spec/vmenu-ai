-- ================================================================
-- Vmenu.ai — BASE SCHEMA
-- Run this FIRST in a brand-new Supabase project, before any other SQL file.
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ================================================================

-- ── venues ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venues (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  owner_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  city       text,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── staff_roles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id   uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── categories ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  name_en    text,
  description text,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── menu_items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  category_id  uuid        REFERENCES public.categories(id) ON DELETE SET NULL,
  name         text        NOT NULL,
  name_en      text,
  description  text,
  price        numeric     NOT NULL DEFAULT 0,
  image_url    text,
  is_available boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── tables (restaurant seating) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tables (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  table_number integer     NOT NULL DEFAULT 1,
  name         text,
  seats        integer     NOT NULL DEFAULT 4,
  status       text        NOT NULL DEFAULT 'free',
  qr_url       text,
  qr_data_url  text,
  menu_url     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Unique: one table_number per venue
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tables_venue_table_number_key'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_venue_table_number_key UNIQUE (venue_id, table_number);
  END IF;
END $$;

-- ── orders ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  table_id     uuid        REFERENCES public.tables(id) ON DELETE SET NULL,
  status       text        NOT NULL DEFAULT 'pending',
  total        numeric     NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── order_items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid        REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name         text        NOT NULL,
  price        numeric     NOT NULL DEFAULT 0,
  quantity     integer     NOT NULL DEFAULT 1,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── media ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  url          text        NOT NULL,
  type         text        NOT NULL DEFAULT 'image',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Verify ───────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
