const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim()

export const API_BASE_URL = (
  configuredApiBaseUrl || 'http://localhost:4000'
).replace(/\/+$/, '')

export const API_URL = `${API_BASE_URL}/api`
export const AUTH_API_URL = `${API_URL}/auth`
