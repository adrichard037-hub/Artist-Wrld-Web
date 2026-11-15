import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { readPublicAccountCache, savePublicAccountCache, clearPublicAccountCache } from '../lib/public-account-cache'

type SupportedRole = 'ADMIN' | 'ARTIST' | 'BUYER'

type SessionUser = {
  fullName?: string
  username?: string
  profileImage?: string | null
  role: SupportedRole
}

let cachedPublicUser: SessionUser | null = null

type Props = {
  variant: 'about' | 'gallery' | 'artists'
}

const dashboardPaths: Record<SupportedRole, string> = {
  ADMIN: '/admin',
  ARTIST: '/artist-dashboard',
  BUYER: '/buyer-dashboard',
}

function PublicAccountActions({ variant }: Props) {
  const [user, setUser] = useState<SessionUser | null>(() => readPublicAccountCache() ?? cachedPublicUser)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 401) {
            cachedPublicUser = null
            clearPublicAccountCache()
            if (!controller.signal.aborted) setUser(null)
          }
          return
        }

        const result: {
          authenticated?: boolean
          user?: {
            fullName?: string
            username?: string
            role?: string
          }
        } = await response.json()

        const sessionUser = result.user

        if (
          result.authenticated === true &&
          sessionUser?.role &&
          ['ADMIN', 'ARTIST', 'BUYER'].includes(sessionUser.role)
        ) {
          const verifiedUser: SessionUser = {
            fullName: sessionUser.fullName,
            username: sessionUser.username,
            role: sessionUser.role as SupportedRole,
          }

          if (!controller.signal.aborted) {
            cachedPublicUser = verifiedUser
            savePublicAccountCache(verifiedUser)
            setUser(verifiedUser)
          }

          // Load the avatar without holding back the account link.
          try {
            const profileResponse = await fetch(`${API_URL}/dashboard/profile`, {
              method: 'GET',
              credentials: 'include',
              headers: { Accept: 'application/json' },
              signal: controller.signal,
            })

            if (profileResponse.ok) {
              const profileResult: {
                profile?: {
                  profileImage?: string | null
                  avatar?: string | null
                } | null
              } = await profileResponse.json()

              const profileImage =
                profileResult.profile?.profileImage ??
                profileResult.profile?.avatar ??
                null

              if (!controller.signal.aborted) {
                const updatedUser: SessionUser = {
                  ...verifiedUser,
                  profileImage,
                }
                cachedPublicUser = updatedUser
                savePublicAccountCache(updatedUser)
                setUser(updatedUser)
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return
          }
        } else {
          // Delivery Man is intentionally excluded from public account actions.
          cachedPublicUser = null
          clearPublicAccountCache()
          if (!controller.signal.aborted) setUser(null)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return

        if (!controller.signal.aborted) {
          setUser(readPublicAccountCache() ?? cachedPublicUser)
        }
      }
    }

    void loadSession()

    return () => controller.abort()
  }, [])

  const actions = user ? (
    <Link
      to={dashboardPaths[user.role]}
      className="homepage-account-link"
      aria-label={`Open ${user.role.toLowerCase()} dashboard`}
      title="Open your dashboard"
    >
      <span className="homepage-account-avatar" aria-hidden="true">
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        ) : (
          (user.fullName || user.username || 'U')
            .trim()
            .charAt(0)
            .toUpperCase()
        )}
      </span>
      <span className="homepage-account-name">
        {user.username || user.fullName || 'My account'}
      </span>
    </Link>
  ) : variant === 'about' ? (
    <>
      <Link to="/login" className="about-join">Login</Link>
      <Link to="/register" className="about-join">Join Artist-Wrld</Link>
    </>
  ) : variant === 'gallery' ? (
    <>
      <Link to="/login">Log in</Link>
      <Link className="gallery-join-button" to="/register">
        Join Artist-Wrld
      </Link>
    </>
  ) : (
    <>
      <Link to="/login" className="artists-join">Login</Link>
      <Link to="/register" className="artists-join">Join Artist-Wrld</Link>
    </>
  )

  if (variant === 'gallery') {
    return <div className="gallery-nav-actions">{actions}</div>
  }

  return <>{actions}</>
}

export default PublicAccountActions




