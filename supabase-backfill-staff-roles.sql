-- =============================================================
-- supabase-backfill-staff-roles.sql
--
-- Run this ONCE in Supabase Dashboard → SQL Editor.
--
-- Problem: Owners are stored in venues.owner_id but may not
-- have a corresponding row in staff_roles. This causes
-- resolveSession() to find no venue via staff_roles join,
-- and the "No venue metadata" warning fires on every login.
--
-- This script backfills the missing staff_roles rows for all
-- existing venue owners, making the data model consistent.
-- It is idempotent — safe to run multiple times.
-- =============================================================

-- 1. Insert missing owner rows into staff_roles
INSERT INTO staff_roles (user_id, venue_id, role)
SELECT
  v.owner_id,
  v.id,
  'owner'
FROM venues v
WHERE v.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM staff_roles sr
    WHERE sr.user_id  = v.owner_id
      AND sr.venue_id = v.id
  );

-- 2. Verify the result
SELECT
  v.name   AS venue_name,
  v.owner_id,
  sr.role,
  sr.user_id IS NOT NULL AS has_staff_role
FROM venues v
LEFT JOIN staff_roles sr
  ON sr.user_id  = v.owner_id
  AND sr.venue_id = v.id
ORDER BY v.created_at DESC;
