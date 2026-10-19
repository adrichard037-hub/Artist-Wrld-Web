import { logoutToLogin } from '../lib/logout'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './BuyerDashboard.css'

type Section =
  | 'Overview'
  | 'Explore Art'
  | 'My Orders'
  | 'Wishlist'
  | 'Messages'
  | 'My Profile'
  | 'Settings'
  | 'Backup & Restore'

type Theme = 'Light' | 'Dark' | 'System'

type Artwork = {
  id: number
  title: string
  artist: string
  category: string
  price: number
  image: string
}

type BuyerProfile = {
  fullName: string
  email: string
  location: string
}

type BuyerBackup = {
  app: 'artist-wrld'
  type: 'buyer-backup'
  version: 1
  createdAt: string
  profile: BuyerProfile
  theme: Theme
  wishlist: number[]
}

const navigation: Section[] = [
  'Overview',
  'Explore Art',
  'My Orders',
  'Wishlist',
  'Messages',
  'My Profile',
  'Settings',
  'Backup & Restore',
]

const artworks: Artwork[] = []

const sampleOrders: Array<{ id: string; artwork: string; artist: string; date: string; amount: number; status: string }> = []

const formatMoney = (amount: number) =>
  `GH₵ ${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

const readTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('artist-wrld-buyer-theme')
    if (saved === 'Dark' || saved === 'System') return saved
  } catch {
    // Use the default theme when browser storage is unavailable.
  }
  return 'Light'
}

const readWishlist = (): number[] => {
  try {
    const saved = localStorage.getItem('artist-wrld-buyer-wishlist')
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        return [...new Set(
          parsed.filter(
            (id): id is number =>
              typeof id === 'number' && artworks.some((artwork) => artwork.id === id),
          ),
        )]
      }
    }
  } catch {
    // Ignore invalid stored data and use the default wishlist.
  }
  return []
}

function BuyerDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const sectionFromUrl = (value: string | null): Section =>
    navigation.find(
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
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [wishlist, setWishlist] = useState<number[]>(readWishlist)
  
  const [profile, setProfile] = useState<BuyerProfile>({
    fullName: '',
    email: '',
    location: '',
  })
    
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [profileImageError, setProfileImageError] = useState('')
  const [accountDisplayName, setAccountDisplayName] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [notice, setNotice] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const restoreInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController();

    async function loadAuthenticatedAccountName() {
      try {
        const response = await fetch("http://localhost:4000/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = await response.json();
        const user = payload?.user ?? payload;
        const name =
          typeof user?.fullName === "string" ? user.fullName.trim() : "";

        if (name) setAccountDisplayName(name);
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          setNotice("Unable to refresh the account name.")
        }
      }
    }

    void loadAuthenticatedAccountName();

    return () => controller.abort();
  }, []);


  useEffect(() => {
    const controller = new AbortController()

    async function loadBuyerProfile() {
      try {
        const response = await fetch("http://localhost:4000/api/dashboard/profile", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Unable to load your saved buyer profile.")
        }

        const payload = await response.json()
        const user = payload?.user
        const savedProfile = payload?.profile

        if (user && typeof user.fullName === "string") {
          setProfile((current) => ({
            ...current,
            fullName: user.fullName,
            email: typeof user.email === "string" ? user.email : current.email,
            location: typeof savedProfile?.location === "string"
              ? savedProfile.location
              : "",
          }))
          setAccountDisplayName(user.fullName)
        }

        setProfileImage(
          typeof savedProfile?.profileImage === "string"
            ? savedProfile.profileImage
            : null
        )
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setNotice(error.message || "Unable to load your saved profile.")
        }
      }
    }

    void loadBuyerProfile()
    return () => controller.abort()
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('artist-wrld-buyer-theme', theme)
    } catch {
      // The selected theme remains active for this session.
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('artist-wrld-buyer-wishlist', JSON.stringify(wishlist))
    } catch {
      // The wishlist remains available for this session.
    }
  }, [wishlist])

  const filteredArtworks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return artworks.filter((artwork) => {
      const matchesCategory = category === 'All' || artwork.category === category
      const matchesQuery =
        !normalizedQuery ||
        `${artwork.title} ${artwork.artist} ${artwork.category}`
          .toLowerCase()
          .includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [query, category])

  const wishlistArtworks = artworks.filter((artwork) =>
    wishlist.includes(artwork.id),
  )

  function toggleWishlist(id: number) {
    setWishlist((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
    setNotice(
      wishlist.includes(id)
        ? 'Artwork removed from your wishlist.'
        : 'Artwork added to your wishlist.',
    )
  }

  function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileImageError('Please select a valid image file.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileImageError('The image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileImage(reader.result)
        setProfileImageError('')
      }
    }

    reader.onerror = () => {
      setProfileImageError('The image could not be loaded. Please try again.')
    }

    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function downloadBackup() {
    const backup: BuyerBackup = {
      app: 'artist-wrld',
      type: 'buyer-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      profile,
      theme,
      wishlist,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `artist-wrld-buyer-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setNotice('Your buyer profile, theme, and wishlist backup was downloaded.')
    setRestoreError('')
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setRestoreError('')
    setNotice('')

    try {
      if (file.size > 1024 * 1024) {
        throw new Error('The backup file is too large. Choose a file smaller than 1 MB.')
      }

      const parsed: unknown = JSON.parse(await file.text())

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('app' in parsed) ||
        !('type' in parsed) ||
        !('version' in parsed) ||
        !('profile' in parsed) ||
        !('theme' in parsed) ||
        !('wishlist' in parsed)
      ) {
        throw new Error('This file does not have the required backup format.')
      }

      const backup = parsed as Partial<BuyerBackup>

      if (
        backup.app !== 'artist-wrld' ||
        backup.type !== 'buyer-backup' ||
        backup.version !== 1
      ) {
        throw new Error('This is not a supported Artist-Wrld buyer backup.')
      }

      if (
        typeof backup.profile !== 'object' ||
        backup.profile === null ||
        typeof backup.profile.fullName !== 'string' ||
        typeof backup.profile.email !== 'string' ||
        typeof backup.profile.location !== 'string' ||
        !['Light', 'Dark', 'System'].includes(backup.theme ?? '') ||
        !Array.isArray(backup.wishlist) ||
        !backup.wishlist.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
      ) {
        throw new Error('Some backup settings or profile fields are invalid.')
      }

      if (!window.confirm(
        'Restore the profile, theme, and wishlist from this backup? Your orders and transaction records will not be changed.',
      )) {
        event.target.value = ''
        return
      }

      setProfile({
        fullName: backup.profile.fullName.slice(0, 100),
        email: backup.profile.email.slice(0, 254),
        location: backup.profile.location.slice(0, 120),
      })
      setTheme(backup.theme as Theme)
      setWishlist([...new Set(backup.wishlist as number[])])
      setSection('Overview')
      setNotice('Buyer settings restored. Orders and transaction records were not changed.')
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : 'Unable to restore this backup file.',
      )
    } finally {
      event.target.value = ''
    }
  }

  function renderArtworkCards(items: Artwork[]) {
    if (items.length === 0) {
      return (
        <div className="buyer-empty">
          <span aria-hidden="true">{'\u25C7'}</span>
          <h3>No artworks available yet</h3>
          <p>Artworks will appear here when they are available in the marketplace.</p>
        </div>
      )
    }

    return (
      <div className="buyer-art-grid">
        {items.map((artwork) => (
          <article className="buyer-art-card" key={artwork.id}>
            <div className="buyer-art-image">
              <img src={artwork.image} alt={artwork.title} loading="lazy" />
              <button
                type="button"
                className={`buyer-heart ${wishlist.includes(artwork.id) ? 'is-saved' : ''}`}
                aria-label={
                  wishlist.includes(artwork.id)
                    ? `Remove ${artwork.title} from wishlist`
                    : `Add ${artwork.title} to wishlist`
                }
                aria-pressed={wishlist.includes(artwork.id)}
                onClick={() => toggleWishlist(artwork.id)}
              >
                {wishlist.includes(artwork.id) ? '♥' : '♡'}
              </button>
            </div>
            <div className="buyer-art-info">
              <span className="buyer-art-category">{artwork.category}</span>
              <h3>{artwork.title}</h3>
              <p>by {artwork.artist}</p>
              <div className="buyer-art-bottom">
                <strong>{formatMoney(artwork.price)}</strong>
                <Link to="/artworks" className="buyer-view-link">View art</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  function renderOrders(limit?: number) {
    const orders = limit ? sampleOrders.slice(0, limit) : sampleOrders

    return (
      <div className="buyer-panel">
        <div className="buyer-table-wrap">
          <table className="buyer-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Artwork</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (<tr><td colSpan={5}>You have no recorded orders yet.</td></tr>) : orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.id}</strong></td>
                  <td>
                    <strong>{order.artwork}</strong>
                    <small>{order.artist}</small>
                  </td>
                  <td>{order.date}</td>
                  <td>{formatMoney(order.amount)}</td>
                  <td>
                    <span className={`buyer-status status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  async function saveBuyerProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice("")

    if (profile.fullName.trim().length < 2) {
      setNotice("Please enter your full name.")
      return
    }

    try {
      const response = await fetch("http://localhost:4000/api/dashboard/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          email: profile.email.trim(),
          location: profile.location.trim() || null,
          profileImage: profileImage || null,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || "Could not save your profile.")
      }

      if (result.user) {
        setProfile((current) => ({
          ...current,
          fullName: result.user.fullName ?? current.fullName,
          email: result.user.email ?? current.email,
          location: result.profile?.location ?? current.location,
        }))
        setAccountDisplayName(result.user.fullName ?? profile.fullName)
      }

      if (result.profile?.profileImage !== undefined) {
        setProfileImage(result.profile.profileImage)
      }

      setNotice("Your buyer profile was saved successfully.")
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not save your profile. Check that the backend is running."
      )
    }
  }

  function renderSection() {
    switch (section) {
      case 'Overview':
        return (
          <>
            <section className="buyer-welcome">
              <div>
                <span className="buyer-eyebrow">YOUR ART JOURNEY</span>
                <h2>Welcome back, {profile.fullName.split(' ')[0] || 'Collector'}.</h2>
                <p>Discover meaningful work and keep track of the art you love.</p>
              </div>
              <Link to="/artworks" className="buyer-primary-button">Explore the collection </Link>
            </section>

            <section className="buyer-stat-grid" aria-label="Account summary">
              <article className="buyer-stat-card">
                <span>Total orders</span><strong>{sampleOrders.length}</strong>
                <small>Your recorded order history</small>
              </article>
              <article className="buyer-stat-card">
                <span>In progress</span>
                <strong>{sampleOrders.filter((order) => order.status !== 'Delivered').length}</strong>
                <small>Orders not yet delivered</small>
              </article>
              <article className="buyer-stat-card">
                <span>Wishlist</span><strong>{wishlist.length}</strong>
                <small>Artworks you have saved</small>
              </article>
              <article className="buyer-stat-card">
                <span>Delivered</span>
                <strong>{sampleOrders.filter((order) => order.status === 'Delivered').length}</strong>
                <small>Completed orders</small>
              </article>
            </section>

            <section className="buyer-section-heading">
              <div><span className="buyer-eyebrow">HANDPICKED FOR YOU</span><h2>Discover art</h2></div>
              <button type="button" className="buyer-text-button" onClick={() => setSection('Explore Art')}>View all artworks </button>
            </section>
            {renderArtworkCards(artworks.slice(0, 3))}

            <section className="buyer-section-heading buyer-orders-heading">
              <div><span className="buyer-eyebrow">YOUR PURCHASES</span><h2>Recent orders</h2></div>
              <button type="button" className="buyer-text-button" onClick={() => setSection('My Orders')}>View all orders</button>
            </section>
            {renderOrders(2)}
          </>
        )

      case 'Explore Art':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">THE COLLECTION</span>
              <h2>Find a piece that speaks to you.</h2>
              <p>Explore original works from independent artists.</p>
            </section>
            <div className="buyer-toolbar">
              <input
                aria-label="Search artworks"
                placeholder="Search by artwork, artist, or category..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All</option><option>Painting</option><option>Abstract</option><option>Photography</option><option>Sculpture</option>
              </select>
            </div>
            {renderArtworkCards(filteredArtworks)}
          </>
        )

      case 'My Orders':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">PURCHASE HISTORY</span>
              <h2>My orders</h2>
              <p>Keep track of your purchases and their delivery progress.</p>
            </section>
            {renderOrders()}
            
          </>
        )

      case 'Wishlist':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">YOUR PERSONAL COLLECTION</span>
              <h2>Saved artworks</h2>
              <p>Keep the pieces you love in one place.</p>
            </section>
            {renderArtworkCards(wishlistArtworks)}
          </>
        )

      case 'Messages':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">CONVERSATIONS</span>
              <h2>Messages</h2>
              <p>Stay connected with artists about their work.</p>
            </section>
            <div className="buyer-panel buyer-empty">
              <span aria-hidden="true">✉</span>
              <h3>Your conversations will appear here</h3>
              <p>Messaging will become available when buyer and artist accounts are connected to the backend.</p>
              <Link to="/artists" className="buyer-primary-button">Discover artists</Link>
            </div>
          </>
        )

      case 'My Profile':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">YOUR ACCOUNT</span>
              <h2>My profile</h2>
              <p>Manage the details associated with your buyer account.</p>
            </section>
            <form
              className="buyer-panel buyer-profile-form"
              onSubmit={saveBuyerProfile}

            >
              <div className="buyer-profile-picture-section">
                <span className="buyer-profile-picture-heading">Profile picture</span>
                <div className="buyer-profile-picture-row">
                  <div className="buyer-profile-picture-preview">
                    {profileImage ? (
                      <img src={profileImage} alt="Buyer profile preview" />
                    ) : (
                      <span>{profile.fullName.trim().charAt(0).toUpperCase() || 'B'}</span>
                    )}
                  </div>
                  <div className="buyer-profile-picture-actions">
                    <label className="buyer-profile-picture-upload" htmlFor="buyer-profile-image">
                      Choose picture
                    </label>
                    <input
                      id="buyer-profile-image"
                      className="buyer-profile-picture-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                    />
                    <span className="buyer-profile-picture-hint">Image files only · Maximum 5 MB</span>
                    {profileImageError && (
                      <p className="buyer-profile-picture-error" role="alert">
                        {profileImageError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <label>Full name
                <input required maxLength={100} value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} />
              </label>
              <label>Email address
                <input required type="email" maxLength={254} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
              </label>
              <label>Location
                <input maxLength={120} value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
              </label>
              <button className="buyer-primary-button" type="submit">Save profile</button>
              <p className="buyer-demo-note">Profile edits are currently held in this dashboard session. Persistent account updates require backend integration.</p>
            </form>
          </>
        )

      case 'Settings':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">PREFERENCES</span>
              <h2>Settings</h2>
              <p>Personalise your Artist-Wrld experience.</p>
            </section>
            <div className="buyer-panel buyer-settings-panel">
              <div className="buyer-setting-row">
                <div><h3>Appearance</h3><p>Choose how the dashboard looks on your device.</p></div>
                <select aria-label="Dashboard theme" value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
                  <option>Light</option><option>Dark</option><option>System</option>
                </select>
              </div>
              <div className="buyer-setting-row">
                <div><h3>Wishlist</h3><p>Your saved artworks are stored in this browser for now.</p></div>
                <button type="button" className="buyer-secondary-button" onClick={() => setSection('Wishlist')}>View wishlist</button>
              </div>
              <div className="buyer-setting-row">
                <div><h3>Backup & Restore</h3><p>Save your buyer preferences or restore them from a backup.</p></div>
                <button type="button" className="buyer-secondary-button" onClick={() => setSection('Backup & Restore')}>Manage backup</button>
              </div>
            </div>
          </>
        )

      case 'Backup & Restore':
        return (
          <>
            <section className="buyer-page-intro">
              <span className="buyer-eyebrow">YOUR DATA</span>
              <h2>Backup & Restore</h2>
              <p>Keep a copy of your buyer preferences and restore them when needed.</p>
            </section>
            <div className="buyer-panel buyer-backup-panel">
              <div className="buyer-backup-icon" aria-hidden="true">↕</div>
              <div className="buyer-backup-copy">
                <h3>Back up buyer data</h3>
                <p>Download a JSON file containing your profile details, selected theme, and wishlist.</p>
                <button type="button" className="buyer-primary-button" onClick={downloadBackup}>Download backup </button>
              </div>
            </div>
            <div className="buyer-panel buyer-backup-panel">
              <div className="buyer-backup-icon" aria-hidden="true">↻</div>
              <div className="buyer-backup-copy">
                <h3>Restore buyer preferences</h3>
                <p>Choose a valid Artist-Wrld buyer backup file. Only the profile, theme, and wishlist will be restored.</p>
                <button type="button" className="buyer-secondary-button" onClick={() => restoreInput.current?.click()}>Choose backup file</button>
                <input ref={restoreInput} type="file" accept=".json,application/json" hidden onChange={restoreBackup} />
              </div>
            </div>
            <div className="buyer-safety-note">
              <strong>Data protection</strong>
              <p>Restoring a backup does not create, delete, or overwrite orders, payments, purchases, or transaction records. Those records will be managed separately by the application backend.</p>
            </div>
            {restoreError && <div className="buyer-error" role="alert">{restoreError}</div>}
          </>
        )
    }
  }

  return (
    <main className="buyer-dashboard" data-theme={theme.toLowerCase()}>
      <aside className="buyer-sidebar">
        <Link to="/" className="buyer-brand">artist<span>-wrld</span><b>.</b><small>COLLECTOR SPACE</small></Link>

        <div className="buyer-sidebar-profile">
          <div className="buyer-avatar" aria-hidden="true">
            {profileImage ? (
              <img src={profileImage} alt="" />
            ) : (
              profile.fullName.trim().charAt(0).toUpperCase() || 'B'
            )}
          </div>
          <div className="buyer-sidebar-profile-details"><strong>{accountDisplayName || profile.fullName.trim() || 'Art Collector'}</strong></div>
        </div>

        <span className="buyer-nav-label">YOUR WORKSPACE</span>
        <nav className="buyer-nav" aria-label="Buyer dashboard navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item}
              className={section === item ? 'active' : ''}
              onClick={() => { setSection(item); setNotice(''); setRestoreError('') }}
            >
              <span className="buyer-nav-icon" aria-hidden="true">
                {{
                  'Overview': '\u25A6',
                  'Explore Art': '\u25C7',
                  'My Orders': '\u25A4',
                  'Wishlist': '\u2661',
                  'Messages': '\u2709',
                  'My Profile': '\u25CB',
                  'Settings': '\u2699',
                  'Backup & Restore': '↻',
              }[item]}
              </span>
              <span>{item}</span>
              {item === 'Wishlist' && wishlist.length > 0 && <small>{wishlist.length}</small>}
            </button>
          ))}
        </nav>

        <button type="button" className="dashboard-logout-button" onClick={() => void logoutToLogin()}>Log out</button>
      </aside>

      <div className="buyer-main">
        <header className="buyer-topbar">
          <div><span className="buyer-eyebrow">ARTIST-WRLD / COLLECTOR</span><h1>{section}</h1></div>
          <div className="buyer-topbar-right"><button type="button" className="dashboard-back-button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} aria-label="Go back" title="Go back">{'\u2190'}</button><Link to="/" className="buyer-home-link">Marketplace</Link>
            
          </div>
        </header>

        <div className="buyer-content">
          {notice && <div className="buyer-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
          {renderSection()}
          <footer className="buyer-footer"><span>artist-wrld.</span><span>Discover art. Collect meaning.</span></footer>
        </div>
      </div>
    </main>
  )
}

export default BuyerDashboard






