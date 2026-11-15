export type PublicAccountRole = 'ADMIN' | 'ARTIST' | 'BUYER'

export type PublicAccount = {
  fullName?: string
  username?: string
  profileImage?: string | null
  role: PublicAccountRole
}

const CACHE_KEY = 'artist-wrld-public-account'

export function readPublicAccountCache(): PublicAccount | null {
  try {
    const saved = sessionStorage.getItem(CACHE_KEY)
    if (!saved) return null

    const account = JSON.parse(saved) as PublicAccount

    if (
      !account.role ||
      !['ADMIN', 'ARTIST', 'BUYER'].includes(account.role)
    ) {
      return null
    }

    return account
  } catch {
    return null
  }
}

export function savePublicAccountCache(account: PublicAccount): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(account))
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function clearPublicAccountCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore unavailable browser storage.
  }
}