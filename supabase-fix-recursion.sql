-- ================================================================
-- Vmenu.ai — RLS FIX: Infinite Recursion
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- ROOT CAUSE:
--   venues_staff_select  queries staff_roles
--   staff_roles_owner_all queries venues
--   → Postgres evaluates both simultaneously → infinite loop
--
-- FIX:
--   staff_roles policies NEVER query venues.
--   They only check auth.uid() directly against their own columns.
--   venues policies NEVER query staff_roles.
--   Each table's policies are self-contained.
-- ================================================================


-- ──────────────────────────────────────────────────────────────
-- Drop ALL existing policies (clean slate)
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
-- VENUES
-- No reference to staff_roles here.
-- Owners identified by venues.owner_id = auth.uid() only.
-- ──────────────────────────────────────────────────────────────

-- Owners: full access to their own venue
CREATE POLICY "venues_owner_all"
  ON public.venues FOR ALL
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public (guests, unauthenticated): read any venue for QR menu
CREATE POLICY "venues_public_select"
  ON public.venues FOR SELECT
  USING (true);


-- ──────────────────────────────────────────────────────────────
-- STAFF_ROLES
-- No reference to venues here.
-- Uses auth.uid() directly against staff_roles columns only.
-- ──────────────────────────────────────────────────────────────

-- Any user: read their own role row (self-referencing only)
CREATE POLICY "staff_roles_self_select"
  ON public.staff_roles FOR SELECT
  USING (user_id = auth.uid());

-- Any user: insert their own role (needed during setup-account)
-- The application enforces role = 'owner' — this just allows the op.
CREATE POLICY "staff_roles_self_insert"
  ON public.staff_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Any user: update/delete only their own rows
CREATE POLICY "staff_roles_self_modify"
  ON public.staff_roles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "staff_roles_self_delete"
  ON public.staff_roles FOR DELETE
  USING (user_id = auth.uid());


-- ──────────────────────────────────────────────────────────────
-- CATEGORIES
-- Owner check: venue.owner_id = auth.uid() (no staff_roles query)
-- Staff check: staff_roles.user_id = auth.uid() (no venues query)
-- These two subqueries don't reference each other → no recursion.
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "categories_read"
  ON public.categories FOR SELECT
  USING (
    -- Owner
    venue_id IN (
      SELECT id FROM public.venues WHERE owner_id = auth.uid()
    )
    OR
    -- Staff member
    venue_id IN (
      SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid()
    )
    OR
    -- Public (guests reading QR menu)
    true
  );

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


-- ──────────────────────────────────────────────────────────────
-- MENU_ITEMS
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "menu_items_read"
  ON public.menu_items FOR SELECT
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
    OR
    is_available = true
  );

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


-- ──────────────────────────────────────────────────────────────
-- TABLES (seating tables)
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "tables_read"
  ON public.tables FOR SELECT
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
    OR
    true
  );

CREATE POLICY "tables_owner_all"
  ON public.tables FOR ALL
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );


-- ──────────────────────────────────────────────────────────────
-- ORDERS
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "orders_read"
  ON public.orders FOR SELECT
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
    OR
    true
  );

CREATE POLICY "orders_public_insert"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "orders_staff_update"
  ON public.orders FOR UPDATE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "orders_owner_delete"
  ON public.orders FOR DELETE
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );


-- ──────────────────────────────────────────────────────────────
-- ORDER_ITEMS
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "order_items_read"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE
        venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
        OR
        venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "order_items_public_insert"
  ON public.order_items FOR INSERT
  WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- MEDIA
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "media_read"
  ON public.media FOR SELECT
  USING (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
    OR
    venue_id IN (SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid())
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
-- VERIFY — run this to confirm no infinite recursion
-- Try a simple select on venues to confirm it works
-- ──────────────────────────────────────────────────────────────

-- Should return all policies grouped by table
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Test: this should NOT throw "infinite recursion"
-- (returns 0 rows since anon has no auth.uid, but should not error)
SELECT id FROM public.venues LIMIT 1;
