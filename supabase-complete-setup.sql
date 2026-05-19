-- ================================================================
-- Vmenu.ai — COMPLETE SUPABASE SETUP (fixed)
-- Run this entire file in ONE go:
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- KEY FIX: Removed auth.user_venue_ids() function.
-- auth.* schema is forbidden for anon/authenticated roles.
-- All RLS policies now use inline subqueries directly against
-- public.venues and public.staff_roles — no helper function needed.
--
-- NOTE: auth.uid() is NOT in the auth schema.
-- It is a built-in Postgres function exposed by Supabase and is
-- always available in RLS policies. It is safe to use.
--
-- Safe to re-run — uses IF NOT EXISTS / OR REPLACE throughout.
-- ================================================================


-- ──────────────────────────────────────────────────────────────
-- STEP 1: Unique constraint on staff_roles(user_id, venue_id)
-- Required for ON CONFLICT upserts to work correctly.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_roles_user_id_venue_id_key'
  ) THEN
    ALTER TABLE public.staff_roles
      ADD CONSTRAINT staff_roles_user_id_venue_id_key
      UNIQUE (user_id, venue_id);
    RAISE NOTICE 'DONE: Added unique constraint on staff_roles(user_id, venue_id)';
  ELSE
    RAISE NOTICE 'SKIP: Unique constraint already exists';
  END IF;
END$$;


-- ──────────────────────────────────────────────────────────────
-- STEP 2: Drop the old broken function if it exists
-- (was in auth schema which authenticated users cannot access)
-- ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS auth.user_venue_ids();


-- ──────────────────────────────────────────────────────────────
-- STEP 3: Auto-assign owner role trigger
-- Fires AFTER every INSERT into venues.
-- Guarantees staff_roles is always populated regardless of which
-- code path created the venue.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_assign_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.staff_roles (user_id, venue_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, venue_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_owner_role ON public.venues;

CREATE TRIGGER trg_auto_assign_owner_role
  AFTER INSERT ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_owner_role();


-- ──────────────────────────────────────────────────────────────
-- STEP 4: create_venue_for_owner() — called from /auth/callback
-- SECURITY DEFINER so it bypasses RLS during signup confirmation.
-- Checks auth.uid() = p_owner_id before doing anything.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_venue_for_owner(
  p_name     text,
  p_slug     text,
  p_owner_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_owner_id THEN
    RAISE EXCEPTION 'Not authorized: uid mismatch';
  END IF;

  -- Return existing venue (idempotent)
  SELECT id INTO v_venue_id
  FROM public.venues
  WHERE owner_id = p_owner_id
  LIMIT 1;

  IF v_venue_id IS NOT NULL THEN
    INSERT INTO public.staff_roles (user_id, venue_id, role)
    VALUES (p_owner_id, v_venue_id, 'owner')
    ON CONFLICT (user_id, venue_id) DO NOTHING;
    RETURN v_venue_id;
  END IF;

  -- Insert venue — trigger auto-creates the staff_roles row
  INSERT INTO public.venues (name, slug, owner_id)
  VALUES (p_name, p_slug, p_owner_id)
  RETURNING id INTO v_venue_id;

  RETURN v_venue_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_venue_for_owner FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_venue_for_owner TO authenticated;


-- ──────────────────────────────────────────────────────────────
-- STEP 5: Backfill staff_roles for ALL existing venue owners
-- ──────────────────────────────────────────────────────────────
INSERT INTO public.staff_roles (user_id, venue_id, role)
SELECT v.owner_id, v.id, 'owner'
FROM   public.venues v
WHERE  v.owner_id IS NOT NULL
ON CONFLICT (user_id, venue_id) DO NOTHING;


-- ──────────────────────────────────────────────────────────────
-- STEP 6: Enable RLS on all tables
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.venues      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media       ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────────
-- STEP 7: Drop ALL existing policies (clean slate)
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END$$;


-- ──────────────────────────────────────────────────────────────
-- STEP 8: RLS Policies
--
-- auth.uid() = the current user's Supabase user ID.
-- This is a built-in function, NOT in the auth schema — safe to use.
--
-- All subqueries go against public tables only:
--   owned venues:  SELECT id       FROM public.venues      WHERE owner_id = auth.uid()
--   staff venues:  SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid()
-- ──────────────────────────────────────────────────────────────


-- ── venues ──────────────────────────────────────────────────────

CREATE POLICY "venues_owner_all"
  ON public.venues FOR ALL
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "venues_staff_select"
  ON public.venues FOR SELECT
  USING (
    id IN (
      SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "venues_public_select"
  ON public.venues FOR SELECT
  USING (true);


-- ── staff_roles ─────────────────────────────────────────────────

CREATE POLICY "staff_roles_owner_all"
  ON public.staff_roles FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM public.venues WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    venue_id IN (
      SELECT id FROM public.venues WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "staff_roles_self_select"
  ON public.staff_roles FOR SELECT
  USING (user_id = auth.uid());


-- ── categories ──────────────────────────────────────────────────

CREATE POLICY "categories_venue_select"
  ON public.categories FOR SELECT
  USING (
    venue_id IN (SELECT id       FROM public.venues      WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid())
  );

CREATE POLICY "categories_public_select"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "categories_owner_insert"
  ON public.categories FOR INSERT
  WITH CHECK (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

CREATE POLICY "categories_owner_update"
  ON public.categories FOR UPDATE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

CREATE POLICY "categories_owner_delete"
  ON public.categories FOR DELETE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );


-- ── menu_items ───────────────────────────────────────────────────

CREATE POLICY "menu_items_venue_select"
  ON public.menu_items FOR SELECT
  USING (
    venue_id IN (SELECT id       FROM public.venues      WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid())
  );

CREATE POLICY "menu_items_public_select"
  ON public.menu_items FOR SELECT
  USING (is_available = true);

CREATE POLICY "menu_items_owner_insert"
  ON public.menu_items FOR INSERT
  WITH CHECK (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

CREATE POLICY "menu_items_owner_update"
  ON public.menu_items FOR UPDATE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

CREATE POLICY "menu_items_owner_delete"
  ON public.menu_items FOR DELETE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );


-- ── tables ───────────────────────────────────────────────────────

CREATE POLICY "tables_venue_select"
  ON public.tables FOR SELECT
  USING (
    venue_id IN (SELECT id       FROM public.venues      WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid())
  );

CREATE POLICY "tables_public_select"
  ON public.tables FOR SELECT
  USING (true);

CREATE POLICY "tables_owner_all"
  ON public.tables FOR ALL
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );


-- ── orders ───────────────────────────────────────────────────────

CREATE POLICY "orders_venue_select"
  ON public.orders FOR SELECT
  USING (
    venue_id IN (SELECT id       FROM public.venues      WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid())
  );

CREATE POLICY "orders_staff_update"
  ON public.orders FOR UPDATE
  USING (
    venue_id IN (SELECT id       FROM public.venues      WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid())
  );

CREATE POLICY "orders_owner_delete"
  ON public.orders FOR DELETE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

CREATE POLICY "orders_public_insert"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "orders_public_select"
  ON public.orders FOR SELECT
  USING (true);


-- ── order_items ──────────────────────────────────────────────────

CREATE POLICY "order_items_venue_select"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE venue_id IN (
        SELECT id       FROM public.venues      WHERE owner_id = auth.uid()
        UNION
        SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid()
      )
    )
  );

CREATE POLICY "order_items_public_insert"
  ON public.order_items FOR INSERT
  WITH CHECK (true);


-- ── media ────────────────────────────────────────────────────────

CREATE POLICY "media_venue_select"
  ON public.media FOR SELECT
  USING (
    venue_id IN (SELECT id       FROM public.venues      WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id  = auth.uid())
  );

CREATE POLICY "media_owner_all"
  ON public.media FOR ALL
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );


-- ──────────────────────────────────────────────────────────────
-- STEP 9: Verify — check the output of all 4 queries below
-- ──────────────────────────────────────────────────────────────

-- 1. Unique constraint (expect 1 row)
SELECT conname AS constraint_name, contype AS type
FROM pg_constraint
WHERE conname = 'staff_roles_user_id_venue_id_key';

-- 2. Trigger (expect 1 row, enabled = 'O')
SELECT tgname AS trigger_name, tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'trg_auto_assign_owner_role';

-- 3. Staff roles populated (has_staff_role should be 'YES' for all rows)
SELECT
  v.name        AS venue_name,
  v.owner_id,
  sr.role,
  CASE WHEN sr.user_id IS NOT NULL THEN 'YES' ELSE 'MISSING' END AS has_staff_role
FROM public.venues v
LEFT JOIN public.staff_roles sr
  ON  sr.user_id  = v.owner_id
  AND sr.venue_id = v.id
ORDER BY v.created_at DESC;

-- 4. Policy count per table (every table should have at least 1)
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
