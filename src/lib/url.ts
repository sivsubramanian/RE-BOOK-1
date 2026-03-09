import { API_ORIGIN } from "@/config/api";

const PLACEHOLDER = "/placeholder.svg";

export function getFallbackImage(): string {
  return PLACEHOLDER;
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return PLACEHOLDER;

  if (url.startsWith("/uploads/")) {
    return `${API_ORIGIN}${url}`;
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${API_ORIGIN}${parsed.pathname}`;
      }
      return parsed.toString();
    } catch {
      return PLACEHOLDER;
    }
  }

  return url;
}
