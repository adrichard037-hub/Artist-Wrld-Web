import { logoutToLogin } from '../lib/logout'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_URL } from '../lib/api'
import './DeliveryDashboard.css'

const API_BASE_URL = API_URL

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
  | 'All Deliveries'
  | 'Awaiting Pickup'
  | 'In Transit'
  | 'Completed'
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

type WorkspaceMessage = {
  id: string
  senderId: string
  recipientId: string
  subject: string
  body: string
  readAt: string | null
  createdAt: string
}

type BackupSnapshot = {
  id: string
  format: string
  createdAt: string
}

async function fetchWorkspaceMessages(): Promise<WorkspaceMessage[]> {
  const response = await fetch(`${API_BASE_URL}/workspace/messages`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) throw new Error(await getApiError(response))

  const payload = await response.json() as {
    messages?: WorkspaceMessage[]
  }

  if (!Array.isArray(payload.messages)) {
    throw new Error('The server returned an invalid messages response.')
  }

  return payload.messages
}

async function fetchBackupSnapshots(): Promise<BackupSnapshot[]> {
  const response = await fetch(`${API_BASE_URL}/workspace/backups`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) throw new Error(await getApiError(response))

  const payload = await response.json() as {
    snapshots?: BackupSnapshot[]
  }

  if (!Array.isArray(payload.snapshots)) {
    throw new Error('The server returned an invalid backup list.')
  }

  return payload.snapshots
}

const navigation: Section[] = [
  'Overview',
  'All Deliveries',
  'Awaiting Pickup',
  'In Transit',
  'Completed',
  'Messages',
  'My Profile',
  'Settings',
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
    ([...navigation, 'Backup & Restore'] as Section[]).find(
      (item) =>
        item.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-') === value,
    ) ?? 'Overview'

  const section = sectionFromUrl(searchParams.get('section'))
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [notice, setNotice] = useState('')
  const [restoreError, setRestoreError] = useState('')

  const [userId, setUserId] = useState('')
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [recipientId, setRecipientId] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [messageBusy, setMessageBusy] = useState(false)
  const [messageError, setMessageError] = useState('')

  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([])
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupError, setBackupError] = useState('')

  const messagesLoading = section === 'Messages' && !messagesLoaded
  const snapshotsLoading = section === 'Backup & Restore' && !snapshotsLoaded

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
          user?: { id?: string; fullName?: string; email?: string }
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

        setUserId(payload.user.id ?? '')

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
  async function loadMessages() {
    try {
      setMessages(await fetchWorkspaceMessages())
      setMessageError('')
    } catch (error) {
      setMessageError(
        error instanceof Error ? error.message : 'Unable to load messages.',
      )
    } finally {
      setMessagesLoaded(true)
    }
  }

  async function sendWorkspaceMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessageError('')
    setNotice('')

    const cleanRecipient = recipientId.trim()
    const cleanSubject = messageSubject.trim()
    const cleanBody = messageBody.trim()

    if (!cleanRecipient || !cleanSubject || !cleanBody) {
      setMessageError('Enter a recipient account ID, subject, and message.')
      return
    }

    if (cleanSubject.length > 200 || cleanBody.length > 10000) {
      setMessageError('The subject limit is 200 characters; the message limit is 10,000.')
      return
    }

    if (cleanRecipient === userId) {
      setMessageError('You cannot send a message to your own account.')
      return
    }

    setMessageBusy(true)

    try {
      const response = await fetch(`${API_BASE_URL}/workspace/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: cleanRecipient,
          subject: cleanSubject,
          body: cleanBody,
        }),
      })

      if (!response.ok) throw new Error(await getApiError(response))

      setMessageSubject('')
      setMessageBody('')
      setNotice('Message sent successfully.')
      setMessagesLoaded(false)
      await loadMessages()
    } catch (error) {
      setMessageError(
        error instanceof Error ? error.message : 'Unable to send the message.',
      )
    } finally {
      setMessageBusy(false)
    }
  }

  async function markWorkspaceMessageRead(messageId: string) {
    setMessageError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/workspace/messages/${encodeURIComponent(messageId)}/read`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )

      if (!response.ok) throw new Error(await getApiError(response))

      const payload = await response.json() as { item?: WorkspaceMessage }

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                readAt: payload.item?.readAt ?? new Date().toISOString(),
              }
            : item,
        ),
      )
    } catch (error) {
      setMessageError(
        error instanceof Error
          ? error.message
          : 'Unable to mark the message as read.',
      )
    }
  }

  async function loadBackupSnapshots() {
    try {
      setSnapshots(await fetchBackupSnapshots())
      setBackupError('')
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Unable to load saved backups.',
      )
    } finally {
      setSnapshotsLoaded(true)
    }
  }

  async function createServerBackup() {
    setBackupBusy(true)
    setBackupError('')
    setNotice('')

    try {
      const response = await fetch(`${API_BASE_URL}/workspace/backup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) throw new Error(await getApiError(response))

      const payload = await response.json() as { message?: string }

      setNotice(payload.message || 'Server backup created successfully.')
      setSnapshotsLoaded(false)
      await loadBackupSnapshots()
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Unable to create a server backup.',
      )
    } finally {
      setBackupBusy(false)
    }
  }

  async function restoreServerBackup(snapshot: BackupSnapshot) {
    if (!window.confirm(
      'Restore this server backup? Existing records will not be overwritten.',
    )) return

    setBackupBusy(true)
    setBackupError('')
    setNotice('')

    try {
      const response = await fetch(`${API_BASE_URL}/workspace/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshotId: snapshot.id }),
      })

      if (!response.ok) throw new Error(await getApiError(response))

      const payload = await response.json() as { message?: string }

      setNotice(
        payload.message ||
        'Restore completed. Existing records were not overwritten.',
      )

      setSnapshotsLoaded(false)
      await Promise.all([
        loadBackupSnapshots(),
        loadDeliveryAssignments(() => true, setDeliveries, setNotice),
      ])
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Unable to restore this backup.',
      )
    } finally {
      setBackupBusy(false)
    }
  }

  async function deleteServerBackup(snapshot: BackupSnapshot) {
    if (!window.confirm('Permanently delete this saved server backup?')) return

    setBackupBusy(true)
    setBackupError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/workspace/backups/${encodeURIComponent(snapshot.id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      )

      if (!response.ok) throw new Error(await getApiError(response))

      setSnapshots((current) =>
        current.filter((item) => item.id !== snapshot.id),
      )
      setNotice('Server backup deleted successfully.')
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Unable to delete this backup.',
      )
    } finally {
      setBackupBusy(false)
    }
  }

  useEffect(() => {
    if (section !== 'Messages') return

    let active = true

    void fetchWorkspaceMessages()
      .then((items) => {
        if (active) {
          setMessages(items)
          setMessageError('')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessageError(
            error instanceof Error ? error.message : 'Unable to load messages.',
          )
        }
      })
      .finally(() => {
        if (active) setMessagesLoaded(true)
      })

    return () => {
      active = false
    }
  }, [section])

  useEffect(() => {
    if (section !== 'Backup & Restore') return

    let active = true

    void fetchBackupSnapshots()
      .then((items) => {
        if (active) {
          setSnapshots(items)
          setBackupError('')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setBackupError(
            error instanceof Error
              ? error.message
              : 'Unable to load saved backups.',
          )
        }
      })
      .finally(() => {
        if (active) setSnapshotsLoaded(true)
      })

    return () => {
      active = false
    }
  }, [section])

  function setSection(nextSection: Section) {
    setNotice('')
    setRestoreError('')

    if (nextSection !== section && nextSection === 'Messages') {
      setMessagesLoaded(false)
    } else if (
      nextSection !== section &&
      nextSection === 'Backup & Restore'
    ) {
      setSnapshotsLoaded(false)
    }

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
            onClick={() => setSection('Awaiting Pickup')}
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
              onClick={() => setSection('Awaiting Pickup')}
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

  function renderDeliveryCards(items: Delivery[]) {
    if (items.length === 0) {
      return (
        <div className="delivery-empty delivery-cards-empty">
          <span className="delivery-cards-empty-icon" aria-hidden="true">&#x25C7;</span>
          <strong>You're all caught up</strong>
          <p>New delivery assignments will appear here when they are assigned to you.</p>
        </div>
      )
    }

    return (
      <div className="delivery-cards-grid">
        {items.map((delivery) => (
          <article className="delivery-work-card" key={delivery.id}>
            <div className="delivery-work-card-top">
              <span className="delivery-work-card-reference">
                DELIVERY / {delivery.id}
              </span>
              <StatusBadge status={delivery.status} />
            </div>

            <div className="delivery-work-card-artwork">
              <span className="delivery-work-card-artwork-icon" aria-hidden="true">
                &#x25C7;
              </span>
              <div>
                <span className="delivery-work-card-label">ARTWORK</span>
                <h3>{delivery.artwork}</h3>
              </div>
            </div>

            <div className="delivery-work-card-details">
              <div>
                <span className="delivery-work-card-label">CUSTOMER</span>
                <strong>{delivery.customer}</strong>
              </div>
              <div>
                <span className="delivery-work-card-label">DESTINATION</span>
                <strong>{delivery.destination}</strong>
              </div>
              <div>
                <span className="delivery-work-card-label">SCHEDULED DATE</span>
                <strong>{delivery.date}</strong>
              </div>
            </div>

            <div className="delivery-work-card-footer">
              <div className="delivery-work-card-progress">
                <span className={`delivery-work-card-progress-dot ${delivery.status === 'Delivered' ? 'is-complete' : ''}`} />
                <span>
                  {delivery.status === 'Delivered'
                    ? 'Delivery completed'
                    : delivery.status === 'In Transit'
                      ? 'On the way to destination'
                      : delivery.status === 'Picked Up'
                        ? 'Artwork collected'
                        : 'Awaiting collection'}
                </span>
              </div>

              <label className="delivery-work-card-status-control">
                <span>UPDATE STATUS</span>
                {delivery.status === 'Delivered' ? (
                  <strong className="delivery-work-card-completed">Completed &#x2713;</strong>
                ) : (
                  <select
                    aria-label={`Update status for ${delivery.id}`}
                    value={delivery.status}
                    onChange={(event) =>
                      updateDeliveryStatus(
                        delivery.id,
                        event.target.value as Delivery['status']
                      )
                    }
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="Picked Up">Picked Up</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                )}
              </label>
            </div>
          </article>
        ))}
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
          <p className="delivery-form-note">Your profile changes are submitted to your Artist-Wrld account when you save.</p>
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
            <button type="button" className="delivery-secondary-button" onClick={() => setSection('Awaiting Pickup')}>
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
          <p>Manage secure server snapshots alongside your personal settings backup.</p>
        </section>

        <section className="delivery-panel delivery-server-backup">
          <div className="delivery-panel-heading">
            <div>
              <h3>Workspace backup</h3>
              <p>Create a server-side snapshot of the delivery workspace data supported by your account.</p>
            </div>
            <button
              type="button"
              className="delivery-primary-button"
              onClick={() => void createServerBackup()}
              disabled={backupBusy}
            >
              {backupBusy ? 'Please waitâ€¦' : 'Create server backup'}
            </button>
          </div>

          {backupError && <div className="delivery-error" role="alert">{backupError}</div>}

          <div className="delivery-snapshot-list">
            {snapshotsLoading ? (
              <div className="delivery-empty">
                <p>Loading saved backupsâ€¦</p>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="delivery-empty">
                <strong>No server backups yet</strong>
                <p>Create a backup to see it listed here.</p>
              </div>
            ) : (
              snapshots.map((snapshot) => (
                <article className="delivery-snapshot-row" key={snapshot.id}>
                  <div className="delivery-snapshot-details">
                    <strong>Workspace snapshot</strong>
                    <span>
                      Created {new Date(snapshot.createdAt).toLocaleString()}
                    </span>
                    <small>Format: {snapshot.format}</small>
                  </div>
                  <div className="delivery-snapshot-actions">
                    <button
                      type="button"
                      className="delivery-secondary-button"
                      onClick={() => void restoreServerBackup(snapshot)}
                      disabled={backupBusy}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="delivery-secondary-button delivery-danger-button"
                      onClick={() => void deleteServerBackup(snapshot)}
                      disabled={backupBusy}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="delivery-panel delivery-backup-panel">
          <div className="delivery-backup-icon" aria-hidden="true">&#x2195;</div>
          <div className="delivery-backup-copy">
            <h3>Back up your profile settings</h3>
            <p>Download a JSON file containing your profile and selected dashboard theme.</p>
            <button type="button" className="delivery-primary-button" onClick={downloadBackup}>
              Download settings backup &#x2193;
            </button>
          </div>
        </section>

        <section className="delivery-panel delivery-backup-panel">
          <div className="delivery-backup-icon" aria-hidden="true">&#x21A7;</div>
          <div className="delivery-backup-copy">
            <h3>Restore profile settings</h3>
            <p>Restore profile and theme settings from a valid Artist-Wrld delivery JSON backup. This does not restore workspace records.</p>
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
          <p>The local JSON file contains profile and theme settings. Server snapshots use the authorised workspace backup service. Restoring a server snapshot is create-only: existing records are not overwritten. Review the confirmation before restoring or deleting a snapshot.</p>
        </div>

        {notice && <div className="delivery-notice" role="status">{notice}</div>}
        {restoreError && <div className="delivery-error" role="alert">{restoreError}</div>}
      </>
    )
  }
  function renderSection() {
    switch (section) {
      case 'Overview':
        return renderOverview()

      case 'All Deliveries':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">DELIVERY WORKSPACE</span>
              <h2>All Deliveries</h2>
              <p>View and manage every delivery assigned to your account.</p>
            </section>

            <section className="delivery-panel">
              <div className="delivery-panel-heading">
                <div>
                  <h3>All assigned deliveries</h3>
                  <p>Deliveries at every stage, including completed deliveries.</p>
                </div>
                <span className="delivery-count-pill">
                  {deliveries.length} total
                </span>
              </div>
              {renderDeliveryCards(deliveries)}
            </section>
          </>
        )

      case 'Awaiting Pickup':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">DELIVERY WORKSPACE</span>
              <h2>Awaiting Pickup</h2>
              <p>Artwork assigned to you and waiting to be collected.</p>
            </section>

            <section className="delivery-panel">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Ready for collection</h3>
                  <p>Update each delivery after collecting the artwork.</p>
                </div>
                <span className="delivery-count-pill">
                  {deliveries.filter((item) => item.status === 'Assigned').length} awaiting
                </span>
              </div>
              {renderDeliveryCards(
                deliveries.filter((item) => item.status === 'Assigned')
              )}
            </section>
          </>
        )

      case 'In Transit':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">ACTIVE DELIVERIES</span>
              <h2>In Transit</h2>
              <p>Track collected artwork and deliveries currently on the way.</p>
            </section>

            <section className="delivery-panel">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Deliveries in progress</h3>
                  <p>Update the status as each delivery progresses.</p>
                </div>
                <span className="delivery-count-pill">
                  {deliveries.filter(
                    (item) => item.status === 'Picked Up' || item.status === 'In Transit'
                  ).length} in progress
                </span>
              </div>
              {renderDeliveryCards(
                deliveries.filter(
                  (item) => item.status === 'Picked Up' || item.status === 'In Transit'
                )
              )}
            </section>
          </>
        )

      case 'Completed':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">DELIVERY RECORDS</span>
              <h2>Completed</h2>
              <p>Review artwork deliveries that have reached their destination.</p>
            </section>

            <section className="delivery-panel">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Completed deliveries</h3>
                  <p>Successfully delivered artwork appears here.</p>
                </div>
                <span className="delivery-count-pill">
                  {completedDeliveries.length} completed
                </span>
              </div>
              {renderDeliveryCards(completedDeliveries)}
            </section>
          </>
        )
      case 'Messages':
        return (
          <>
            <section className="delivery-page-intro">
              <span className="delivery-eyebrow">COMMUNICATION</span>
              <h2>Messages</h2>
              <p>Send and manage delivery-related messages from your workspace.</p>
            </section>

            <section className="delivery-panel delivery-message-composer">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Compose a message</h3>
                  <p>Enter the recipient's Artist-Wrld account ID.</p>
                </div>
              </div>

              <form className="delivery-form" onSubmit={sendWorkspaceMessage}>
                <div className="delivery-form-grid">
                  <label>
                    Recipient account ID
                    <input
                      value={recipientId}
                      onChange={(event) => setRecipientId(event.target.value)}
                      maxLength={191}
                      placeholder="Enter recipient account ID"
                      required
                    />
                  </label>
                  <label>
                    Subject
                    <input
                      value={messageSubject}
                      onChange={(event) => setMessageSubject(event.target.value)}
                      maxLength={200}
                      placeholder="Message subject"
                      required
                    />
                  </label>
                </div>

                <label className="delivery-message-body-field">
                  Message
                  <textarea
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    maxLength={10000}
                    rows={5}
                    placeholder="Write your delivery-related messageâ€¦"
                    required
                  />
                </label>

                <div className="delivery-form-actions">
                  <button
                    type="submit"
                    className="delivery-primary-button"
                    disabled={messageBusy}
                  >
                    {messageBusy ? 'Sendingâ€¦' : 'Send message'}
                  </button>
                </div>
                <p className="delivery-form-note">
                  Recipient account IDs are required because this workspace does not provide a recipient directory.
                </p>
              </form>
            </section>

            {messageError && <div className="delivery-error" role="alert">{messageError}</div>}
            {notice && <div className="delivery-notice" role="status">{notice}</div>}

            <section className="delivery-panel delivery-message-list">
              <div className="delivery-panel-heading">
                <div>
                  <h3>Your messages</h3>
                  <p>Messages sent and received by your account.</p>
                </div>
                <button
                  type="button"
                  className="delivery-secondary-button"
                  onClick={() => {
                    setMessagesLoaded(false)
                    void loadMessages()
                  }}
                  disabled={messagesLoading}
                >
                  {messagesLoading ? 'Refreshingâ€¦' : 'Refresh'}
                </button>
              </div>

              {messagesLoading && messages.length === 0 ? (
                <div className="delivery-empty">
                  <p>Loading messagesâ€¦</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="delivery-empty">
                  <strong>No messages yet</strong>
                  <p>Messages you send or receive will appear here.</p>
                </div>
              ) : (
                <div className="delivery-message-items">
                  {messages.map((item) => {
                    const incoming = item.recipientId === userId
                    const unread = incoming && !item.readAt

                    return (
                      <article className="delivery-message-card" key={item.id}>
                        <div className="delivery-message-meta">
                          <span className={incoming ? 'delivery-message-badge received' : 'delivery-message-badge sent'}>
                            {incoming ? 'Received' : 'Sent'}
                          </span>
                          {unread && (
                            <span className="delivery-message-unread">Unread</span>
                          )}
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleString()}
                          </time>
                        </div>

                        <h4>{item.subject}</h4>
                        <p className="delivery-message-participants">
                          {incoming
                            ? `From account: ${item.senderId}`
                            : `To account: ${item.recipientId}`}
                        </p>
                        <p className="delivery-message-content">{item.body}</p>

                        {unread && (
                          <div className="delivery-message-actions">
                            <button
                              type="button"
                              className="delivery-secondary-button"
                              onClick={() => void markWorkspaceMessageRead(item.id)}
                            >
                              Mark as read
                            </button>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
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
                  'All Deliveries': '\u25A4',
                  'Awaiting Pickup': '\u25C7',
                  'In Transit': '\u21C4',
                  'Completed': '\u2713',
                  'Messages': '\u2709',
                  'My Profile': '\u25CB',
                  'Settings': '\u2699',
                  'Backup & Restore': '\u21BB',
                }[item]}
              </span>
              <span>{item}</span>
              {item === 'Awaiting Pickup' && deliveries.filter((delivery) => delivery.status === 'Assigned').length > 0 && (
                <small>{deliveries.filter((delivery) => delivery.status === 'Assigned').length}</small>
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

