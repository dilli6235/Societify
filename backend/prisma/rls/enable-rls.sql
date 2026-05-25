-- ============================================================
--  Row-Level Security (RLS) — the database-level tenant guarantee.
--
--  Apply AFTER `prisma migrate deploy`. Idempotent; safe to re-run:
--    psql "$DATABASE_OWNER_URL" -f prisma/rls/enable-rls.sql
--
--  Run as the table OWNER (postgres). The app connects as `society_app`
--  (NOSUPERUSER), so these policies are actually enforced for it.
--
--  Mechanism: every tenant-scoped query runs inside a transaction that
--  first executes:  SET LOCAL app.current_society_id = '<uuid>';
--  The policy below restricts visible/writable rows to that society.
--
--  Platform SUPER_ADMIN escape hatch:  SET LOCAL app.bypass_rls = 'on';
--
--  NOTE: Prisma keeps field names as column names (camelCase) unless
--  @map() is used, so columns are "societyId" / "userId" (quoted).
-- ============================================================

-- Returns TEXT (not uuid): Prisma maps `String` ids to Postgres `text`, so the
-- policies compare text = text. Returning uuid raises "operator does not
-- exist: text = uuid". DROP first so re-running can change the return type.
DROP FUNCTION IF EXISTS current_society_id() CASCADE;
CREATE OR REPLACE FUNCTION current_society_id() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.current_society_id', true), '');
$$;

CREATE OR REPLACE FUNCTION rls_bypass_enabled() RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('app.bypass_rls', true), 'off') = 'on';
$$;

-- Tables that carry a direct "societyId" column.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'users', 'user_invitations', 'device_tokens', 'notifications',
    'blocks', 'units', 'residencies',
    'gate_passes', 'checkin_logs',
    'maintenance_invoices', 'invoice_line_items', 'payments', 'expenses',
    'amenities', 'amenity_bookings',
    'complaints', 'complaint_comments',
    'notices', 'polls', 'poll_options', 'poll_votes',
    'vehicles', 'staff_members', 'staff_attendance', 'documents', 'sos_alerts',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (rls_bypass_enabled() OR "societyId" = current_society_id())
        WITH CHECK (rls_bypass_enabled() OR "societyId" = current_society_id());
    $f$, t);
  END LOOP;
END $$;

-- user_roles has no "societyId"; reachable only via its user. Lock it to the
-- session tenant by joining through users.
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON user_roles;
CREATE POLICY tenant_isolation ON user_roles
  USING (
    rls_bypass_enabled() OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_roles."userId"
        AND u."societyId" = current_society_id()
    )
  )
  WITH CHECK (
    rls_bypass_enabled() OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_roles."userId"
        AND u."societyId" = current_society_id()
    )
  );

-- refresh_tokens are keyed to a user (whose societyId may be NULL for
-- SUPER_ADMIN); protect via the owning user.
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON refresh_tokens;
CREATE POLICY tenant_isolation ON refresh_tokens
  USING (
    rls_bypass_enabled() OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = refresh_tokens."userId"
        AND (u."societyId" = current_society_id() OR u."societyId" IS NULL)
    )
  )
  WITH CHECK (true);

-- `societies` and `plans` are intentionally NOT under tenant RLS:
--   societies = the tenant root (resolved per-user by the app layer)
--   plans     = global catalog data
