import { API_ORIGIN } from "@/config/api";

const PLACEHOLDER = "/placeholder.svg";

export function getFallbackImage(): string {
  return PLACEHOLDER;
}

export function resolveImageUrl(url?: string | null): string {
  const value = (url || "").trim();
  if (!value) return PLACEHOLDER;

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return parsed.toString();
    } catch {
      return PLACEHOLDER;
    }
  }

  // Legacy local-upload paths are no longer served.
  if (value.startsWith("/uploads/")) {
    return PLACEHOLDER;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return value;
}
