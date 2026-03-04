-- ============================================================
-- RE-BOOK-1: Smart Campus Book Exchange Platform
-- Complete Supabase Database Schema with RLS
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT 'Computer Science',
  semester INTEGER NOT NULL DEFAULT 1 CHECK (semester >= 1 AND semester <= 8),
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read all profiles, update only their own
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, department, semester, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'department', 'Computer Science'),
    COALESCE((NEW.raw_user_meta_data ->> 'semester')::integer, 1),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. BOOKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT DEFAULT '',
  department TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  condition TEXT NOT NULL CHECK (condition IN ('Like New', 'Good', 'Fair')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT DEFAULT '',
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'requested', 'sold')),
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_seller ON public.books(seller_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);
CREATE INDEX IF NOT EXISTS idx_books_department ON public.books(department);
CREATE INDEX IF NOT EXISTS idx_books_semester ON public.books(semester);
CREATE INDEX IF NOT EXISTS idx_books_price ON public.books(price);
CREATE INDEX IF NOT EXISTS idx_books_created ON public.books(created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_books_fts ON public.books
  USING GIN (to_tsvector('english', title || ' ' || author || ' ' || COALESCE(description, '')));

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read books, only seller can insert/update/delete their own
CREATE POLICY "books_select_all" ON public.books
  FOR SELECT USING (true);

CREATE POLICY "books_insert_own" ON public.books
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "books_update_own" ON public.books
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "books_delete_own" ON public.books
  FOR DELETE USING (auth.uid() = seller_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'rejected', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate active requests for same book
  CONSTRAINT unique_active_request UNIQUE (book_id, buyer_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_book ON public.transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Buyer can read own transactions, seller can read transactions for their books
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Buyer can create transaction
CREATE POLICY "transactions_insert_buyer" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Seller can update transaction status (accept/reject)
CREATE POLICY "transactions_update_seller" ON public.transactions
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Buyer can cancel their own request
CREATE POLICY "transactions_update_buyer_cancel" ON public.transactions
  FOR UPDATE USING (auth.uid() = buyer_id AND status = 'requested')
  WITH CHECK (auth.uid() = buyer_id AND status = 'cancelled');

CREATE OR REPLACE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. AUTO-UPDATE BOOK STATUS ON TRANSACTION CHANGE
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_book_status_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    UPDATE public.books SET status = 'requested' WHERE id = NEW.book_id;
  ELSIF NEW.status = 'completed' THEN
    UPDATE public.books SET status = 'sold' WHERE id = NEW.book_id;
  ELSIF NEW.status IN ('rejected', 'cancelled') THEN
    -- Only reset to available if no other active requests
    IF NOT EXISTS (
      SELECT 1 FROM public.transactions 
      WHERE book_id = NEW.book_id 
      AND status IN ('requested', 'accepted') 
      AND id != NEW.id
    ) THEN
      UPDATE public.books SET status = 'available' WHERE id = NEW.book_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_transaction_status_change
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_book_status_on_transaction();

CREATE OR REPLACE TRIGGER on_transaction_created
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_book_status_on_transaction();

-- ============================================================
-- 5. FAVORITES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_book_favorite UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_book ON public.favorites(book_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('transaction_update', 'favorite', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Triggers insert via SECURITY DEFINER

-- Trigger: auto-notify on transaction status change
CREATE OR REPLACE FUNCTION public.notify_on_transaction_change()
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
  buyer_name TEXT;
  seller_name TEXT;
BEGIN
  SELECT title INTO book_title FROM public.books WHERE id = NEW.book_id;
  SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.buyer_id;
  SELECT full_name INTO seller_name FROM public.profiles WHERE id = NEW.seller_id;

  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (NEW.buyer_id, 'transaction_update', 'Request Accepted! 🎉',
      seller_name || ' accepted your request for "' || book_title || '".',
      jsonb_build_object('transaction_id', NEW.id, 'book_id', NEW.book_id));
  ELSIF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (NEW.buyer_id, 'transaction_update', 'Request Rejected',
      'Your request for "' || book_title || '" was declined.',
      jsonb_build_object('transaction_id', NEW.id, 'book_id', NEW.book_id));
  ELSIF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (NEW.buyer_id, 'transaction_update', 'Transaction Complete ✅',
      'Your exchange for "' || book_title || '" is complete!',
      jsonb_build_object('transaction_id', NEW.id, 'book_id', NEW.book_id));
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (NEW.seller_id, 'transaction_update', 'Sale Complete ✅',
      '"' || book_title || '" has been exchanged with ' || buyer_name || '.',
      jsonb_build_object('transaction_id', NEW.id, 'book_id', NEW.book_id));
  ELSIF NEW.status = 'cancelled' AND (OLD IS NULL OR OLD.status != 'cancelled') THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (NEW.seller_id, 'transaction_update', 'Request Cancelled',
      buyer_name || ' cancelled their request for "' || book_title || '".',
      jsonb_build_object('transaction_id', NEW.id, 'book_id', NEW.book_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_transaction_notify
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_transaction_change();

-- ============================================================
-- 7. STORAGE BUCKET FOR BOOK IMAGES
-- ============================================================
-- Run in Supabase Dashboard > Storage:
-- Create bucket "book-images" with public access
-- 
-- Or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('book-images', 'book-images', true);
--
-- Storage policies:
-- CREATE POLICY "book_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'book-images');
-- CREATE POLICY "book_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'book-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "book_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'book-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 8. INCREMENT VIEWS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_book_views(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.books SET views_count = views_count + 1 WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. ANALYTICS FUNCTIONS
-- ============================================================

-- ============================================================
-- 10. SAFE TRANSACTION REQUEST (race-condition prevention)
-- ============================================================
CREATE OR REPLACE FUNCTION public.safe_request_book(
  p_book_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID
)
RETURNS JSON AS $$
DECLARE
  book_status TEXT;
  existing_tx UUID;
  new_tx public.transactions%ROWTYPE;
BEGIN
  -- Lock the book row to prevent concurrent requests
  SELECT status INTO book_status
  FROM public.books WHERE id = p_book_id FOR UPDATE;

  IF book_status IS NULL THEN
    RETURN json_build_object('error', 'Book not found');
  END IF;

  IF book_status != 'available' THEN
    RETURN json_build_object('error', 'This book is no longer available');
  END IF;

  IF p_buyer_id = p_seller_id THEN
    RETURN json_build_object('error', 'You cannot request your own book');
  END IF;

  -- Check for existing active request
  SELECT id INTO existing_tx
  FROM public.transactions
  WHERE book_id = p_book_id AND buyer_id = p_buyer_id
    AND status IN ('requested', 'accepted');

  IF existing_tx IS NOT NULL THEN
    RETURN json_build_object('error', 'You already have an active request for this book');
  END IF;

  -- Update book status
  UPDATE public.books SET status = 'requested' WHERE id = p_book_id;

  -- Insert transaction
  INSERT INTO public.transactions (book_id, buyer_id, seller_id, status)
  VALUES (p_book_id, p_buyer_id, p_seller_id, 'requested')
  RETURNING * INTO new_tx;

  RETURN json_build_object(
    'data', json_build_object('id', new_tx.id, 'status', new_tx.status),
    'error', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION public.get_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_books', (SELECT COUNT(*) FROM public.books),
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'avg_price', (SELECT COALESCE(ROUND(AVG(price)::numeric, 2), 0) FROM public.books),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'completed_transactions', (SELECT COUNT(*) FROM public.transactions WHERE status = 'completed'),
    'most_demanded_dept', (
      SELECT department FROM public.books 
      GROUP BY department ORDER BY COUNT(*) DESC LIMIT 1
    ),
    'dept_distribution', (
      SELECT json_agg(json_build_object('department', department, 'count', cnt))
      FROM (SELECT department, COUNT(*) as cnt FROM public.books GROUP BY department ORDER BY cnt DESC) sub
    ),
    'monthly_listings', (
      SELECT json_agg(json_build_object('month', m, 'count', cnt))
      FROM (
        SELECT to_char(created_at, 'Mon') as m, COUNT(*) as cnt 
        FROM public.books 
        WHERE created_at > now() - interval '6 months'
        GROUP BY to_char(created_at, 'Mon'), date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
