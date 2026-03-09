import { apiFetch } from "@/lib/api";
import type { DbBook } from "@/types";

export interface ChatbotResult {
  query: string;
  count: number;
  message: string;
  books: Array<DbBook & { score?: number }>;
}

export async function fetchChatbotSuggestions(query: string): Promise<ChatbotResult> {
  return apiFetch<ChatbotResult>("/chatbot", {
    method: "POST",
    body: JSON.stringify({ query, limit: 6 }),
  });
}
