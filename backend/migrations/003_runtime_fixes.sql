-- 003 - Runtime fixes for reviews, messages, and order statuses

-- Ensure rating is numeric-safe for averages and UI formatting
ALTER TABLE reviews
  ALTER COLUMN rating TYPE numeric USING rating::numeric;

-- Align order_status with shipping lifecycle states
ALTER TABLE transactions
  ALTER COLUMN order_status TYPE VARCHAR(30);

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_order_status_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_order_status_check
  CHECK (order_status IS NULL OR order_status IN ('pending', 'shipped', 'delivered', 'completed'));

-- Keep existing rows valid when migrating from older status names
UPDATE transactions
SET order_status = CASE
  WHEN order_status = 'book_given' THEN 'shipped'
  WHEN order_status = 'received' THEN 'delivered'
  ELSE order_status
END
WHERE order_status IN ('book_given', 'received');

-- Messages: ensure receiver and message columns exist
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message TEXT;

UPDATE messages
SET message = content
WHERE message IS NULL;

-- Convenience view to expose transactions as orders
CREATE OR REPLACE VIEW orders AS
SELECT
  id,
  book_id,
  buyer_id,
  seller_id,
  status,
  order_status,
  created_at,
  updated_at
FROM transactions;
