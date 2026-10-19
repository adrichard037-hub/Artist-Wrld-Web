import { logoutToLogin } from '../lib/logout'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './AdminDashboard.css'

type Role = 'Admin' | 'Artist' | 'Buyer' | 'Delivery Man'
type AccountStatus = 'Active' | 'Inactive'

type User = {
  id: string
  name: string
  username: string
  email: string
  role: Role
  status: AccountStatus
}

type DeletedUserAudit = {
  id: string
  username: string
  role: Role
  deletedBy: string
  deletedAt: string
  reason: string
}

const ADMIN_API_URL = 'https://artist-wrld-backend.onrender.com/api/admin'

type AdminArtwork = {
  id: string
  artistId: string
  title: string
  category: string
  description: string | null
  price: string | number
  image: string | null
  status: string
  createdAt: string
  updatedAt: string
}

type ApiUser = {
  id: string
  fullName: string
  username: string
  email: string
  role: 'ADMIN' | 'ARTIST' | 'BUYER' | 'DELIVERY_MAN'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

type SecurityReportUser = {
  id: string
  username: string
  passwordHash: string
  passwordSalt: string
}

type ApiDeletedUserAudit = {
  id: string
  username: string
  role: 'ADMIN' | 'ARTIST' | 'BUYER' | 'DELIVERY_MAN'
  deletedBy: string | null
  deletedAt: string
  reason: string | null
}

type ApiUserActivity = {
  id: string
  username: string
  role: string
  action: string
  details: string | null
  createdAt: string
}
type ArtistApplication = {
  id: string
  fullName: string
  username: string
  email: string
  createdAt: string
  registrationComplete: boolean
  isActive: boolean
  artistApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  bio: string | null
  location: string | null
  profileImage: string | null
}
function toDashboardRole(role: ApiUser['role'] | ApiDeletedUserAudit['role']): Role {
  switch (role) {
    case 'ADMIN': return 'Admin'
    case 'ARTIST': return 'Artist'
    case 'DELIVERY_MAN': return 'Delivery Man'
    default: return 'Buyer'
  }
}

function toApiRole(role: Role): ApiUser['role'] {
  switch (role) {
    case 'Admin': return 'ADMIN'
    case 'Artist': return 'ARTIST'
    case 'Delivery Man': return 'DELIVERY_MAN'
    default: return 'BUYER'
  }
}

function mapApiUser(user: ApiUser): User {
  return {
    id: user.id,
    name: user.fullName,
    username: user.username,
    email: user.email,
    role: toDashboardRole(user.role),
    status: user.isActive ? 'Active' : 'Inactive',
  }
}

type Section =
  | 'Overview'
  | 'User Management'
  | 'Artwork Management'
  | 'Orders & Sales'
  | 'Artist Verification'
  | 'Delivery Management'
  | 'Report'
  | 'User Activity'
  | 'Deleted Users Audit Trail'
  | 'Configuration Settings'
  | 'Backup & Restore'



const sections: Section[] = [
  'Overview',
  'User Management',
  'Artwork Management',
  'Orders & Sales',
  'Artist Verification',
  'Delivery Management',
  'Report',
  'User Activity',
  'Deleted Users Audit Trail',
  'Configuration Settings',
  'Backup & Restore',
]

function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const sectionFromUrl = (value: string | null): Section =>
    sections.find(
      (item) =>
        item.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-') === value
    ) ?? 'Overview'

  const section = sectionFromUrl(searchParams.get('section'))

  const setSection = (nextSection: Section) => {
    const slug = nextSection
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, '-')

    if (searchParams.get('section') === slug) return

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('section', slug)
      return next
    })
  }
  const [users, setUsers] = useState<User[]>([])
  const [backendStatus, setBackendStatus] = useState<'Checking…' | 'Connected' | 'Unavailable'>('Checking…')
  const [persistenceStatus, setPersistenceStatus] = useState<'Checking…' | 'Database-backed' | 'Unavailable'>('Checking…')
  const [adminArtworks, setAdminArtworks] = useState<AdminArtwork[]>([])
  const [artworksLoading, setArtworksLoading] = useState(false)
  const [artworksMessage, setArtworksMessage] = useState('')
  const [artworksReloadKey, setArtworksReloadKey] = useState(0)
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserAudit[]>([])
  const [userActivities, setUserActivities] = useState<ApiUserActivity[]>([])
  const [activityQuery, setActivityQuery] = useState('')
  const [activityRoleFilter, setActivityRoleFilter] = useState('All')
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityMessage, setActivityMessage] = useState('')
  const [artistApplications, setArtistApplications] = useState<ArtistApplication[]>([])
  const [artistApplicationsLoading, setArtistApplicationsLoading] = useState(false)
  const [artistApplicationsMessage, setArtistApplicationsMessage] = useState('')
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null)
  const [artistApplicationsReloadKey, setArtistApplicationsReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  // REPORT_VIEW_ON_SITE
  const [reportQuery, setReportQuery] = useState('')
  const [securityReportUsers, setSecurityReportUsers] = useState<SecurityReportUser[]>([])
  const [pepperConfigured, setPepperConfigured] = useState(false)
  const [securityReportMessage, setSecurityReportMessage] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusMessage, setStatusMessage] = useState('')
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'Buyer' as Role,
    status: 'Active' as AccountStatus,
  })
  const [siteName, setSiteName] = useState('Artist-Wrld')
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('artist-wrld-admin-theme') || 'Light')

  useEffect(() => {
    localStorage.setItem('artist-wrld-admin-theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false

    async function loadUsers() {
      try {
        const response = await fetch(`${ADMIN_API_URL}/users`, {
          credentials: 'include',
        })
        setBackendStatus('Connected')

        const data = await response.json()

        if (!response.ok) {
          setPersistenceStatus('Unavailable')
          throw new Error(data.message || 'Unable to load user accounts.')
        }

        if (!cancelled) {
          setUsers((data.users as ApiUser[]).map(mapApiUser))
          setPersistenceStatus('Database-backed')
        }
      } catch (error) {
        if (!cancelled) {
          setBackendStatus('Unavailable')
          setPersistenceStatus('Unavailable')
          setStatusMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load user accounts. Check your backend connection and administrator login.',
          )
        }
      }
    }

    void loadUsers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (section !== 'Artwork Management') return

    let cancelled = false

    async function loadAdminArtworks() {
      setArtworksLoading(true)
      setArtworksMessage('')

      try {
        const response = await fetch('https://artist-wrld-backend.onrender.com/api/artworks', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load artwork. Check your administrator login.',
          )
        }

        if (!Array.isArray(data.artworks)) {
          throw new Error('The artwork endpoint returned an unexpected response.')
        }

        if (!cancelled) {
          setAdminArtworks(data.artworks as AdminArtwork[])
          if (data.artworks.length === 0) {
            setArtworksMessage('No artwork records were found in the database.')
          }
        }
      } catch (error) {
        if (!cancelled) {
          setArtworksMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load artwork. Check that the backend is running.',
          )
        }
      } finally {
        if (!cancelled) {
          setArtworksLoading(false)
        }
      }
    }

    void loadAdminArtworks()

    return () => {
      cancelled = true
    }
  }, [section, artworksReloadKey])

  useEffect(() => {
    if (section !== 'Artist Verification') return

    let cancelled = false

    async function loadArtistApplications() {
      setArtistApplicationsLoading(true)
      setArtistApplicationsMessage('')

      try {
        const response = await fetch(
          `${ADMIN_API_URL}/artist-applications?status=PENDING`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load artist applications.',
          )
        }

        if (!cancelled) {
          setArtistApplications(
            Array.isArray(data.applications)
              ? data.applications as ArtistApplication[]
              : [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setArtistApplications([])
          setArtistApplicationsMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load applications. Check your administrator login and backend connection.',
          )
        }
      } finally {
        if (!cancelled) {
          setArtistApplicationsLoading(false)
        }
      }
    }

    void loadArtistApplications()

    return () => {
      cancelled = true
    }
  }, [section, artistApplicationsReloadKey])
  useEffect(() => {
    if (section !== 'Report') return

    let cancelled = false

    async function loadSecurityReport() {
      try {
        setSecurityReportMessage('Loading security report...')

        const response = await fetch(`${ADMIN_API_URL}/security-report`, {
          credentials: 'include',
          cache: 'no-store',
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load the security report.')
        }

        if (!cancelled) {
          setSecurityReportUsers(data.users as SecurityReportUser[])
          setPepperConfigured(Boolean(data.pepperConfigured))
          setSecurityReportMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setSecurityReportUsers([])
          setSecurityReportMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load the security report.',
          )
        }
      }
    }

    void loadSecurityReport()

    return () => {
      cancelled = true
    }
  }, [section])

  useEffect(() => {
    if (section !== 'Deleted Users Audit Trail') return

    let cancelled = false

    async function loadDeletedUsers() {
      try {
        const response = await fetch(
          `${ADMIN_API_URL}/deleted-users?page=1&limit=100`,
          { credentials: 'include' },
        )
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load deleted-user records.')
        }

        if (!cancelled) {
          setDeletedUsers(
            (data.deletedUsers as ApiDeletedUserAudit[]).map((entry) => ({
              id: entry.id,
              username: entry.username,
              role: toDashboardRole(entry.role),
              deletedBy: entry.deletedBy || 'Unavailable',
              deletedAt: new Date(entry.deletedAt).toLocaleString(),
              reason: entry.reason || 'No reason recorded',
            })),
          )
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load deleted-user records.',
          )
        }
      }
    }

    void loadDeletedUsers()

    return () => {
      cancelled = true
    }
  }, [section])

  useEffect(() => {
    if (section !== 'User Activity') return

    let cancelled = false

    async function loadUserActivities() {
      setActivityLoading(true)
      setActivityMessage('')

      try {
        const response = await fetch(
          `${ADMIN_API_URL}/user-activity?page=1&limit=100`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load user activity.')
        }

        if (!Array.isArray(data.activities)) {
          throw new Error('The server returned an unexpected activity response.')
        }

        if (!cancelled) {
          setUserActivities(data.activities as ApiUserActivity[])
        }
      } catch (error) {
        if (!cancelled) {
          setUserActivities([])
          setActivityMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load user activity.',
          )
        }
      } finally {
        if (!cancelled) {
          setActivityLoading(false)
        }
      }
    }

    void loadUserActivities()

    return () => {
      cancelled = true
    }
  }, [section])
  const [commission, setCommission] = useState('10')
  type FullBackup = {
    id: number
    createdAt: string
    format: 'ARTIST_WRLD_FULL_SNAPSHOT_V1'
    config: {
      siteName: string
      registrationEnabled: boolean
      theme: string
      commission: string
    }
    users: User[]
    deletedUsers: DeletedUserAudit[]
    dataCoverage: {
      users: string
      deletedUsers: string
      artworks: string
      ordersAndSales: string
      artistVerification: string
      deliveryRecords: string
    }
  }

  const [backups, setBackups] = useState<FullBackup[]>([])
  const [selectedBackup, setSelectedBackup] = useState('')

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        [user.name, user.username, user.email].some((value) =>
          value.toLowerCase().includes(normalized),
        )
      const matchesRole = roleFilter === 'All' || user.role === roleFilter
      return matchesQuery && matchesRole
    })
  }, [users, query, roleFilter])

  function openAddUser() {
    setEditingId(null)
    setForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'Buyer',
      status: 'Active',
    })
    setShowUserForm(true)
    setStatusMessage('')
  }

  function openEditUser(user: User) {
    setEditingId(user.id)
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    })
    setShowUserForm(true)
    setStatusMessage('')
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (users.some((user) =>
      user.id !== editingId &&
      (user.username.toLowerCase() === form.username.trim().toLowerCase() ||
       user.email.toLowerCase() === form.email.trim().toLowerCase()),
    )) {
      setStatusMessage('That username or email is already in use.')
      return
    }

    if (editingId === null && form.password.length < 8) {
      setStatusMessage('A password of at least 8 characters is required for a new account.')
      return
    }

    const payload = {
      fullName: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      role: toApiRole(form.role),
    }

    try {
      const response = await fetch(
        editingId === null
          ? `${ADMIN_API_URL}/users`
          : `${ADMIN_API_URL}/users/${encodeURIComponent(editingId)}`,
        {
          method: editingId === null ? 'POST' : 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            editingId === null
              ? { ...payload, password: form.password }
              : { ...payload, isActive: form.status === 'Active' },
          ),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to save the user account.')
      }

      if (editingId === null) {
        const createdUser = mapApiUser(data.user as ApiUser)
        setUsers((current) => [
          createdUser,
          ...current.filter((user) => user.id !== createdUser.id),
        ])

        if (typeof data.enrollmentToken === 'string') {
          const link = `${window.location.origin}/setup-authenticator#${data.enrollmentToken}`
          window.prompt(
            'Copy this one-time authenticator setup link and send it directly to the new user. It expires in 15 minutes. Do not post it publicly.',
            link,
          )
        }

        setStatusMessage('Account created in the database. The user must complete authenticator enrollment within 15 minutes.')
      } else {
        const refreshedResponse = await fetch(`${ADMIN_API_URL}/users`, {
          credentials: 'include',
        })
        const refreshedData = await refreshedResponse.json()

        if (!refreshedResponse.ok) {
          throw new Error(refreshedData.message || 'Account saved, but refreshing the user list failed.')
        }

        setUsers((refreshedData.users as ApiUser[]).map(mapApiUser))
        setStatusMessage('User account updated in the database.')
      }

      setShowUserForm(false)
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to save the user account.',
      )
    }
  }

  async function deleteUser(user: User) {
    if (user.role === 'Admin') {
      setStatusMessage('Administrator accounts are protected from this action in the dashboard.')
      return
    }

    const reason = window.prompt(`Reason for deactivating ${user.username}:`)
    if (reason === null) return

    if (!window.confirm(`Deactivate the account "${user.username}"? The account will remain in the database.`)) return

    try {
      const response = await fetch(
        `${ADMIN_API_URL}/users/${encodeURIComponent(user.id)}/deactivate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() || 'No reason provided' }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to deactivate the account.')
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, status: 'Inactive' } : item,
        ),
      )
      setStatusMessage('Account deactivated. It remains in the database; this is not a deletion.')
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to deactivate the account.',
      )
    }
  }

  async function permanentlyDeleteUser(user: User) {
    if (user.role === 'Admin') {
      setStatusMessage('Administrator accounts are protected from permanent deletion.')
      return
    }

    const reason = window.prompt(
      `Required reason for permanently deleting ${user.username}:`,
    )

    if (reason === null) return

    if (!reason.trim()) {
      setStatusMessage('A deletion reason is required.')
      return
    }

    const confirmed = window.confirm(
      `PERMANENTLY DELETE "${user.username}"?\n\n` +
      'This cannot be undone. The account will be removed from the active user list, ' +
      'and the deletion will be recorded in the audit trail.\n\nContinue?',
    )

    if (!confirmed) return

    try {
      const response = await fetch(
        `${ADMIN_API_URL}/users/${encodeURIComponent(user.id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to permanently delete the account.',
        )
      }

      setUsers((current) =>
        current.filter((item) => item.id !== user.id),
      )

      setStatusMessage(
        `Account "${user.username}" permanently deleted. The audit trail records the action.`,
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Unable to permanently delete the account.',
      )
    }
  }
  function exportUsers() {
    const normalizedReportQuery = reportQuery.trim().toLowerCase()
    const reportUsers = securityReportUsers.filter((user) =>
      user.username.toLowerCase().includes(normalizedReportQuery),
    )

    const headers = ['Username', 'Hashed Password', 'Salt', 'Pepper']
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const pepperStatus = pepperConfigured
      ? 'Configured - protected server-side'
      : 'Not configured'
    const rows = reportUsers.map((user) => [
      user.username,
      user.passwordHash,
      user.passwordSalt,
      pepperStatus,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'artist-wrld-user-security-report.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    setStatusMessage(
      `Security report exported for ${reportUsers.length} matching account(s). Password hashes and salts are sensitive; the pepper value was not exported.`,
    )
  }
function buildFullBackup(): FullBackup {
    return {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      format: 'ARTIST_WRLD_FULL_SNAPSHOT_V1',
      config: { siteName, registrationEnabled, theme, commission },
      users: users.map((user) => ({ ...user })),
      deletedUsers: deletedUsers.map((entry) => ({ ...entry })),
      dataCoverage: {
        users: 'Captured from the current dashboard state',
        deletedUsers: 'Captured from the current dashboard state',
        artworks: 'Not connected: no artwork records are available in this dashboard state',
        ordersAndSales: 'Not connected: no order or transaction records are available',
        artistVerification: 'Not connected: no application records are available',
        deliveryRecords: 'Not connected: no delivery records are available',
      },
    }
  }

  function createBackup() {
    const snapshot = buildFullBackup()
    setBackups((current) => [snapshot, ...current])
    setSelectedBackup(String(snapshot.id))
    setStatusMessage(
      'Full snapshot created with current users, deleted-user audit entries and configuration. Sections marked not connected contain no live records to back up.',
    )
  }

  function restoreConfiguration() {
    const backup = backups.find((item) => String(item.id) === selectedBackup)

    if (!backup) {
      setStatusMessage('Choose a backup first.')
      return
    }

    const confirmed = window.confirm(
      'Restore configuration settings from this backup? User accounts, artwork, orders, transactions, and audit records will not be restored or changed.',
    )

    if (!confirmed) return

    setSiteName(backup.config.siteName)
    setRegistrationEnabled(backup.config.registrationEnabled)
    setTheme(backup.config.theme)
    setCommission(backup.config.commission)

    setStatusMessage(
      'Configuration restored successfully. User accounts and audit records were not changed.',
    )
  }
  function downloadConfiguration() {
    const snapshot = buildFullBackup()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `artist-wrld-full-backup-${snapshot.id}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setStatusMessage(
      'Full JSON snapshot downloaded, including current users, deleted-user audit entries and configuration. Unconnected sections are explicitly identified.',
    )
  }
  async function decideArtistApplication(
    application: ArtistApplication,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const action = status === 'APPROVED' ? 'approve' : 'reject'

    if (
      !window.confirm(
        `Are you sure you want to ${action} the artist application for ${application.fullName} (@${application.username})?`,
      )
    ) {
      return
    }

    setProcessingApplicationId(application.id)
    setArtistApplicationsMessage('')

    try {
      const response = await fetch(
        `${ADMIN_API_URL}/artist-applications/${encodeURIComponent(application.id)}/decision`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to ${action} this artist application.`,
        )
      }

      setArtistApplications((current) =>
        current.filter((item) => item.id !== application.id),
      )

      setStatusMessage(
        data.message ||
          `Artist application ${status.toLowerCase()} successfully.`,
      )

      // Reload pending applications after the decision.
      setArtistApplicationsReloadKey((current) => current + 1)
    } catch (error) {
      setArtistApplicationsMessage(
        error instanceof Error
          ? error.message
          : `Unable to ${action} this artist application.`,
      )
    } finally {
      setProcessingApplicationId(null)
    }
  }
  function renderOverview() {
    return (
      <>
        <div className="admin-stat-grid">
          <article className="admin-stat"><span>Total users</span><strong>{users.length}</strong><small>All account roles</small></article>
          <article className="admin-stat"><span>Artists</span><strong>{users.filter((user) => user.role === 'Artist').length}</strong><small>Artist accounts</small></article>
          <article className="admin-stat"><span>Active accounts</span><strong>{users.filter((user) => user.status === 'Active').length}</strong><small>Demonstration data</small></article>
          <article className="admin-stat"><span>Deleted-user records</span><strong>{deletedUsers.length}</strong><small>Current session only</small></article>
        </div>

        <div className="admin-panel-grid">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h3>Quick actions</h3><p>Common administration tasks</p></div></div>
            <div className="admin-quick-actions">
              <button onClick={openAddUser}>Add user</button>
              <button onClick={() => setSection('User Management')}>Manage users</button>
              <button onClick={() => setSection('Report')}>Report</button>
              <button onClick={() => setSection('Backup & Restore')}>Backup and Restore</button>
            </div>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h3>Platform status</h3>
                <p>{backendStatus === 'Connected' ? 'Backend server responded' : backendStatus === 'Checking…' ? 'Checking the backend connection' : 'Backend connection could not be reached'}</p>
              </div>
            </div>
            <div className="admin-status-row">
              <span>Backend connection</span>
              <strong className={`admin-badge ${backendStatus === 'Connected' ? 'good' : 'pending'}`}>{backendStatus}</strong>
            </div>
            <div className="admin-status-row">
              <span>Account persistence</span>
              <strong className={`admin-badge ${persistenceStatus === 'Database-backed' ? 'good' : 'pending'}`}>{persistenceStatus}</strong>
            </div>
            <div className="admin-status-row">
              <span>Backup data including settings</span>
              <strong className="admin-badge good">Users, audit records and settings</strong>
            </div>
          </section>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h3>Recently registered users</h3><p>{persistenceStatus === 'Database-backed' ? 'Accounts loaded from the backend database' : persistenceStatus === 'Checking…' ? 'Loading registered accounts…' : 'Live account data is currently unavailable'}</p></div><button className="admin-text-button" onClick={() => setSection('User Management')}>View all</button></div>
          <UserTable users={users.slice(-4).reverse()} onEdit={openEditUser} onDelete={deleteUser} onPermanentlyDelete={permanentlyDeleteUser} />
        </section>
      </>
    )
  }

  function renderUsers() {
    return (
      <>
        <div className="admin-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username or email" aria-label="Search users" />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role">
            <option>All</option><option>Admin</option><option>Artist</option><option>Buyer</option><option>Delivery Man</option>
          </select>
          <button className="admin-primary-button" onClick={openAddUser}>Add user</button>
        </div>
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h3>User accounts</h3><p>{filteredUsers.length} matching accounts</p></div></div>
          <UserTable users={filteredUsers} onEdit={openEditUser} onDelete={deleteUser} onPermanentlyDelete={permanentlyDeleteUser} />
        </section>
        {showUserForm && (
          <div className="admin-modal-backdrop">
            <form className="admin-modal" onSubmit={saveUser}>
              <div className="admin-panel-heading"><div><h3>{editingId === null ? 'Add user' : 'Modify user'}</h3><p>Account changes are saved to the database.</p></div><button type="button" className="admin-close" onClick={() => setShowUserForm(false)} aria-label="Close">&times;</button></div>
              <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Username<input required minLength={3} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label>Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              {editingId === null && <label>Initial password<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>The user must complete authenticator enrollment after the account is created.</small></label>}
              <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}><option>Admin</option><option>Artist</option><option>Buyer</option><option>Delivery Man</option></select></label>
              {editingId !== null && <label>Account status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AccountStatus })}><option>Active</option><option>Inactive</option></select></label>}
              <div className="admin-modal-actions"><button type="button" className="admin-secondary-button" onClick={() => setShowUserForm(false)}>Cancel</button><button className="admin-primary-button" type="submit">Save user</button></div>
            </form>
          </div>
        )}
      </>
    )
  }

  function renderSection() {
    switch (section) {
      case 'Overview': return renderOverview()
      case 'User Management': return renderUsers()
      case 'User Activity': {
        const normalizedActivityQuery = activityQuery.trim().toLowerCase()

        const filteredActivities = userActivities.filter((entry) => {
          const matchesQuery = [
            entry.username,
            entry.role,
            entry.action,
            entry.details || '',
          ].some((value) => value.toLowerCase().includes(normalizedActivityQuery))

          const matchesRole =
            activityRoleFilter === 'All' ||
            entry.role.toUpperCase() === activityRoleFilter

          return matchesQuery && matchesRole
        })

        return (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h3>User activity</h3>
                <p>
                  Recent recorded actions from the application audit log.
                  Showing up to 100 latest records.
                </p>
              </div>
            </div>

            <div className="admin-toolbar">
              <input
                type="search"
                aria-label="Search user activity"
                placeholder="Search username, action, or details"
                value={activityQuery}
                onChange={(event) => setActivityQuery(event.target.value)}
              />

              <select
                aria-label="Filter user activity by role"
                value={activityRoleFilter}
                onChange={(event) => setActivityRoleFilter(event.target.value)}
              >
                <option value="All">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="ARTIST">Artist</option>
                <option value="BUYER">Buyer</option>
                <option value="DELIVERY_MAN">Delivery Man</option>
              </select>
            </div>

            {activityMessage && (
              <div className="admin-report-warning" role="alert">
                <p>{activityMessage}</p>
              </div>
            )}

            {activityLoading ? (
              <div className="admin-empty-state" role="status">
                <strong>Loading user activity</strong>
                <p>Retrieving recorded actions from the server.</p>
              </div>
            ) : activityMessage ? null : filteredActivities.length > 0 ? (
              <div className="admin-table-wrap admin-activity-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date and time</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.createdAt).toLocaleString()}</td>
                        <td>@{entry.username}</td>
                        <td>{entry.role.replace(/_/g, ' ')}</td>
                        <td>{entry.action.replace(/_/g, ' ').toLowerCase()}</td>
                        <td>{entry.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <strong>No matching activity records</strong>
                <p>
                  Try another search or role. Only actions recorded in the audit
                  log can be displayed here.
                </p>
              </div>
            )}
          </section>
        )
      }
      case 'Deleted Users Audit Trail':
        return <section className="admin-panel"><div className="admin-panel-heading"><div><h3>Deleted users audit trail</h3><p>Persistent records retrieved from the backend. Deactivated accounts are tracked separately.</p></div></div>{deletedUsers.length ? <div id="admin-report-table" className="admin-table-wrap"><table><thead><tr><th>Username</th><th>Role</th><th>Deleted by</th><th>Date</th><th>Reason</th></tr></thead><tbody>{deletedUsers.map((entry) => <tr key={entry.id}><td>{entry.username}</td><td>{entry.role}</td><td>{entry.deletedBy}</td><td>{entry.deletedAt}</td><td>{entry.reason}</td></tr>)}</tbody></table></div> : <div className="admin-empty-state"><strong>No deleted-user records</strong><p>No permanent deletion records were returned by the backend.</p></div>}</section>
      case 'Report': {
        const normalizedReportQuery = reportQuery.trim().toLowerCase()
        const reportUsers = securityReportUsers.filter((user) =>
          user.username.toLowerCase().includes(normalizedReportQuery),
        )
        const roleCounts = users.reduce<Record<string, number>>((counts, user) => {
          counts[user.role] = (counts[user.role] || 0) + 1
          return counts
        }, {})

        return (
          <section className="admin-panel admin-report-page">
            <div className="admin-panel-heading">
              <div>
                <h3>Report</h3>
                <p>View and manage the account security report.</p>
              </div>
              <div className="admin-button-row">
                <button className="admin-secondary-button" onClick={() => document.getElementById('admin-report-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>View Report</button>
                <button className="admin-primary-button" onClick={exportUsers}>
                  Download CSV
                </button>
              </div>
            </div>

            <div className="admin-report-warning">
              <strong>Security notice</strong>
              <p>
                This administrator-only report displays stored password hashes and salts
                for the assignment. These values are sensitive. The actual pepper remains
                on the server and is never returned or exported.
              </p>
            </div>

            {securityReportMessage && (
              <div className="admin-report-warning" role="status">
                <p>{securityReportMessage}</p>
              </div>
            )}

            <div className="admin-report-summary">
              <div className="admin-report-summary-card">
                <span>Total Accounts</span>
                <strong>{users.length}</strong>
                <small>All registered accounts</small>
              </div>
              <div className="admin-report-summary-card">
                <span>Artist Accounts</span>
                <strong>{roleCounts['Artist'] || 0}</strong>
                <small>Artist role</small>
              </div>
              <div className="admin-report-summary-card">
                <span>Buyer Accounts</span>
                <strong>{roleCounts['Buyer'] || 0}</strong>
                <small>Buyer role</small>
              </div>
              <div className="admin-report-summary-card">
                <span>Delivery Man Accounts</span>
                <strong>{roleCounts['Delivery Man'] || 0}</strong>
                <small>Delivery role</small>
              </div>
              <div className="admin-report-summary-card">
                <span>Admin Accounts</span>
                <strong>{roleCounts['Admin'] || 0}</strong>
                <small>Administrator role</small>
              </div>
            </div>

            <div className="admin-report-fields">
              {['Username', 'Hashed Password', 'Salt', 'Pepper'].map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>

            <label className="admin-field-label">
              Search report by username
              <input
                type="search"
                value={reportQuery}
                onChange={(event) => setReportQuery(event.target.value)}
                placeholder="Enter a username"
              />
            </label>

            <div id="admin-report-table" className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Hashed Password</th>
                    <th>Salt</th>
                    <th>Pepper</th>
                  </tr>
                </thead>
                <tbody>
                  {reportUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td className="admin-security-report-value">{user.passwordHash}</td>
                      <td className="admin-security-report-value">{user.passwordSalt}</td>
                      <td>{pepperConfigured ? 'Configured - protected server-side' : 'Not configured'}</td>
                    </tr>
                  ))}
                  {reportUsers.length === 0 && (
                    <tr>
                      <td colSpan={4}>No matching usernames found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-report-footnote">
              <span className="admin-report-footnote-count">
                Showing {reportUsers.length} of {securityReportUsers.length} report accounts
              </span>
              <span className="admin-report-footnote-detail">
                Hashes and salts are sensitive. The pepper itself is never disclosed.
              </span>
            </div>
          </section>
        )
      }      case 'Configuration Settings':
        return <section className="admin-panel"><div className="admin-panel-heading"><div><h3>Configuration settings</h3><p>Adjust demonstration settings for Artist-Wrld.</p></div></div><div className="admin-settings-form"><label>Website name<input value={siteName} onChange={(event) => setSiteName(event.target.value)} /></label><label>Marketplace commission (%)<input type="number" min="0" max="100" value={commission} onChange={(event) => setCommission(event.target.value)} /></label><label>Interface theme<select value={theme} onChange={(event) => setTheme(event.target.value)}><option>Light</option><option>Dark</option><option>System</option></select></label><label className="admin-toggle-setting"><span><strong>Allow new registrations</strong><small>Controls the demonstration setting only.</small></span><input type="checkbox" checked={registrationEnabled} onChange={(event) => setRegistrationEnabled(event.target.checked)} /></label><button className="admin-primary-button" onClick={() => setStatusMessage('Settings updated in this demonstration session.')}>Save settings</button></div></section>
      case 'Backup & Restore':
        return <div className="admin-backup-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><h3>Full Application Backup</h3><p>Captures all available application data and current configuration settings.</p></div></div><div className="admin-report-warning"><strong>Complete Available Data</strong><p>The backup includes available user accounts, deleted-user audit entries and configuration settings. Unconnected artwork, orders, sales, verification and delivery records are clearly identified.</p></div><div className="admin-button-row"><button className="admin-primary-button" onClick={createBackup}>Create Full Backup</button><button className="admin-secondary-button" onClick={downloadConfiguration}>Download Full Backup</button></div>{backups.length > 0 && <div className="admin-backup-list"><h4>Session snapshots</h4>{backups.map((backup) => <div key={backup.id}>{new Date(backup.createdAt).toLocaleString()} <span>Users: {backup.users.length} · Audit entries: {backup.deletedUsers.length}</span></div>)}</div>}</section><section className="admin-panel"><div className="admin-panel-heading"><div><h3>Restore from Backup</h3><p>Recover missing data while protecting existing records and newer information.</p></div></div><label className="admin-field-label">Select Backup to Restore<select value={selectedBackup} onChange={(event) => setSelectedBackup(event.target.value)}><option value="">Select a snapshot</option>{backups.map((backup) => <option value={backup.id} key={backup.id}>{backup.createdAt}</option>)}</select></label><button className="admin-primary-button" onClick={restoreConfiguration} disabled={!selectedBackup}>Restore Backup</button></section></div>
      case 'Artwork Management':
        return (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h3>Artwork management</h3>
                <p>View artwork listings stored in the Artist-Wrld database.</p>
              </div>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setArtworksReloadKey((current) => current + 1)}
                disabled={artworksLoading}
              >
                {artworksLoading ? 'Refreshing...' : 'Refresh artwork'}
              </button>
            </div>

            {artworksLoading && (
              <div className="admin-empty-state">
                <strong>Loading artwork...</strong>
                <p>Retrieving artwork records from the database.</p>
              </div>
            )}

            {!artworksLoading && artworksMessage && (
              <div className="admin-empty-state">
                <strong>
                  {adminArtworks.length === 0 ? 'Artwork unavailable' : 'Artwork notice'}
                </strong>
                <p>{artworksMessage}</p>
                {adminArtworks.length === 0 && (
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => setArtworksReloadKey((current) => current + 1)}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            {adminArtworks.length > 0 && (
              <div className="admin-artwork-grid">
                {adminArtworks.map((artwork) => {
                  const artist = users.find((user) => user.id === artwork.artistId)
                  const numericPrice = Number(artwork.price)
                  const formattedPrice = Number.isFinite(numericPrice)
                    ? `GH₵ ${numericPrice.toLocaleString('en-GH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : `GH₵ ${artwork.price}`

                  return (
                    <article className="admin-artwork-card" key={artwork.id}>
                      <div className="admin-artwork-image-wrap">
                        {artwork.image ? (
                          <img
                            className="admin-artwork-image"
                            src={artwork.image}
                            alt={artwork.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="admin-artwork-no-image">
                            No image available
                          </div>
                        )}
                      </div>

                      <div className="admin-artwork-details">
                        <div className="admin-artwork-title-row">
                          <h4>{artwork.title}</h4>
                          <span
                            className={`admin-badge ${
                              artwork.status === 'Published' ? 'good' : 'pending'
                            }`}
                          >
                            {artwork.status}
                          </span>
                        </div>

                        <p className="admin-artwork-artist">
                          Artist: {artist?.name || artwork.artistId}
                        </p>

                        <p className="admin-artwork-category">
                          {artwork.category}
                        </p>

                        <strong className="admin-artwork-price">
                          {formattedPrice}
                        </strong>

                        {artwork.description && (
                          <p className="admin-artwork-description">
                            {artwork.description}
                          </p>
                        )}

                        <small className="admin-artwork-date">
                          Added: {new Date(artwork.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            <div className="admin-artwork-summary">
              <span>Total artwork records</span>
              <strong>{adminArtworks.length}</strong>
            </div>
          </section>
        )
      case 'Orders & Sales':
        return <section className="admin-panel"><div className="admin-panel-heading"><div><h3>Orders & sales</h3><p>Transaction information is not connected yet.</p></div></div><div className="admin-empty-state"><strong>No live transaction data</strong><p>Connect a backend before displaying real orders, payments or revenue.</p></div></section>
      case 'Artist Verification':
        return (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h3>Artist verification</h3>
                <p>Review artist applications before granting access to artist features.</p>
              </div>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() =>
                  setArtistApplicationsReloadKey((current) => current + 1)
                }
                disabled={artistApplicationsLoading || processingApplicationId !== null}
              >
                Refresh
              </button>
            </div>

            {artistApplicationsMessage && (
              <div className="admin-notice" role="alert">
                {artistApplicationsMessage}
              </div>
            )}

            {artistApplicationsLoading ? (
              <div className="admin-empty-state">
                <strong>Loading applications...</strong>
                <p>Retrieving pending artist applications from the backend.</p>
              </div>
            ) : artistApplications.length === 0 ? (
              <div className="admin-empty-state">
                <strong>No pending artist applications</strong>
                <p>Pending applications will appear here when available.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Profile</th>
                      <th>Registration</th>
                      <th>Application date</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artistApplications.map((application) => {
                      const processing =
                        processingApplicationId === application.id

                      const canApprove =
                        application.isActive &&
                        application.registrationComplete

                      return (
                        <tr key={application.id}>
                          <td>
                            <strong>{application.fullName}</strong>
                            <small className="admin-cell-subtitle">
                              @{application.username}
                            </small>
                            <small className="admin-cell-subtitle">
                              {application.email}
                            </small>
                            {application.profileImage && (
                              <img
                                src={application.profileImage}
                                alt={`${application.fullName}'s profile`}
                                loading="lazy"
                                style={{
                                  display: 'block',
                                  width: 54,
                                  height: 54,
                                  objectFit: 'cover',
                                  borderRadius: '50%',
                                  marginTop: 10,
                                }}
                              />
                            )}
                          </td>
                          <td>
                            <strong>
                              {application.location || 'Location not provided'}
                            </strong>
                            <small className="admin-cell-subtitle">
                              {application.bio || 'No biography provided'}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`admin-badge ${
                                canApprove ? 'good' : 'pending'
                              }`}
                            >
                              {!application.isActive
                                ? 'Inactive'
                                : !application.registrationComplete
                                  ? 'Incomplete'
                                  : 'Complete'}
                            </span>
                          </td>
                          <td>
                            {new Date(application.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                disabled={
                                  processing ||
                                  processingApplicationId !== null ||
                                  !canApprove
                                }
                                onClick={() =>
                                  void decideArtistApplication(
                                    application,
                                    'APPROVED',
                                  )
                                }
                                title={
                                  !canApprove
                                    ? 'The artist must be active and complete registration before approval.'
                                    : 'Approve this artist application'
                                }
                              >
                                {processing ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                className="danger"
                                disabled={
                                  processing ||
                                  processingApplicationId !== null
                                }
                                onClick={() =>
                                  void decideArtistApplication(
                                    application,
                                    'REJECTED',
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      case 'Delivery Management':
        return <section className="admin-panel"><div className="admin-panel-heading"><div><h3>Delivery management</h3><p>Delivery tracking is not connected yet.</p></div></div><div className="admin-empty-state"><strong>No live delivery records</strong><p>Connect order and delivery services to manage active deliveries.</p></div></section>
    }
  }

  return (
    <div className="admin-layout" data-theme={theme.toLowerCase()}>
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand"><span className="admin-brand-main">artist</span><span className="admin-brand-light">-wrld</span><span className="admin-brand-dot">.</span><small>ADMINISTRATION</small></Link>
        <div className="admin-profile"><div className="admin-avatar">A</div><div><strong>Administrator</strong><span>Admin workspace</span></div></div>
        <nav className="admin-nav" aria-label="Admin navigation">
          <span className="admin-nav-label">WORKSPACE</span>
          {sections.slice(0, 7).map((item, index) => (
            <button key={item} className={section === item ? 'active' : ''} onClick={() => { setSection(item); setStatusMessage('') }}>
              
              <span className="admin-nav-icon" aria-hidden="true">
                {[
                  <svg key="overview" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
                  <svg key="users" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="4" /><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4.5a4 4 0 0 1 0 7.5M18 14a5 5 0 0 1 4 5v2" /></svg>,
                  <svg key="artwork" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
                  <svg key="orders" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h12l3 5-9 5-9-5 3-5Z" /><path d="M3 8v11l9 4 9-4V8M12 13v10" /></svg>,
                  <svg key="verification" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>,
                  <svg key="delivery" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h12v12H3zM15 10h4l3 4v4h-7" /><circle cx="7.5" cy="18.5" r="2" /><circle cx="18.5" cy="18.5" r="2" /></svg>,
                  <svg key="reports" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
                  <svg key="audit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h18v16H3zM7 8h10M7 12h7M7 16h4" /><circle cx="18" cy="16" r="3" /></svg>,
                  <svg key="settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)" /></svg>,
                  <svg key="backup" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /><path d="M4 7a8 8 0 0 1 13-3" /></svg>
                ][index]}
              </span>
              <span className="admin-nav-text">{item}</span>
            </button>
          ))}
          <span className="admin-nav-label">SECURITY & SETTINGS</span>
          {sections.slice(7).map((item, index) => (
            <button key={item} className={section === item ? 'active' : ''} onClick={() => { setSection(item); setStatusMessage('') }}>
              
              <span className="admin-nav-icon" aria-hidden="true">
                {[
                  <svg key="activity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>,                  <svg key="audit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h18v16H3zM7 8h10M7 12h7M7 16h4" /><circle cx="18" cy="16" r="3" /></svg>,
                  <svg key="settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1m0-14.2L17 7M7 17l-2.1 2.1" /></svg>,
                  <svg key="backup" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /><path d="M4 7a8 8 0 0 1 13-3" /></svg>
                ][index]}
              </span>
              <span className="admin-nav-text">{item}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="dashboard-logout-button" onClick={() => void logoutToLogin()}>Log out</button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><div><span className="admin-eyebrow">ARTIST-WRLD / ADMIN</span><h1>{section}</h1></div><div className="admin-topbar-right"><button type="button" className="dashboard-back-button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} aria-label="Go back" title="Go back">&#8592;</button><Link to="/" className="admin-home-link">Marketplace</Link></div></header>
        <div className="admin-content">
          {statusMessage && <div className="admin-notice" role="status"><span>{statusMessage}</span><button onClick={() => setStatusMessage('')} aria-label="Dismiss message">&times;</button></div>}
          {renderSection()}
          <footer className="admin-footer">Artist-Wrld Administration</footer>
        </div>
      </main>
    </div>
  )
}

function UserTable({ users, onEdit, onDelete, onPermanentlyDelete }: {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onPermanentlyDelete: (user: User) => void
}) {
  if (users.length === 0) {
    return <div className="admin-empty-state"><strong>No users found</strong><p>Try changing your search or filter.</p></div>
  }

  return (
    <div id="admin-report-table" className="admin-table-wrap">
      <table>
        <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{users.map((user) => (
          <tr key={user.id}>
            <td><strong>{user.name}</strong><small className="admin-cell-subtitle">{user.email}</small></td>
            <td>@{user.username}</td>
            <td><span className="admin-role-badge">{user.role}</span></td>
            <td><span className={`admin-badge ${user.status === 'Active' ? 'good' : 'pending'}`}>{user.status}</span></td>
            <td><div className="admin-row-actions"><button onClick={() => onEdit(user)}>Edit</button>{user.role === 'Admin' ? (
  <button type="button" disabled title="Administrator accounts are protected from deletion">Protected</button>
) : (
  <>
  <button type="button" className="danger" onClick={() => onDelete(user)}>Deactivate</button>
  <button type="button" className="danger" onClick={() => onPermanentlyDelete(user)}>Delete Permanently</button>
  </>
)}</div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default AdminDashboard






















