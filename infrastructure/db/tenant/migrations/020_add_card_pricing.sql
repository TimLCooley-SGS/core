ALTER TABLE membership_card_designs
  ADD COLUMN price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN pos_visible boolean NOT NULL DEFAULT false;
