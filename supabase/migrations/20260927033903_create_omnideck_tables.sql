/*
# OmniDeck Core Schema — Multi-user Cloud Sync

## Overview
Creates the full cloud-backed data model for OmniDeck flashcards.
All tables are user-scoped with RLS so each user only sees their own data.

## New Tables

1. `decks` — Flashcard decks owned by a user
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - name (text)
   - exam_date (bigint, nullable — epoch ms)
   - final_review_hours (int, default 48)
   - created_at (timestamptz)

2. `cards` — Individual flashcards belonging to a deck
   - id (uuid, PK)
   - deck_id (uuid, FK to decks ON DELETE CASCADE)
   - user_id (uuid, defaults to auth.uid())
   - card_type (text: 'basic' | 'occlusion')
   - front_text, back_text (text)
   - front_image, back_image (text, nullable — base64 data URLs)
   - tags (text[])
   - sort_order (int)
   - masks (jsonb — array of {x,y,w,h} rects)
   - FSRS scheduling fields: stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, due (all numeric)
   - created_at (timestamptz)

3. `review_logs` — Every review event for analytics
   - id (uuid, PK)
   - card_id (uuid, FK to cards ON DELETE CASCADE)
   - deck_id (uuid, FK to decks ON DELETE CASCADE)
   - user_id (uuid, defaults to auth.uid())
   - rating (text: 'Again' | 'Hard' | 'Good' | 'Easy')
   - reviewed_at (timestamptz)
   - time_spent_ms (int, nullable — time per card in milliseconds)

4. `user_settings` — Per-user app preferences
   - id (uuid, PK, defaults to auth.uid())
   - garden_enabled (boolean, default true)
   - theme (text: 'light' | 'dark', default 'light')

## Security
- RLS enabled on all tables.
- All tables scoped to `authenticated` users with `auth.uid() = user_id` ownership checks.
- `user_id` columns default to `auth.uid()` so inserts work without explicitly passing user_id.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).
*/

-- Decks
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_date bigint,
  final_review_hours int NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_decks" ON decks;
CREATE POLICY "select_own_decks" ON decks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_decks" ON decks;
CREATE POLICY "insert_own_decks" ON decks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_decks" ON decks;
CREATE POLICY "update_own_decks" ON decks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_decks" ON decks;
CREATE POLICY "delete_own_decks" ON decks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type text NOT NULL DEFAULT 'basic',
  front_text text NOT NULL DEFAULT '',
  back_text text NOT NULL DEFAULT '',
  front_image text,
  back_image text,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  masks jsonb NOT NULL DEFAULT '[]',
  stability double precision NOT NULL DEFAULT 0,
  difficulty double precision NOT NULL DEFAULT 0,
  elapsed_days double precision NOT NULL DEFAULT 0,
  scheduled_days double precision NOT NULL DEFAULT 0,
  reps int NOT NULL DEFAULT 0,
  lapses int NOT NULL DEFAULT 0,
  state int NOT NULL DEFAULT 0,
  last_review bigint,
  due bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cards" ON cards;
CREATE POLICY "select_own_cards" ON cards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cards" ON cards;
CREATE POLICY "insert_own_cards" ON cards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cards" ON cards;
CREATE POLICY "update_own_cards" ON cards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cards" ON cards;
CREATE POLICY "delete_own_cards" ON cards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);

-- Review Logs
CREATE TABLE IF NOT EXISTS review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  time_spent_ms int
);

ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_review_logs" ON review_logs;
CREATE POLICY "select_own_review_logs" ON review_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_review_logs" ON review_logs;
CREATE POLICY "insert_own_review_logs" ON review_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_review_logs" ON review_logs;
CREATE POLICY "update_own_review_logs" ON review_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_review_logs" ON review_logs;
CREATE POLICY "delete_own_review_logs" ON review_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_review_logs_deck_id ON review_logs(deck_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_id ON review_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at);

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_enabled boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'light'
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = id);
