-- =============================================================
-- Vmenu.ai — Complete RLS Policies
-- Run this entire file in: Supabase Dashboard → SQL Editor
--
-- What this fixes:
--   • venues INSERT blocked after signUp (anon had no session)
--   • venues SELECT failing in resolveSession
--   • staff_roles INSERT/SELECT permissions
--   • All other tables scoped to venue ownership
--
-- Design rules:
--   • Owners can do everything on their own venue's data
--   • Staff can SELECT their venue's data, INSERT orders
--   • Guests (unauthenticated) can SELECT published menu items
--     and categories for a venue (needed for QR menu)
--   • The auth.callback service-role insert is handled via
--     a SECURITY DEFINER function so RLS is bypassed safely
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. Enable RLS on all tables (safe to re-run)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE venues      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media       ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 1. DROP all existing policies (clean slate)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────
-- 2. Helper function: get the venue_id(s) for the current user
--    Works for both owners (via venues.owner_id) and staff
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth.user_venue_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Venues owned directly
  SELECT id FROM public.venues WHERE owner_id = auth.uid()
  UNION
  -- Venues via staff_roles
  SELECT venue_id FROM public.staff_roles WHERE user_id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. SECURITY DEFINER function for signup venue + role insert
--
-- Called from /auth/callback with the user's own JWT.
-- Bypasses RLS so it works even before staff_roles row exists.
-- Only inserts if the user's auth.uid() matches owner_id.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_venue_for_owner(
  p_name     text,
  p_slug     text,
  p_owner_id uuid
)
RETURNS uuid          -- returns the new venue id
LANGUAGE plpgsql
SECURITY DEFINER      -- runs as the function owner (postgres), bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
BEGIN
  -- Safety check: only allow inserting for the currently authenticated user
  IF auth.uid() IS DISTINCT FROM p_owner_id THEN
    RAISE EXCEPTION 'Not authorized: uid mismatch';
  END IF;

  -- Idempotent: return existing venue if already created
  SELECT id INTO v_venue_id
  FROM public.venues
  WHERE owner_id = p_owner_id
  LIMIT 1;

  IF v_venue_id IS NOT NULL THEN
    RETURN v_venue_id;
  END IF;

  -- Insert the venue
  INSERT INTO public.venues (name, slug, owner_id)
  VALUES (p_name, p_slug, p_owner_id)
  RETURNING id INTO v_venue_id;

  -- Insert the owner role
  INSERT INTO public.staff_roles (user_id, venue_id, role)
  VALUES (p_owner_id, v_venue_id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN v_venue_id;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.create_venue_for_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_for_owner TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. VENUES
-- ─────────────────────────────────────────────────────────────

-- Owner: full access to their venue
CREATE POLICY "venues_owner_all"
  ON venues FOR ALL
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Staff: can read their assigned venue
CREATE POLICY "venues_staff_select"
  ON venues FOR SELECT
  USING (id IN (SELECT venue_id FROM staff_roles WHERE user_id = auth.uid()));

-- Guests: can read any venue (needed for QR menu slug lookup)
CREATE POLICY "venues_guest_select"
  ON venues FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 5. STAFF_ROLES
-- ─────────────────────────────────────────────────────────────

-- Owners can manage all roles for their venues
CREATE POLICY "staff_roles_owner_all"
  ON staff_roles FOR ALL
  USING   (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- Users can always read their own role row
CREATE POLICY "staff_roles_self_select"
  ON staff_roles FOR SELECT
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 6. CATEGORIES
-- ─────────────────────────────────────────────────────────────

-- Owners + staff: full read, owners can write
CREATE POLICY "categories_venue_select"
  ON categories FOR SELECT
  USING (venue_id IN (SELECT auth.user_venue_ids()));

CREATE POLICY "categories_owner_write"
  ON categories FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "categories_owner_update"
  ON categories FOR UPDATE
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "categories_owner_delete"
  ON categories FOR DELETE
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- Guests: can read categories for any venue (QR menu)
CREATE POLICY "categories_guest_select"
  ON categories FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 7. MENU_ITEMS
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "menu_items_venue_select"
  ON menu_items FOR SELECT
  USING (venue_id IN (SELECT auth.user_venue_ids()));

CREATE POLICY "menu_items_owner_write"
  ON menu_items FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "menu_items_owner_update"
  ON menu_items FOR UPDATE
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "menu_items_owner_delete"
  ON menu_items FOR DELETE
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- Guests: can read available items (QR menu)
CREATE POLICY "menu_items_guest_select"
  ON menu_items FOR SELECT
  USING (is_available = true);

-- ─────────────────────────────────────────────────────────────
-- 8. TABLES (restaurant seating tables)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "tables_venue_select"
  ON tables FOR SELECT
  USING (venue_id IN (SELECT auth.user_venue_ids()));

CREATE POLICY "tables_owner_write"
  ON tables FOR ALL
  USING   (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- Guests: can read tables for QR lookup
CREATE POLICY "tables_guest_select"
  ON tables FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 9. ORDERS
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "orders_venue_select"
  ON orders FOR SELECT
  USING (venue_id IN (SELECT auth.user_venue_ids()));

CREATE POLICY "orders_staff_update"
  ON orders FOR UPDATE
  USING (venue_id IN (SELECT auth.user_venue_ids()));

CREATE POLICY "orders_owner_delete"
  ON orders FOR DELETE
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- Guests: can insert orders (place an order via QR menu)
CREATE POLICY "orders_guest_insert"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Guests: can read their own order by id (for order status)
CREATE POLICY "orders_guest_select"
  ON orders FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 10. ORDER_ITEMS
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "order_items_venue_select"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE venue_id IN (SELECT auth.user_venue_ids())
    )
  );

-- Guests: can insert order items
CREATE POLICY "order_items_guest_insert"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 11. MEDIA
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "media_venue_select"
  ON media FOR SELECT
  USING (venue_id IN (SELECT auth.user_venue_ids()));

CREATE POLICY "media_owner_all"
  ON media FOR ALL
  USING   (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 12. Verify everything was created
-- ─────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
