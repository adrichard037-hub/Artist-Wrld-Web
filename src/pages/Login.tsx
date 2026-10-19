import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

const API_URL = 'https://artist-wrld-backend.onrender.com/api/auth'

type LoginResponse = {
  message?: string
  requiresTwoFactor?: boolean
  requiresEnrollment?: boolean
  challengeToken?: string
  user?: {
    id: string
    fullName: string
    username: string
    email: string
    role: 'ADMIN' | 'ARTIST' | 'BUYER' | 'DELIVERY_MAN'
  }
}

function Login() {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          rememberMe,
        }),
      })

      const data = await response.json() as LoginResponse

      if (data.requiresEnrollment) {
        setError(data.message || 'Finish authenticator setup before signing in.')
        return
      }

      if (data.requiresTwoFactor) {
        if (!data.challengeToken) {
          setError('The server did not return a login challenge. Please try again.')
          return
        }

        sessionStorage.setItem(
          'artist-wrld-login-challenge',
          data.challengeToken,
        )

        navigate('/verify-2fa', { replace: true })
        return
      }

      if (!response.ok) {
        setError(data.message || 'Unable to sign in. Please check your details and try again.')
        return
      }

      if (!data.user) {
        setError('The server response did not include your account details. Please try again.')
        return
      }

      const dashboardRoutes: Record<NonNullable<LoginResponse['user']>['role'], string> = {
        ADMIN: '/admin',
        ARTIST: '/artist-dashboard',
        BUYER: '/buyer-dashboard',
        DELIVERY_MAN: '/delivery-dashboard',
      }

      navigate(dashboardRoutes[data.user.role], { replace: true })
    } catch {
      setError(
        'Unable to connect to Artist-Wrld. Check that the backend server is running and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="auth-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <div className="auth-visual-content">
          <span className="eyebrow">YOUR CREATIVE WORLD AWAITS</span>
          <h1>Art brings<br />us <em>together.</em></h1>
          <p>
            Discover extraordinary art, connect with talented creators,
            and find inspiration in every corner.
          </p>

          <div className="auth-artwork">
            <img
              src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=85"
              alt="Artwork in an art gallery"
            />
            <div className="auth-artwork-caption">
              <span aria-hidden="true" className="auth-sparkle-icon auth-art-icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3.5C8.8 3.5 3 8.9 3 15.5S8.5 27 15.5 27h2.2c2 0 3.3-1.4 3.3-3.1 0-1-.5-1.8-1.2-2.4-.6-.5-.8-1.2-.5-1.9.3-.8 1-1.2 2-1.2h2.2c3.3 0 5.5-2.3 5.5-5.3C29 7.8 23.1 3.5 16 3.5Z" />
                  <circle cx="10" cy="11" r="1.3" />
                  <circle cx="15.5" cy="8.5" r="1.3" />
                  <circle cx="21" cy="11" r="1.3" />
                  <circle cx="9" cy="17" r="1.3" />
                  <path d="m21 24 6.1-10.2c.5-.8 1.5-1 2.2-.5.7.4.9 1.3.5 2l-6.2 10.1-2.6 1.1V24Z" />
                </svg>
              </span>
              <div>
                <strong>Creativity lives here.</strong>
                <p>A home for artists and art lovers.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-visual-footer">
          © 2026 Artist-Wrld. Made for the love of art.
        </p>
      </section>

      <section className="auth-form-section">
        <div className="auth-mobile-brand">
          <Link to="/" className="auth-brand">
            artist<span>-wrld</span><b>.</b>
          </Link>
        </div>

        <div className="auth-form-container">
          <button
            type="button"
            className="auth-back"
            onClick={() => window.history.back()}
          >
            Back to previous page
          </button>

          <span className="eyebrow">WELCOME BACK</span>
          <h2>Good to see you.</h2>
          <p className="auth-intro">Sign in to continue your creative journey.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="identifier">Username or email address</label>
              <input
                id="identifier"
                type="text"
                placeholder="Enter your username or email address"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-field">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <label className="remember-option">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Remember me</span>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="button button-dark auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'} <span aria-hidden="true"></span>
            </button>
          </form>

          <div className="auth-divider">
            <span>YOUR CREATIVE COMMUNITY</span>
          </div>

          <p className="auth-switch">
            New to Artist-Wrld? <Link to="/register">Create an account</Link>
          </p>

          <p className="auth-terms">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login


