/**
 * Single source of truth for API base URL.
 * Uses NEXT_PUBLIC_API_URL env var, falls back to Railway default.
 */
const rawUrl = process.env.NEXT_PUBLIC_API_URL || "https://crypto-signals-production-ff4c.up.railway.app"
export const API_BASE_URL = `${rawUrl.replace(/\/+$/, "")}/api/v1`
