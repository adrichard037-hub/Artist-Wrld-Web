import { API_URL } from './api'
import { clearPublicAccountCache } from './public-account-cache'

export async function logoutToLogin(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Logout request failed:', error)
  } finally {
    clearPublicAccountCache()
    window.location.replace('/login')
  }
}
