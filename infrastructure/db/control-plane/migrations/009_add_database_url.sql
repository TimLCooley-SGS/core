-- Control Plane Migration 009: Add database_url to organizations
-- Stores the Supabase connection pooler URL so scripts don't need to
-- derive it at runtime (direct db.* hostnames are IPv6-only and the
-- pooler prefix varies per cluster).

ALTER TABLE organizations ADD COLUMN database_url text;
