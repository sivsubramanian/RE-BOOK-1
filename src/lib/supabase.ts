/**
 * Supabase Client Configuration
 * 
 * Initializes the Supabase client with environment variables.
 * Uses VITE_ prefix for Vite env variable exposure.
 * 
 * Security: API keys are safe to expose in frontend — RLS protects data.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/** Database type definitions for type safety */
export interface DbUser {
  id: string;
  email: string;
  full_name: string;
  department: string;
  semester: number;
  role: 'buyer' | 'seller' | 'admin';
  avatar_url: string | null;
  created_at: string;
}

export interface DbBook {
  id: string;
  title: string;
  author: string;
  description: string;
  department: string;
  semester: number;
  condition: 'Like New' | 'Good' | 'Fair';
  price: number;
  image_url: string;
  seller_id: string;
  status: 'available' | 'requested' | 'sold';
  views_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  seller?: DbUser;
}

export interface DbTransaction {
  id: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'requested' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  // Joined fields
  book?: DbBook;
  buyer?: DbUser;
  seller?: DbUser;
}
