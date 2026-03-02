/**
 * Book API Service – All Supabase operations for books
 * 
 * Features:
 * - CRUD with RLS protection
 * - Pagination
 * - Filtered search (department, semester, price range)
 * - Image upload with validation
 * - View count increment
 */
import { supabase, type DbBook } from "@/lib/supabase";

/** Allowed image types and max size (5MB) */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface BookFilters {
  department?: string;
  semester?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  status?: string;
  query?: string;
  sellerId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedBooks {
  books: DbBook[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Fetch books with filters and pagination */
export async function fetchBooks(filters: BookFilters = {}): Promise<PaginatedBooks> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("books")
    .select("*, seller:profiles!seller_id(*)", { count: "exact" });

  // Apply filters
  if (filters.department && filters.department !== "All") {
    query = query.eq("department", filters.department);
  }
  if (filters.semester) {
    query = query.eq("semester", filters.semester);
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }
  if (filters.condition && filters.condition !== "All") {
    query = query.eq("condition", filters.condition);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }
  if (filters.query) {
    query = query.or(
      `title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
    );
  }

  // Pagination and order
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    books: (data || []) as DbBook[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/** Fetch a single book by ID */
export async function fetchBookById(id: string): Promise<DbBook | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, seller:profiles!seller_id(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as DbBook;
}

/** Create a new book listing */
export async function createBook(book: {
  title: string;
  author: string;
  description: string;
  department: string;
  semester: number;
  condition: string;
  price: number;
  image_url: string;
  seller_id: string;
}): Promise<{ data: DbBook | null; error: string | null }> {
  const { data, error } = await supabase
    .from("books")
    .insert([{ ...book, status: "available", views_count: 0 }])
    .select("*, seller:profiles!seller_id(*)")
    .single();

  return { data: data as DbBook | null, error: error?.message ?? null };
}

/** Update a book (only by owner via RLS) */
export async function updateBook(
  id: string,
  updates: Partial<DbBook>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** Delete a book (only by owner via RLS) */
export async function deleteBook(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("books").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Increment book view count */
export async function incrementViews(bookId: string): Promise<void> {
  await supabase.rpc("increment_book_views", { book_id: bookId });
}

/** Validate and upload book image to Supabase Storage */
export async function uploadBookImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: "Only JPEG, PNG, and WebP images are allowed" };
  }
  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return { url: null, error: "Image must be less than 5MB" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("book-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) return { url: null, error: error.message };

  const { data: urlData } = supabase.storage
    .from("book-images")
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}
