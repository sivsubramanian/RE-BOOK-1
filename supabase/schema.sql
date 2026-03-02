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
-- 5. STORAGE BUCKET FOR BOOK IMAGES
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
-- 6. INCREMENT VIEWS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_book_views(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.books SET views_count = views_count + 1 WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. ANALYTICS FUNCTIONS
-- ============================================================
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
