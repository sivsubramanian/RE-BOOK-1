const envBase = import.meta.env.VITE_API_URL;
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";

const rawBase = (envBase && envBase.trim()) || `${browserOrigin}/api`;
const trimmedBase = rawBase.replace(/\/+$/, "");

export const API_BASE = trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`;
export const API_ORIGIN = API_BASE.replace(/\/api$/, "");
