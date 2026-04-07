import { API_ORIGIN } from "@/config/api";

const PLACEHOLDER = "/placeholder.svg";

export function getFallbackImage(): string {
  return PLACEHOLDER;
}

export function resolveImageUrl(url?: string | null): string {
  const value = (url || "").trim().replace(/\\/g, "/");
  if (!value) return PLACEHOLDER;

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:") {
        parsed.protocol = "https:";
      }
      return parsed.toString();
    } catch {
      return PLACEHOLDER;
    }
  }

  // Support local-upload paths where backend serves /uploads.
  if (value.startsWith("/uploads/") || value.startsWith("uploads/")) {
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_ORIGIN}${path}`;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return value;
}
