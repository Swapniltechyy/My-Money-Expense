-- My Money schema for Neon (public tables).
-- Neon Auth tables live in neon_auth. This file creates the app tables in public.

-- ── Authentication ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions (token);

-- ── Application Data ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_items (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '' REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '' REFERENCES users (id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES expense_items (id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL,
  time text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  quantity numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_periods (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '' REFERENCES users (id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  amount_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra_funds boolean NOT NULL DEFAULT false,
  carry_over_applied numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  user_id text PRIMARY KEY DEFAULT '' REFERENCES users (id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system',
  carry_over_unused boolean NOT NULL DEFAULT false,
  notify_budget_warnings boolean NOT NULL DEFAULT true,
  notify_daily_reminders boolean NOT NULL DEFAULT false,
  current_period_id text,
  hidden_category_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_categories (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '' REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  color text NOT NULL
);

CREATE TABLE IF NOT EXISTS additional_notes (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '' REFERENCES users (id) ON DELETE CASCADE,
  person_name text NOT NULL,
  amount numeric NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_items_user_id_idx ON expense_items (user_id);
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases (user_id);
CREATE INDEX IF NOT EXISTS purchases_item_id_idx ON purchases (item_id);
CREATE INDEX IF NOT EXISTS budget_periods_user_id_idx ON budget_periods (user_id);
CREATE INDEX IF NOT EXISTS custom_categories_user_id_idx ON custom_categories (user_id);
CREATE INDEX IF NOT EXISTS additional_notes_user_id_idx ON additional_notes (user_id);
