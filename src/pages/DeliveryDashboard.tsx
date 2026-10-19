import { logoutToLogin } from '../lib/logout'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './DeliveryDashboard.css'

const API_BASE_URL = 'http://localhost:4000/api'

type ApiAssignment = {
  id: string
  artworkTitle: string
  customerName: string
  pickup: string
  destination: string
  scheduledDate: string | null
  createdAt?: string
  status: string
}

async function getApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { message?: string }
    return payload.message || `Request failed (${response.status}).`
  } catch {
    return `Request failed (${response.status}).`
  }
}

function normalizeDeliveryStatus(value: string): Delivery['status'] {
  if (
    value === 'Assigned' ||
    value === 'Picked Up' ||
    value === 'In Transit' ||
    value === 'Delivered'
  ) {
    return value
  }

  return 'Assigned'
}

type Section =
  | 'Overview'
  | 'My Deliveries'
  | 'Pickup & Drop-off'
  | 'Delivery History'
  | 'Messages'
  | 'My Profile'
  | 'Settings'
  | 'Backup & Restore'

type Theme = 'Light' | 'Dark' | 'System'

type Delivery = {
  id: string
  artwork: string
  customer: string
  pickup: string
  destination: string
  date: string
  status: 'Assigned' | 'Picked Up' | 'In Transit' | 'Delivered'
}

type Profile = {
  fullName: string
  email: string
  phone: string
  serviceArea: string
  avatar: string
}

type DeliveryBackup = {
  app: 'artist-wrld'
  type: 'delivery-backup'
  version: 1
  createdAt: string
  profile: Profile
  theme: Theme
}

const navigation: Section[] = [
  'Overview',
  'My Deliveries',
  'Pickup & Drop-off',
  'Delivery History',
  'Messages',
  'My Profile',
  'Settings',
  'Backup & Restore',
]

const emptyProfile: Profile = {
  fullName: '',
  email: '',
  phone: '',
  serviceArea: '',
  avatar: '',
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('artist-wrld-delivery-theme')
    if (saved === 'Dark' || saved === 'System') return saved
  } catch {
    // Continue with the default theme when storage is unavailable.
  }

  return 'Light'
}

async function loadDeliveryAssignments(
  isActive: () => boolean,
  setDeliveries: (deliveries: Delivery[]) => void,
  setNotice: (notice: string) => void,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/deliveries`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(await getApiError(response))
    }

    const payload = await response.json() as {
      assignments?: ApiAssignment[]
    }

    if (!Array.isArray(payload.assignments)) {
      throw new Error('The server returned an invalid assignments response.')
    }

    const mapped: Delivery[] = payload.assignments.map((assignment) => {
      const dateValue = assignment.scheduledDate || assignment.createdAt || ''

      return {
        id: assignment.id,
        artwork: assignment.artworkTitle,
        customer: assignment.customerName,
        pickup: assignment.pickup,
        destination: assignment.destination,
        date: dateValue ? dateValue.slice(0, 10) : 'Not scheduled',
        status: normalizeDeliveryStatus(assignment.status),
      }
    })

    if (isActive()) {
      setDeliveries(mapped)
    }
  } catch (error) {
    if (isActive()) {
      setNotice(
        error instanceof Error
          ? `Unable to load deliveries: ${error.message}`
          : 'Unable to load deliveries. Check that the backend is running.',
      )
    }
  }
}
function DeliveryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const restoreInput = useRef<HTMLInputElement>(null)
  const profileImageInput = useRef<HTMLInputElement>(null)

  const sectionFromUrl = (value: string | null): Section =>
    navigation.find(
      (item) =>
        item.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-') === value,
    ) ?? 'Overview'

  const section = sectionFromUrl(searchParams.get('section'))
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [notice, setNotice] = useState('')
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    let active = true

    void loadDeliveryAssignments(
      () => active,
      setDeliveries,
      setNotice,
    )

    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    let active = true

    async function loadDeliveryTheme() {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/preferences`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          throw new Error(await getApiError(response))
        }

        const payload = await response.json() as {
          preferences?: Array<{ key: string; value: string }>
        }

        const savedPreference = payload.preferences?.find(
          (preference) => preference.key === 'delivery-theme',
        )

        if (
          active &&
          savedPreference &&
          (
            savedPreference.value === 'Light' ||
            savedPreference.value === 'Dark' ||
            savedPreference.value === 'System'
          )
        ) {
          setTheme(savedPreference.value)
        }
      } catch (error) {
        if (active) {
          setNotice(
            error instanceof Error
              ? `Unable to load saved theme: ${error.message}`
              : 'Unable to load saved theme preference.',
          )
        }
      }
    }

    void loadDeliveryTheme()

    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('artist-wrld-delivery-theme', theme)
    } catch {
      // The selected theme remains active for this session.
    }
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDeliveryProfile() {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/profile`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await getApiError(response))
        }

        const payload = await response.json() as {
          user?: { fullName?: string; email?: string }
          profile?: {
            phone?: string | null
            serviceArea?: string | null
            avatar?: string | null
            profileImage?: string | null
          } | null
        }

        if (!payload.user) {
          throw new Error('The server returned an invalid profile.')
        }

        setProfile({
          fullName: payload.user.fullName ?? '',
          email: payload.user.email ?? '',
          phone: payload.profile?.phone ?? '',
          serviceArea: payload.profile?.serviceArea ?? '',
          avatar:
            payload.profile?.avatar ??
            payload.profile?.profileImage ??
            '',
        })
      } catch (error) {
        if (controller.signal.aborted) return

        setNotice(
          error instanceof Error
            ? `Unable to load your profile: ${error.message}`
            : 'Unable to load your profile.',
        )
      }
    }

    void loadDeliveryProfile()

    return () => controller.abort()
  }, [])

  async function saveDeliveryProfile() {
    setNotice('')

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          serviceArea: profile.serviceArea.trim(),
          avatar: profile.avatar || null,
        }),
      })

      if (!response.ok) {
        throw new Error(await getApiError(response))
      }

      const payload = await response.json() as {
        message?: string
        user?: { fullName?: string; email?: string }
        profile?: {
          phone?: string | null
          serviceArea?: string | null
          avatar?: string | null
          profileImage?: string | null
        } | null
      }

      setProfile((current) => ({
        ...current,
        fullName: payload.user?.fullName ?? current.fullName,
        email: payload.user?.email ?? current.email,
        phone: payload.profile?.phone ?? current.phone,
        serviceArea: payload.profile?.serviceArea ?? current.serviceArea,
        avatar:
          payload.profile?.avatar ??
          payload.profile?.profileImage ??
          current.avatar,
      }))

      setNotice(payload.message || 'Your profile was saved successfully.')
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Unable to save your profile: ${error.message}`
          : 'Unable to save your profile. Please try again.',
      )
    }
  }
  async function updateDeliveryTheme(nextTheme: Theme) {
    const previousTheme = theme
    setNotice('')

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/preferences`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'delivery-theme',
          value: nextTheme,
        }),
      })

      if (!response.ok) {
        throw new Error(await getApiError(response))
      }

      setTheme(nextTheme)
      setNotice('Theme preference saved successfully.')
    } catch (error) {
      setTheme(previousTheme)
      setNotice(
        error instanceof Error
          ? `Unable to save theme preference: ${error.message}`
          : 'Unable to save theme preference. Please try again.',
      )
    }
  }
  function setSection(nextSection: Section) {
    setNotice('')
    setRestoreError('')

    const slug = nextSection.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, '-')

    if (searchParams.get('section') !== slug) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('section', slug)
        return next
      })
    }
  }

  const activeDeliveries = deliveries.filter(
    (delivery) => delivery.status !== 'Delivered',
  )
  const completedDeliveries = deliveries.filter(
    (delivery) => delivery.status === 'Delivered',
  )

  async function updateDeliveryStatus(id: string, status: Delivery['status']) {
    setNotice('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/deliveries/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      )

      if (!response.ok) {
        throw new Error(await getApiError(response))
      }

      const payload = await response.json() as {
        assignment?: { status?: string }
      }

      const savedStatus = normalizeDeliveryStatus(
        payload.assignment?.status ?? status,
      )

      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.id === id
            ? { ...delivery, status: savedStatus }
            : delivery,
        ),
      )

      setNotice(`${id} status saved as ${savedStatus}.`)
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Unable to update ${id}: ${error.message}`
          : `Unable to update ${id}. Please try again.`,
      )
    }
  }

  function downloadBackup() {
    const backup: DeliveryBackup = {
      app: 'artist-wrld',
      type: 'delivery-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      profile,
      theme,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `artist-wrld-delivery-backup-${new Date().toISOString().slice(0, 10)}.json`

    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    setNotice('Your delivery profile and appearance settings were backed up.')
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setNotice('')
    setRestoreError('')

    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('The backup must not exceed 8 MB.')
      }

      const parsed: unknown = JSON.parse(await file.text())

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('The selected file is not a valid backup object.')
      }

      const backup = parsed as Partial<DeliveryBackup>

      if (
        backup.app !== 'artist-wrld' ||
        backup.type !== 'delivery-backup' ||
        backup.version !== 1
      ) {
        throw new Error('This is not a supported delivery backup.')
      }

      const savedProfile = backup.profile

      if (
        typeof savedProfile !== 'object' ||
        savedProfile === null ||
        typeof savedProfile.fullName !== 'string' ||
        typeof savedProfile.email !== 'string' ||
        typeof savedProfile.phone !== 'string' ||
        typeof savedProfile.serviceArea !== 'string' ||
        !['Light', 'Dark', 'System'].includes(backup.theme ?? '')
      ) {
        throw new Error('The backup contains invalid profile or theme settings.')
      }

      const savedAvatar =
        typeof savedProfile.avatar === 'string' ? savedProfile.avatar : ''

      if (
        savedAvatar &&
        (
          !/^data:image\/(jpeg|png|webp);base64,/i.test(savedAvatar) ||
          savedAvatar.length > 7_100_000
        )
      ) {
        throw new Error('The backup contains an invalid or oversized profile photo.')
      }

      if (!window.confirm(
        'Restore your delivery profile and appearance settings? Delivery assignments, orders, payments, and transaction records will not be changed.',
      )) {
        return
      }

      setProfile({
        fullName: savedProfile.fullName.slice(0, 100),
        email: savedProfile.email.slice(0, 254),
        phone: savedProfile.phone.slice(0, 30),
        serviceArea: savedProfile.serviceArea.slice(0, 120),
        avatar: savedAvatar,
      })
      setTheme(backup.theme as Theme)
      setNotice('Your profile and appearance settings have been restored. Delivery records were not changed.')
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : 'Unable to restore this backup.',
      )
    } finally {
      event.target.value = ''
    }
  }

  function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      setNotice('Please choose a JPG, PNG, or WebP image.')
      input.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice('Your profile photo must not exceed 5 MB.')
      input.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setNotice('Unable to read the selected photo.')
        return
      }

      setProfile((previous) => ({
        ...previous,
        avatar: reader.result as string,
      }))

      setNotice('Profile photo updated for this session.')
    }

    reader.onerror = () => {
      setNotice('Unable to read the selected photo. Please try again.')
    }

    reader.readAsDataURL(file)
    input.value = ''
  }

  function renderOverview() {
    return (
      <>
        <section className="delivery-welcome">
          <div>
            <span className="delivery-eyebrow">YOUR DELIVERY WORKSPACE</span>
            <h2>Every delivery, handled with care.</h2>
            <p>Manage assigned deliveries, track progress, and keep your customers informed.</p>
          </div>
          <button
            type="button"
            className="delivery-primary-button"
            onClick={() => setSection('My Deliveries')}
          >
            View deliveries &rarr;
          </button>
        </section>

        <section className="delivery-stat-grid" aria-label="Delivery statistics">
          <article className="delivery-stat-card">
            <span>Assigned deliveries</span>
            <strong>{deliveries.filter((item) => item.status === 'Assigned').length}</strong>
            <small>Awaiting pickup</small>
          </article>
          <article className="delivery-stat-card">
            <span>In progress</span>
            <strong>{deliveries.filter((item) => item.status === 'Picked Up' || item.status === 'In Transit').length}</strong>
            <small>Picked up or on the way</small>
          </article>
          <article className="delivery-stat-card">
            <span>Completed</span>
            <strong>{completedDeliveries.length}</strong>
            <small>Marked as delivered</small>
          </article>
          <article className="delivery-stat-card">
            <span>Total assigned</span>
            <strong>{deliveries.length}</strong>
            <small>Assignments linked to your account</small>
          </article>
        </section>

        <section className="delivery-panel">
          <div className="delivery-panel-heading">
            <div>
              <h3>Recent deliveries</h3>
              <p>Review your current assignments and their latest status.</p>
            </div>
            <button
              type="button"
              className="delivery-text-button"
              onClick={() => setSection('My Deliveries')}
            >
              View all
            </button>
          </div>
          {deliveries.slice(0, 3).map((delivery) => (
            <DeliveryRow key={delivery.id} delivery={delivery} />
          ))}
        </section>

        <div className="delivery-tip">
          <span className="delivery-tip-mark" aria-hidden="true">i</span>
          <div>
            <strong>Handle every artwork with care</strong>
            <p>Confirm the pickup details and destination before travelling. Update delivery status as each step is completed.</p>
          </div>
        </div>
      </>
    )
  }

  function renderDeliveryTable(items: Delivery[]) {
    if (items.length === 0) {
      return (
        <div className="delivery-empty">
          <strong>No deliveries to show</strong>
          <p>Assigned delivery records will appear here when available.</p>
        </div>
      )
    }

    return (
      <div className="delivery-table-wrap">
        <table className="delivery-table">
          <thead>
            <tr>
              <th>Delivery</th>
              <th>Customer</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Update status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((delivery) => (
              <tr key={delivery.id}>
                <td>
                  <strong>{delivery.artwork}</strong>
                  <small>{delivery.id} &middot; {delivery.date}</small>
                </td>
                <td>{delivery.customer}</td>
                <td>{delivery.destination}</td>
                <td><StatusBadge status={delivery.status} /></td>
                <td>
                  {delivery.status === 'Delivered' ? (
                    <span className="delivery-muted-text">Completed</span>
                  ) : (
                    <select
                      aria-label={`Update status for ${delivery.id}`}
                      value={delivery.status}
                      onChange={(event) =>
                        updateDeliveryStatus(delivery.id, event.target.value as Delivery['status'])
                      }
                    >
                      <option value="Assigned">Assigned</option>
                      <option value="Picked Up">Picked Up</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderProfile() {
    return (
      <section className="delivery-panel delivery-form-panel">
        <div className="delivery-panel-heading">
          <div>
            <h3>Delivery worker profile</h3>
            <p>Manage the personal information displayed in your workspace.</p>
          </div>
        </div>
        <form
          className="delivery-form"
          onSubmit={(event) => {
            event.preventDefault()
            void saveDeliveryProfile()
          }}
        >
          <div className="delivery-profile-photo-section">
            <div
              className="delivery-profile-photo-preview"
              aria-label="Profile photo preview"
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt="Your profile" />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="delivery-profile-photo-details">
              <strong>Profile photo</strong>
              <p>Choose a JPG, PNG, or WebP image. Maximum size: 5 MB.</p>

              <div className="delivery-profile-photo-actions">
                <button
                  type="button"
                  className="delivery-primary-button"
                  onClick={() => profileImageInput.current?.click()}
                >
                  Upload photo
                </button>

                {profile.avatar && (
                  <button
                    type="button"
                    className="delivery-photo-remove-button"
                    onClick={() => {
                      setProfile((previous) => ({
                        ...previous,
                        avatar: '',
                      }))
                      setNotice('Profile photo removed.')
                      if (profileImageInput.current) {
                        profileImageInput.current.value = ''
                      }
                    }}
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <input
                ref={profileImageInput}
                className="delivery-profile-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileImageChange}
                aria-label="Choose profile photo"
              />
            </div>
          </div>

          <div className="delivery-form-grid">
            <label>
              Full name
              <input
                value={profile.fullName}
                onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                maxLength={100}
                placeholder="Enter your full name"
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                maxLength={254}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                maxLength={30}
                placeholder="Enter your contact number"
              />
            </label>
            <label>
              Service area
              <input
                value={profile.serviceArea}
                onChange={(event) => setProfile({ ...profile, serviceArea: event.target.value })}
                maxLength={120}
                placeholder="e.g. Accra"
              />
            </label>
          </div>
          <div className="delivery-form-actions">
            <button className="delivery-primary-button" type="submit">Save profile</button>
          </div>
          <p className="delivery-form-note">This prototype stores changes in the current dashboard session. Persistent account updates require the backend.</p>
        </form>
      </section>
    )
  }

  function renderSettings() {
    return (
      <>
        <section className="delivery-panel">
          <div className="delivery-panel-heading">
            <div>
              <h3>Appearance</h3>
              <p>Choose the theme for your delivery workspace.</p>
            </div>
          </div>
          <div className="delivery-settings-row">
            <div>
              <strong>Dashboard theme</strong>
              <p>Light, dark, or follow your device preference.</p>
            </div>
            <select
              aria-label="Dashboard theme"
              value={theme}
              onChange={(event) => void updateDeliveryTheme(event.target.value as Theme)}

            >
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
          <div className="delivery-settings-row">
            <div>
              <strong>Delivery assignments</strong>
              <p>View and update the status of your assigned deliveries.</p>
            </div>
            <button type="button" className="delivery-secondary-button" onClick={() => setSection('My Deliveries')}>
              View deliveries
            </button>
          </div>
          <div className="delivery-settings-row">
            <div>
              <strong>Backup &amp; Restore</strong>
              <p>Save a copy of your profile and appearance settings.</p>
            </div>
            <button type="button" className="delivery-secondary-button" onClick={() => setSection('Backup & Restore')}>
              Manage backup
            </button>
          </div>
        </section>
      </>
    )
  }

  function renderBackup() {
    return (
      <>
        <section className="delivery-page-intro">
          <span className="delivery-eyebrow">YOUR DATA</span>
          <h2>Backup &amp; Restore</h2>
          <p>Keep a copy of your personal delivery workspace settings.</p>
        </section>

        <section className="delivery-panel delivery-backup-panel">
          <div className="delivery-backup-icon" aria-hidden="true">&#x2195;</div>
          <div className="delivery-backup-copy">
            <h3>Back up your profile</h3>
            <p>Download a JSON file containing your profile and selected dashboard theme.</p>
            <button type="button" className="delivery-primary-button" onClick={downloadBackup}>
              Download backup &#x2193;
            </button>
          </div>
        </section>

        <section className="delivery-panel delivery-backup-panel">
          <div className="delivery-backup-icon" aria-hidden="true">&#x21A7;</div>
          <div className="delivery-backup-copy">
            <h3>Restore profile settings</h3>
            <p>Choose a valid Artist-Wrld delivery backup. Only your profile and theme will be restored.</p>
            <button type="button" className="delivery-secondary-button" onClick={() => restoreInput.current?.click()}>
              Choose backup file
            </button>
            <input
              ref={restoreInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={restoreBackup}
            />
          </div>
        </section>

        <div className="delivery-safety-note">
          <strong>Data protection</strong>
          <p>Restoring a backup does not create, delete, or overwrite delivery assignments, orders, payments, customer records, or transaction history. Those records must be managed through authorised application services.</p>
        </div>

        {restoreError && <div className="delivery-error" role="alert">{restoreError}</div>}
      </>
    )
  }

  function renderSection() {
    switch (section) {
      case 'Overview':
        return renderOverview()

      case 'My Deliveries':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">DELIVERY WORKSPACE</span>
              <h2>My Deliveries</h2>
              <p>Review assigned deliveries and update their progress.</p>
            </section>
            <section className="delivery-panel">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Assigned delivery records</h3>
                  <p>Deliveries assigned to your account appear here.</p>
                </div>
                <span className="delivery-count-pill">{activeDeliveries.length} active</span>
              </div>
              {renderDeliveryTable(activeDeliveries)}
            </section>
          </>
        )

      case 'Pickup & Drop-off':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">ROUTE DETAILS</span>
              <h2>Pickup &amp; Drop-off</h2>
              <p>Check collection points and delivery destinations before starting a route.</p>
            </section>
            {deliveries.filter((item) => item.status !== 'Delivered').length === 0 ? (
              <section className="delivery-panel delivery-empty">
                <strong>No outstanding pickup or drop-off tasks</strong>
                <p>New assigned deliveries will appear here.</p>
              </section>
            ) : deliveries.filter((item) => item.status !== 'Delivered').map((delivery) => (
              <section className="delivery-panel delivery-route-card" key={delivery.id}>
                <div className="delivery-route-heading">
                  <div>
                    <span className="delivery-eyebrow">{delivery.id}</span>
                    <h3>{delivery.artwork}</h3>
                    <p>Customer: {delivery.customer}</p>
                  </div>
                  <StatusBadge status={delivery.status} />
                </div>
                <div className="delivery-route-points">
                  <div><span className="delivery-route-dot pickup" /><div><small>PICKUP</small><strong>{delivery.pickup}</strong></div></div>
                  <div className="delivery-route-line" />
                  <div><span className="delivery-route-dot dropoff" /><div><small>DROP-OFF</small><strong>{delivery.destination}</strong></div></div>
                </div>
                <p className="delivery-route-date">Scheduled date: {delivery.date}</p>
                <button type="button" className="delivery-secondary-button" onClick={() => setSection('My Deliveries')}>
                  Update delivery status
                </button>
              </section>
            ))}
          </>
        )

      case 'Delivery History':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">COMPLETED TASKS</span>
              <h2>Delivery History</h2>
              <p>Review deliveries marked as completed.</p>
            </section>
            <section className="delivery-panel">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Completed deliveries</h3>
                  <p>Historical delivery records are read-only in this view.</p>
                </div>
              </div>
              {renderDeliveryTable(completedDeliveries)}
            </section>
          </>
        )

      case 'Messages':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">COMMUNICATION</span>
              <h2>Messages</h2>
              <p>Keep delivery-related communication organised.</p>
            </section>
            <section className="delivery-panel">
              <div className="delivery-empty">
                <strong>No messages yet</strong>
                <p>Delivery-related messages will appear here when messaging is available.</p>
              </div>
            </section>
          </>
        )

      case 'My Profile':
        return renderProfile()

      case 'Settings':
        return renderSettings()

      case 'Backup & Restore':
        return renderBackup()
    }
  }

  const displayName = profile.fullName.trim() || 'Delivery Worker'

  return (
    <main className="delivery-dashboard" data-theme={theme.toLowerCase()}>
      <aside className="delivery-sidebar">
        <Link to="/" className="delivery-brand">
          artist<span>-wrld</span><b>.</b><small>DELIVERY WORKSPACE</small>
        </Link>

        <div className="delivery-sidebar-profile delivery-sidebar-profile-static">
          <span className="delivery-avatar">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </span>
          <span className="delivery-sidebar-profile-details">
            <strong>{displayName}</strong>
          </span>
        </div>

        <span className="delivery-nav-label">YOUR WORKSPACE</span>
        <nav className="delivery-nav" aria-label="Delivery dashboard navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item}
              className={section === item ? 'active' : ''}
              onClick={() => setSection(item)}
            >
              <span className="delivery-nav-icon" aria-hidden="true">
                {{
                  'Overview': '\u25A6',
                  'My Deliveries': '\u25C8',
                  'Pickup & Drop-off': '\u21C4',
                  'Delivery History': '\u25F7',
                  'Messages': '\u2709',
                  'My Profile': '\u25CB',
                  'Settings': '\u2699',
                  'Backup & Restore': '\u21BB',
                }[item]}
              </span>
              <span>{item}</span>
              {item === 'My Deliveries' && activeDeliveries.length > 0 && (
                <small>{activeDeliveries.length}</small>
              )}
            </button>
          ))}
        </nav>

        <button type="button" className="dashboard-logout-button" onClick={() => void logoutToLogin()}>Log out</button>
      </aside>

      <div className="delivery-main">
        <header className="delivery-topbar">
          <div>
            <span className="delivery-eyebrow">ARTIST-WRLD / DELIVERY</span>
            <h1>{section}</h1>
          </div>
          <div className="delivery-topbar-right">
            
          
            <button
              type="button"
              className="delivery-avatar-button"
              aria-label="Open My Profile"
              title="My Profile"
              onClick={() => setSection('My Profile')}
            >
              <span className="delivery-avatar">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </span>
            </button></div>
        </header>

        <div className="delivery-content">
          {notice && (
            <div className="delivery-notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>&times;</button>
            </div>
          )}
          {renderSection()}
          <footer className="delivery-footer">
            <span>artist-wrld.</span>
            <span>Every delivery, handled with care.</span>
          </footer>
        </div>
      </div>
    </main>
  )
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  return (
    <div className="delivery-list-row">
      <div className="delivery-artwork-placeholder" aria-hidden="true">&#x2727;</div>
      <div className="delivery-row-main">
        <strong>{delivery.artwork}</strong>
        <span>{delivery.id} &middot; {delivery.destination}</span>
      </div>
      <div className="delivery-row-end">
        <StatusBadge status={delivery.status} />
        <small>{delivery.date}</small>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Delivery['status'] }) {
  const statusClass = status.toLowerCase().replace(/\s+/g, '-')

  return <span className={`delivery-status is-${statusClass}`}>{status}</span>
}

export default DeliveryDashboard


