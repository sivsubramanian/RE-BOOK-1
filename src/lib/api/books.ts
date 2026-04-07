/**
 * Book API Service – REST API operations for books
 * 
 * Features:
 * - CRUD operations
 * - Pagination and filtered search
 * - Image upload via multer endpoint
 * - View count increment
 */
import { apiFetch } from "@/lib/api";
import type { DbBook } from "@/types";

/** Allowed image types and max size (5MB) */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
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
  const params = new URLSearchParams();
  if (filters.department && filters.department !== "All") params.set("department", filters.department);
  if (filters.semester) params.set("semester", String(filters.semester));
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.condition && filters.condition !== "All") params.set("condition", filters.condition);
  if (filters.status) params.set("status", filters.status);
  if (filters.sellerId) params.set("sellerId", filters.sellerId);
  if (filters.query) params.set("query", filters.query);
  params.set("page", String(filters.page || 1));
  params.set("pageSize", String(filters.pageSize || 12));

  return apiFetch<PaginatedBooks>(`/books?${params.toString()}`);
}

/** Fetch a single book by ID */
export async function fetchBookById(id: string): Promise<DbBook | null> {
  try {
    return await apiFetch<DbBook>(`/books/${id}`);
  } catch {
    return null;
  }
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
  try {
    const data = await apiFetch<DbBook>("/books", {
      method: "POST",
      body: JSON.stringify(book),
    });
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create book" };
  }
}

/** Update a book (only by owner) */
export async function updateBook(
  id: string,
  updates: Partial<DbBook>
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update book" };
  }
}

/** Delete a book (only by owner) */
export async function deleteBook(id: string): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/books/${id}`, { method: "DELETE" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete book" };
  }
}

/** Increment book view count */
export async function incrementViews(bookId: string): Promise<void> {
  try {
    await apiFetch(`/books/${bookId}/view`, { method: "POST", noAuth: true });
  } catch {
    // Fire-and-forget
  }
}

/** Validate and upload book image */
export async function uploadBookImage(
  file: File,
  _userId: string
): Promise<{ url: string | null; error: string | null }> {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: "Only JPEG and PNG images are allowed" };
  }
  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return { url: null, error: "Image must be less than 5MB" };
  }

  try {
    const formData = new FormData();
    formData.append("image", file);

    const data = await apiFetch<{ url: string }>("/upload/image", {
      method: "POST",
      body: formData,
    });

    return { url: data.url, error: null };
  } catch (err: unknown) {
    return { url: null, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

/** Validate and update only an existing book image */
export async function updateBookImage(
  bookId: string,
  file: File
): Promise<{ image_url: string | null; error: string | null }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { image_url: null, error: "Only JPEG and PNG images are allowed" };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { image_url: null, error: "Image must be less than 5MB" };
  }

  try {
    const formData = new FormData();
    formData.append("image", file);

    const data = await apiFetch<{ image_url: string }>(`/books/${bookId}/image`, {
      method: "PUT",
      body: formData,
    });

    return { image_url: data.image_url, error: null };
  } catch (err: unknown) {
    return { image_url: null, error: err instanceof Error ? err.message : "Image update failed" };
  }
}
