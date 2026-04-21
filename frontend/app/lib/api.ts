/**
 * Single source of truth for API base URL.
 * Uses NEXT_PUBLIC_API_URL env var, falls back to Railway default.
 */
export const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "https://crypto-signals-production-ff4c.up.railway.app"}/api/v1`
