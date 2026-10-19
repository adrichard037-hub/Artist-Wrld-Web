import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

const API_URL = 'https://artist-wrld-backend.onrender.com/api/auth'

type VerifyResponse = {
  message?: string
  user?: {
    id: string
    fullName: string
    username: string
    email: string
    role: 'ADMIN' | 'ARTIST' | 'BUYER' | 'DELIVERY_MAN'
  }
}

const dashboardRoutes: Record<
  NonNullable<VerifyResponse['user']>['role'],
  string
> = {
  ADMIN: '/admin',
  ARTIST: '/artist-dashboard',
  BUYER: '/buyer-dashboard',
  DELIVERY_MAN: '/delivery-dashboard',
}

function VerifyTwoFactor() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('artist-wrld-login-challenge')) {
      navigate('/login', {
        replace: true,
        state: { message: 'Sign in with your email and password first.' },
      })
    }
  }, [navigate])

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (submitting) return

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.')
      return
    }

    const challengeToken = sessionStorage.getItem(
      'artist-wrld-login-challenge',
    )

    if (!challengeToken) {
      setError('Your login challenge has expired. Please sign in again.')
      navigate('/login', { replace: true })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/2fa/verify-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code }),
      })

      const result = await response.json() as VerifyResponse

      if (!response.ok) {
        setError(result.message || 'The authenticator code was not accepted.')
        return
      }

      if (!result.user || !dashboardRoutes[result.user.role]) {
        setError('The server did not return a valid account role. Please contact support.')
        return
      }

      sessionStorage.removeItem('artist-wrld-login-challenge')
      navigate(dashboardRoutes[result.user.role], { replace: true })
    } catch {
      setError('Unable to connect to Artist-Wrld. Check that the backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-flow-page">
      <section className="auth-flow-card">
        <Link to="/" className="auth-flow-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <p className="auth-flow-eyebrow">TWO-FACTOR AUTHENTICATION</p>
        <h1>Verify it's you</h1>
        <p className="auth-flow-description">
          Open your authenticator app and enter the current six-digit
          code to finish signing in.
        </p>

        <form onSubmit={handleVerify} className="auth-flow-form">
          <label htmlFor="login-authenticator-code">Authenticator code</label>
          <input
            id="login-authenticator-code"
            className="auth-flow-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="000000"
            required
            autoFocus
          />

          {error && <p className="auth-flow-error" role="alert">{error}</p>}

          <button
            className="auth-flow-button"
            type="submit"
            disabled={submitting || code.length !== 6}
          >
            {submitting ? 'Verifying...' : 'Verify and sign in'}
          </button>
        </form>

        <Link to="/login" className="auth-flow-back">
          Back to login
        </Link>
      </section>
    </main>
  )
}

export default VerifyTwoFactor
