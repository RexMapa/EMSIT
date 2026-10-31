CREATE TABLE IF NOT EXISTS emsit_requests (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('message', 'booking')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  preferred_date date,
  preferred_time time,
  timezone text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'closed')),
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'booking' OR (preferred_date IS NOT NULL AND preferred_time IS NOT NULL AND timezone IS NOT NULL)),
  CHECK (kind = 'booking' OR status <> 'confirmed')
);
CREATE INDEX IF NOT EXISTS emsit_requests_created_idx ON emsit_requests (created_at DESC, id);
CREATE INDEX IF NOT EXISTS emsit_requests_status_idx ON emsit_requests (status, created_at DESC);
CREATE TABLE IF NOT EXISTS emsit_rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS emsit_rate_limits_expiry_idx ON emsit_rate_limits (expires_at);
