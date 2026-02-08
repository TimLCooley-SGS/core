-- Tenant Migration 007: Person Deduplication
-- Merge requests and merge logs for tracking person record merges.

CREATE TABLE person_merge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_person_id uuid NOT NULL REFERENCES persons(id),   -- Will be merged away
  target_person_id uuid NOT NULL REFERENCES persons(id),   -- Will survive
  status merge_request_status NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL REFERENCES persons(id),
  reviewed_by uuid REFERENCES persons(id),
  merge_strategy jsonb NOT NULL DEFAULT '{}',              -- Field-level decisions
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_merge_not_self CHECK (source_person_id != target_person_id)
);

CREATE INDEX idx_merge_requests_source ON person_merge_requests (source_person_id);
CREATE INDEX idx_merge_requests_target ON person_merge_requests (target_person_id);
CREATE INDEX idx_merge_requests_status ON person_merge_requests (status) WHERE status IN ('pending', 'approved');

CREATE TRIGGER trg_merge_requests_updated_at
  BEFORE UPDATE ON person_merge_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE person_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_request_id uuid NOT NULL REFERENCES person_merge_requests(id),
  table_name text NOT NULL,             -- e.g., "membership_seats"
  record_id uuid NOT NULL,
  action merge_log_action NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_merge_log_request ON person_merge_log (merge_request_id);
