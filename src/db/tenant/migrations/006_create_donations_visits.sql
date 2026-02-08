-- Tenant Migration 006: Donations & Visits

CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES persons(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  campaign text,                        -- Nullable; fundraising campaign
  donation_date timestamptz NOT NULL DEFAULT now(),
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_person ON donations (person_id);
CREATE INDEX idx_donations_date ON donations (donation_date);
CREATE INDEX idx_donations_campaign ON donations (campaign) WHERE campaign IS NOT NULL;

CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES persons(id),
  visit_type visit_type NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_person ON visits (person_id);
CREATE INDEX idx_visits_date ON visits (visited_at);
CREATE INDEX idx_visits_type ON visits (visit_type);
