import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('buyer')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    if (!acceptedTerms) {
      setError('Please accept the terms and conditions.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          username,
          email,
          role,
          password,
          confirmPassword,
          acceptedTerms,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const fieldErrors = Array.isArray(result.errors)
          ? result.errors
              .map((item: { message?: string }) => item.message)
              .filter(Boolean)
          : []

        setError(
          fieldErrors.length > 0
            ? fieldErrors.join(' ')
            : result.message || 'Registration failed. Please try again.',
        )
        return
      }

      if (!result.enrollmentToken) {
        setError('Registration succeeded, but the authenticator enrollment token was missing. Please contact support before trying again.')
        return
      }

      sessionStorage.setItem(
        'artist-wrld-enrollment-token',
        result.enrollmentToken,
      )

      setFullName('')
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('buyer')
      setAcceptedTerms(false)

      navigate('/setup-authenticator', { replace: true })
    } catch {
      setError(
        'Could not connect to the server. Please make sure the Artist-Wrld backend is running.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <main className="auth-page register-page">
      <section className="auth-visual register-visual">
        <Link to="/" className="auth-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <div className="auth-visual-content">
          <p className="eyebrow">YOUR CREATIVE WORLD</p>
          <h1>Great art starts with a connection.</h1>
          <p>
            Join a community where artists share their work and art lovers
            discover something meaningful.
          </p>

          <div className="register-benefits">
            <div>
              <span className="benefit-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <div>
                <strong>Discover</strong>
                <p>Explore original art and fresh perspectives.</p>
              </div>
            </div>
            <div>
              <span className="benefit-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11z" />
                </svg>
              </span>
              <div>
                <strong>Support</strong>
                <p>Connect with artists and support their work.</p>
              </div>
            </div>
            <div>
              <span className="benefit-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
                  <path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20" />
                </svg>
              </span>
              <div>
                <strong>Belong</strong>
                <p>Find your place in a creative community.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-visual-footer">
          Discover art. Support creativity. Find your world.
        </p>
      </section>

      <section className="auth-form-section register-form-section">
        <div className="auth-form-wrap register-form-wrap">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              const previous = sessionStorage.getItem('artist-wrld-register-return')
              const current = window.location.pathname + window.location.search

              if (previous && previous !== current && previous.startsWith('/')) {
                window.location.replace(previous)
              } else {
                window.location.replace('/')
              }
            }}
          >
            Back to previous page
          </button>

          <div className="register-heading">
            <p className="eyebrow">JOIN THE COMMUNITY</p>
            <h2>Create your account</h2>
            <p className="auth-subtitle">
              Start your Artist-Wrld journey in just a few steps.
            </p>
          </div>

          <form className="auth-form register-form" onSubmit={handleSubmit}>
            <div className="register-field">
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                minLength={3}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-role">Account type</label>
              <select
                id="register-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                required
              >
                <option value="buyer">Buyer / Art collector</option>
                <option value="artist">Artist</option>
                <option value="delivery">Delivery Man</option>
              </select>
            </div>

            <div className="register-field">
              <label htmlFor="register-password">Password</label>
              <div className="password-field register-password-field">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C3.8 7.7 2.7 10 2.5 12c.7 2.1 4.2 7 9.5 7 1 0 2-.2 2.9-.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="register-confirm-password">
                Confirm password
              </label>
              <div className="password-field register-password-field">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirmation password'
                      : 'Show confirmation password'
                  }
                  aria-pressed={showConfirmPassword}
                  title={
                    showConfirmPassword
                      ? 'Hide confirmation password'
                      : 'Show confirmation password'
                  }
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C3.8 7.7 2.7 10 2.5 12c.7 2.1 4.2 7 9.5 7 1 0 2-.2 2.9-.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <label className="auth-checkbox register-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                I agree to the <a href="#terms">terms and conditions</a>.
              </span>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="auth-success" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="button button-dark auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}{' '}
              <span aria-hidden="true"></span>
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default Register




