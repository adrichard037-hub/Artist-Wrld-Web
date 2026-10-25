import { API_URL } from './api'

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
    window.location.replace('/login')
  }
}
