-- Platform-wide key-value settings (favicon URL, logo URL, etc.)
CREATE TABLE IF NOT EXISTS platform_settings (
  key   text        PRIMARY KEY,
  value text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
