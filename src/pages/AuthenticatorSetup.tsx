import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

const API_URL = 'http://localhost:4000/api/auth'

type SetupResponse = {
  message?: string
  qrCodeDataUrl?: string
  manualEntryKey?: string
  expiresIn?: number
}

function hasEnrollmentToken() {
  const storedToken = sessionStorage.getItem('artist-wrld-enrollment-token')
  const tokenFromUrl = window.location.hash.slice(1)

  return Boolean(
    storedToken || (/^[a-f0-9]{64}$/i.test(tokenFromUrl) && tokenFromUrl),
  )
}

function AuthenticatorSetup() {
  const navigate = useNavigate()
  const [qrCode, setQrCode] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(() =>
    hasEnrollmentToken()
      ? ''
      : 'Your registration session is missing or has expired. Please register again.',
  )
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(hasEnrollmentToken)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let enrollmentToken = sessionStorage.getItem(
      'artist-wrld-enrollment-token',
    )

    if (!enrollmentToken && window.location.hash.length > 1) {
      const tokenFromUrl = window.location.hash.slice(1)

      if (/^[a-f0-9]{64}$/i.test(tokenFromUrl)) {
        enrollmentToken = tokenFromUrl
        sessionStorage.setItem(
          'artist-wrld-enrollment-token',
          tokenFromUrl,
        )

        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        )
      }
    }

    if (!enrollmentToken) {
      return
    }

    const controller = new AbortController()

    async function loadSetup() {
      try {
        const response = await fetch(
          `${API_URL}/registration-2fa/setup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrollmentToken }),
            signal: controller.signal,
          },
        )

        const result = await response.json() as SetupResponse

        if (!response.ok) {
          setError(result.message || 'Unable to start authenticator setup.')
          return
        }

        if (!result.qrCodeDataUrl || !result.manualEntryKey) {
          setError('The server did not return the authenticator setup details.')
          return
        }

        setQrCode(result.qrCodeDataUrl)
        setManualKey(result.manualEntryKey)
        setMessage(result.message || 'Scan the QR code with your authenticator app.')
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name === 'AbortError'
        ) {
          return
        }

        setError('Unable to connect to Artist-Wrld. Check that the backend is running.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadSetup()
    return () => controller.abort()
  }, [])

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.')
      return
    }

    let enrollmentToken = sessionStorage.getItem(
      'artist-wrld-enrollment-token',
    )

    if (!enrollmentToken && window.location.hash.length > 1) {
      const tokenFromUrl = window.location.hash.slice(1)

      if (/^[a-f0-9]{64}$/i.test(tokenFromUrl)) {
        enrollmentToken = tokenFromUrl
        sessionStorage.setItem(
          'artist-wrld-enrollment-token',
          tokenFromUrl,
        )

        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        )
      }
    }

    if (!enrollmentToken) {
      setError('Your registration session has expired. Please register again.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/registration-2fa/enable`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentToken, code }),
        },
      )

      const result = await response.json() as { message?: string }

      if (!response.ok) {
        setError(result.message || 'The authenticator code could not be verified.')
        return
      }

      sessionStorage.removeItem('artist-wrld-enrollment-token')
      setMessage(result.message || 'Authenticator verified. Registration is complete.')
      navigate('/login', {
        replace: true,
        state: { message: 'Registration complete. Sign in with your email, password, and authenticator code.' },
      })
    } catch {
      setError('Unable to connect to Artist-Wrld. Please try again.')
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

        <p className="auth-flow-eyebrow">SECURE YOUR ACCOUNT</p>
        <h1>Set up your authenticator</h1>
        <p className="auth-flow-description">
          Add an extra layer of protection to your Artist-Wrld account.
          You must complete this step before signing in.
        </p>

        {loading && <p role="status">Preparing your authenticator setup...</p>}

        {!loading && qrCode && (
          <>
            <p className="auth-flow-instruction">
              1. Open an authenticator app, such as Google Authenticator
              or Microsoft Authenticator, and scan this QR code.
            </p>

            <img
              className="auth-flow-qr"
              src={qrCode}
              alt="Authenticator enrollment QR code"
            />

            <p className="auth-flow-instruction">
              If you cannot scan the code, enter this setup key manually:
            </p>

            <code className="auth-flow-key">{manualKey}</code>

            <p className="auth-flow-instruction">
              2. Enter the current six-digit code shown in your app.
            </p>

            <form onSubmit={handleVerify} className="auth-flow-form">
              <label htmlFor="authenticator-code">Authenticator code</label>
              <input
                id="authenticator-code"
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
              />

              {error && <p className="auth-flow-error" role="alert">{error}</p>}

              <button
                className="auth-flow-button"
                type="submit"
                disabled={submitting || code.length !== 6}
              >
                {submitting ? 'Verifying...' : 'Verify and complete registration'}
              </button>
            </form>
          </>
        )}

        {!loading && !qrCode && error && (
          <p className="auth-flow-error" role="alert">{error}</p>
        )}

        {message && <p className="auth-flow-message" role="status">{message}</p>}

        <Link to="/register" className="auth-flow-back">
          Return to registration
        </Link>
      </section>
    </main>
  )
}

export default AuthenticatorSetup
