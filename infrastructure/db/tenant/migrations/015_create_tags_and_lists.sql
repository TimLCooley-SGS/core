-- Tags & Contact Lists
-- Migration 015: Tags (reusable across persons and tickets) and contact lists (smart + static)

CREATE TYPE contact_list_type AS ENUM ('smart', 'static');
CREATE TYPE filter_logic       AS ENUM ('and', 'or');

-- Tags (org-defined, reusable across persons and tickets)
CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TRIGGER trg_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE person_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  uuid NOT NULL REFERENCES persons(id),
  tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, tag_id)
);

CREATE INDEX idx_person_tags_person ON person_tags (person_id);
CREATE INDEX idx_person_tags_tag ON person_tags (tag_id);

CREATE TABLE ticket_tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id  uuid NOT NULL REFERENCES ticket_types(id),
  tag_id          uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_type_id, tag_id)
);

CREATE INDEX idx_ticket_tags_ticket_type ON ticket_tags (ticket_type_id);
CREATE INDEX idx_ticket_tags_tag ON ticket_tags (tag_id);

-- Contact Lists
CREATE TABLE contact_lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  type         contact_list_type NOT NULL,
  filter_rules jsonb,
  created_by   uuid REFERENCES persons(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_contact_lists_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Static list membership
CREATE TABLE contact_list_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    uuid NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES persons(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  added_by   uuid REFERENCES persons(id),
  UNIQUE (list_id, person_id)
);

CREATE INDEX idx_contact_list_members_list ON contact_list_members (list_id);
CREATE INDEX idx_contact_list_members_person ON contact_list_members (person_id);

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE persons, person_tags, contact_list_members;
