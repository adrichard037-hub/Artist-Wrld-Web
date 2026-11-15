const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim()

// In production the site calls its own domain (/api), which Vercel proxies to
// the backend (see vercel.json). Set VITE_API_URL only to call another host.
// In local development the API runs on http://localhost:4000.
const defaultApiBaseUrl = import.meta.env.PROD ? '' : 'http://localhost:4000'

export const API_BASE_URL = (
  configuredApiBaseUrl || defaultApiBaseUrl
).replace(/\/+$/, '')

export const API_URL = `${API_BASE_URL}/api`
export const AUTH_API_URL = `${API_URL}/auth`
