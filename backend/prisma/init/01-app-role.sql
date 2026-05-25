-- Runs once on first container start.
-- The application MUST connect as a non-superuser, otherwise PostgreSQL
-- silently bypasses Row-Level Security (superusers and table owners with
-- BYPASSRLS ignore policies). This role is our RLS-enforced app identity.

CREATE ROLE society_app WITH LOGIN PASSWORD 'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;

GRANT CONNECT ON DATABASE society_saas TO society_app;
GRANT USAGE ON SCHEMA public TO society_app;

-- Prisma migrations run as `postgres` (owner) and create tables; grant the
-- app role DML rights on everything, now and in the future.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO society_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO society_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO society_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO society_app;
