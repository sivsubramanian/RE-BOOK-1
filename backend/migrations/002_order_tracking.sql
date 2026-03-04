-- ═══════════════════════════════════════════════════
-- 002 – Order tracking, reviews, and messages
-- ═══════════════════════════════════════════════════

-- Add order_status to transactions for extended lifecycle
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS order_status VARCHAR(30) DEFAULT NULL;

-- Expand the status CHECK constraint to include new lifecycle steps
-- Drop old constraint and add new one
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('requested', 'accepted', 'rejected', 'completed', 'cancelled'));

-- ═══════════════════════════════════════════════════
-- Reviews (post-completion feedback)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction ON reviews(transaction_id);

-- ═══════════════════════════════════════════════════
-- Messages (buyer-seller chat per transaction)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_tx ON messages(transaction_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(transaction_id, created_at);
