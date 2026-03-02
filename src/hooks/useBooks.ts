/**
 * useBooks – React hook for fetching and managing books with Supabase
 * Falls back to mock data when Supabase is not configured
 */
import { useState, useEffect, useCallback } from "react";
import { fetchBooks, type BookFilters, type PaginatedBooks } from "@/lib/api/books";
import { mockBooks } from "@/lib/mockData";
import type { DbBook } from "@/lib/supabase";

/** Convert mock book to DbBook shape */
function mockToDbBook(mock: typeof mockBooks[0]): DbBook {
  return {
    id: mock.id,
    title: mock.title,
    author: mock.author,
    description: mock.description || "",
    department: mock.department,
    semester: mock.semester,
    condition: mock.condition,
    price: mock.price,
    image_url: mock.image_url || mock.image,
    seller_id: mock.seller_id || "",
    status: mock.status || "available",
    views_count: mock.views_count || 0,
    created_at: mock.created_at || new Date().toISOString(),
    updated_at: mock.updated_at || new Date().toISOString(),
    seller: {
      id: mock.seller_id || "",
      email: "",
      full_name: mock.sellerName || "Unknown",
      department: mock.department,
      semester: mock.semester,
      role: "seller",
      avatar_url: mock.sellerAvatar || null,
      created_at: new Date().toISOString(),
    },
  };
}

export function useBooks(filters: BookFilters = {}) {
  const [data, setData] = useState<PaginatedBooks>({
    books: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBooks(filters);
      setData(result);
    } catch (err: any) {
      // Fallback to mock data
      console.warn("Supabase fetch failed, using mock data:", err.message);
      let filtered = mockBooks.map(mockToDbBook);

      if (filters.department && filters.department !== "All") {
        filtered = filtered.filter(b => b.department === filters.department);
      }
      if (filters.semester) {
        filtered = filtered.filter(b => b.semester === filters.semester);
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        filtered = filtered.filter(
          b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
        );
      }
      if (filters.condition && filters.condition !== "All") {
        filtered = filtered.filter(b => b.condition === filters.condition);
      }
      if (filters.minPrice !== undefined) {
        filtered = filtered.filter(b => b.price >= (filters.minPrice || 0));
      }
      if (filters.maxPrice !== undefined) {
        filtered = filtered.filter(b => b.price <= (filters.maxPrice || Infinity));
      }

      const page = filters.page || 1;
      const pageSize = filters.pageSize || 12;
      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      setData({
        books: paged,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize),
      });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, refetch: load };
}

/** Hook to get all books (unpaginated) for AI module */
export function useAllBooks() {
  const [books, setBooks] = useState<DbBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchBooks({ pageSize: 200 });
        setBooks(result.books);
      } catch {
        setBooks(mockBooks.map(mockToDbBook));
      }
      setLoading(false);
    })();
  }, []);

  return { books, loading };
}
