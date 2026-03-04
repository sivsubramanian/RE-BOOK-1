-- RE-BOOK-1 Database Schema
-- Run: psql $DATABASE_URL < migrations/001_schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════
-- Users (replaces Supabase Auth + profiles table)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL DEFAULT '',
  department    VARCHAR(100) NOT NULL DEFAULT '',
  semester      INTEGER NOT NULL DEFAULT 1,
  role          VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ═══════════════════════════════════════════════════
-- Books
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS books (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(500) NOT NULL,
  author        VARCHAR(300) NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  department    VARCHAR(100) NOT NULL,
  semester      INTEGER NOT NULL,
  condition     VARCHAR(20) NOT NULL CHECK (condition IN ('Like New', 'Good', 'Fair')),
  price         NUMERIC(10, 2) NOT NULL,
  image_url     TEXT NOT NULL DEFAULT '',
  seller_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'requested', 'sold')),
  views_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_seller ON books(seller_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_department ON books(department);
CREATE INDEX IF NOT EXISTS idx_books_created ON books(created_at DESC);

-- ═══════════════════════════════════════════════════
-- Transactions
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  buyer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'rejected', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_book ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_tx_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tx_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

-- ═══════════════════════════════════════════════════
-- Favorites
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favorites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);

-- ═══════════════════════════════════════════════════
-- Notifications
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL DEFAULT 'system',
  title         VARCHAR(500) NOT NULL,
  message       TEXT NOT NULL DEFAULT '',
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ═══════════════════════════════════════════════════
-- Updated_at trigger function
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
