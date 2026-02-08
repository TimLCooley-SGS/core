-- Tenant Migration 001: Create enum types
-- These enums are used across multiple tenant tables.

CREATE TYPE person_status AS ENUM ('active', 'inactive', 'merged');

CREATE TYPE household_role AS ENUM ('primary', 'co_primary', 'dependent', 'other');

CREATE TYPE membership_status AS ENUM ('active', 'expired', 'cancelled', 'pending_payment');

CREATE TYPE membership_plan_status AS ENUM ('active', 'archived');

CREATE TYPE seat_action AS ENUM ('assigned', 'unassigned', 'transferred');

CREATE TYPE staff_assignment_status AS ENUM ('active', 'inactive');

CREATE TYPE override_type AS ENUM ('grant', 'revoke');

CREATE TYPE merge_request_status AS ENUM ('pending', 'approved', 'completed', 'rejected');

CREATE TYPE merge_log_action AS ENUM ('fk_repointed', 'field_updated', 'archived');

CREATE TYPE visit_type AS ENUM ('day_pass', 'member_visit', 'event', 'program', 'other');

CREATE TYPE audit_actor_type AS ENUM ('staff', 'patron', 'system', 'sgs_support');

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'merge', 'login', 'logout', 'assign', 'unassign', 'transfer');
