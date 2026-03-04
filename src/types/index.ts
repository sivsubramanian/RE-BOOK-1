/**
 * Shared type definitions for the RE-BOOK-1 platform
 * 
 * These types mirror the database schema and are used across
 * both frontend components and API service modules.
 */

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
  seller?: DbUser;
}

export interface DbTransaction {
  id: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'requested' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  book?: DbBook;
  buyer?: DbUser;
  seller?: DbUser;
}

export interface DbFavorite {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
  book?: DbBook;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: 'transaction_update' | 'favorite' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, string>;
  created_at: string;
}
