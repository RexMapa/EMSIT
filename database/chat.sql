CREATE TABLE IF NOT EXISTS emsit_chats (
  id uuid PRIMARY KEY,
  visitor_hash text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  admin_read_id bigint NOT NULL DEFAULT 0,
  visitor_read_id bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS emsit_chat_messages (
  id bigserial PRIMARY KEY,
  chat_id uuid NOT NULL REFERENCES emsit_chats(id),
  client_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('visitor','admin')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, client_id)
);
CREATE INDEX IF NOT EXISTS emsit_chat_messages_thread_idx ON emsit_chat_messages (chat_id,id);
CREATE INDEX IF NOT EXISTS emsit_chats_updated_idx ON emsit_chats (updated_at DESC);
ALTER TABLE emsit_chats ADD COLUMN IF NOT EXISTS recovery_hash text;
ALTER TABLE emsit_chats ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS emsit_chats_recovery_idx ON emsit_chats(recovery_hash) WHERE recovery_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS emsit_chats_expiry_idx ON emsit_chats(expires_at) WHERE expires_at IS NOT NULL;
