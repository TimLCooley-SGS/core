-- Tenant Migration 012: Membership Portal Tables
-- Portal settings, content modules, announcements, and member questions.

-- Enums
CREATE TYPE portal_module_type AS ENUM ('text','video','pdf','audio','html','file_download');
CREATE TYPE portal_module_status AS ENUM ('draft','published','archived');
CREATE TYPE portal_announcement_status AS ENUM ('draft','published','archived');
CREATE TYPE portal_question_status AS ENUM ('pending','answered','archived');

-- 1) Portal settings (singleton per org — upsert pattern)
CREATE TABLE portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT false,
  hero_image_url text,
  welcome_heading text NOT NULL DEFAULT 'Welcome to Your Membership Portal',
  welcome_body text NOT NULL DEFAULT '',
  button_text text NOT NULL DEFAULT 'Sign In',
  helper_text text NOT NULL DEFAULT 'Enter your email to access your membership portal.',
  accent_color text NOT NULL DEFAULT '#4E2C70',
  restricted_card_design_ids uuid[] DEFAULT NULL,
  portal_slug text,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_portal_settings_updated_at
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2) Portal modules (gallery content)
CREATE TABLE portal_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  module_type portal_module_type NOT NULL DEFAULT 'text',
  content_html text,
  embed_url text,
  file_url text,
  file_name text,
  file_size_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  status portal_module_status NOT NULL DEFAULT 'draft',
  restricted_card_design_ids uuid[] DEFAULT NULL,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_modules_status ON portal_modules (status);
CREATE INDEX idx_portal_modules_sort ON portal_modules (sort_order) WHERE status = 'published';

CREATE TRIGGER trg_portal_modules_updated_at
  BEFORE UPDATE ON portal_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3) Portal announcements
CREATE TABLE portal_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_html text NOT NULL DEFAULT '',
  status portal_announcement_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_announcements_status ON portal_announcements (status);
CREATE INDEX idx_portal_announcements_active ON portal_announcements (starts_at, ends_at) WHERE status = 'published';

CREATE TRIGGER trg_portal_announcements_updated_at
  BEFORE UPDATE ON portal_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4) Portal questions (submitted by members, managed by staff)
CREATE TABLE portal_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES persons(id),
  subject text NOT NULL,
  content text NOT NULL DEFAULT '',
  status portal_question_status NOT NULL DEFAULT 'pending',
  answer_html text,
  answered_by uuid REFERENCES persons(id),
  answered_at timestamptz,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_questions_status ON portal_questions (status);
CREATE INDEX idx_portal_questions_person ON portal_questions (person_id);

CREATE TRIGGER trg_portal_questions_updated_at
  BEFORE UPDATE ON portal_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
