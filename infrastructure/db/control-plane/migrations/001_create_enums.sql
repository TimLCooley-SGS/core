-- Control Plane Migration 001: Create enum types
-- These enums are used across multiple control plane tables.

CREATE TYPE org_status AS ENUM ('provisioning', 'active', 'suspended', 'archived');

CREATE TYPE identity_org_link_status AS ENUM ('active', 'suspended', 'removed');

CREATE TYPE sgs_staff_role AS ENUM ('admin', 'support', 'engineering', 'billing');

CREATE TYPE sgs_staff_status AS ENUM ('active', 'inactive');

CREATE TYPE impersonation_status AS ENUM ('active', 'ended', 'timed_out');
