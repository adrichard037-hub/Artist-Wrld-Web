import { logoutToLogin } from '../lib/logout'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../lib/api'
import './ArtistDashboard.css'

type Artwork = {
  id: string
  title: string
  category: string
  price: number
  status: 'Published' | 'Draft'
  views: number
  sales: number
  description?: string | null
  image?: string | null
}

type ApiArtwork = {
  id: string
  title: string
  category: string
  price: number | string
  status: string
  views?: number
  sales?: number
  description?: string | null
  image?: string | null
}

function mapApiArtwork(item: ApiArtwork): Artwork {
  return {
    id: String(item.id),
    title: item.title,
    category: item.category,
    price: Number(item.price),
    status: item.status === 'Published' ? 'Published' : 'Draft',
    views: Number(item.views ?? 0),
    sales: Number(item.sales ?? 0),
    description: item.description ?? null,
    image: item.image ?? null,
  }
}

type Order = {
  id: string
  artwork: string
  buyer: string
  date: string
  amount: number
  status: 'Processing' | 'Shipped' | 'Delivered'
}

type Section =
  | 'Overview'
  | 'My Artworks'
  | 'Add Artwork'
  | 'Orders'
  | 'Earnings'
  | 'Messages'
  | 'My Profile'
  | 'Settings'

const navigation: Section[] = [
  'Overview',
  'My Artworks',
  'Add Artwork',
  'Orders',
  'Earnings',
  'Messages',
  'My Profile',
  'Settings',
]

const initialOrders: Order[] = []

const formatMoney = (amount: number) =>
  `GH\u20B5 ${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

function ArtistDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const sectionFromUrl = (value: string | null): Section =>
    navigation.find(
      (item) =>
        item.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-') === value
    ) ?? 'Overview'

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('artist-wrld-artist-theme')
    return savedTheme === 'Dark' || savedTheme === 'System' ? savedTheme : 'Light'
  })

  useEffect(() => {
    localStorage.setItem('artist-wrld-artist-theme', theme)
  }, [theme])
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
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [orders] = useState<Order[]>(initialOrders)
  const [artworkQuery, setArtworkQuery] = useState('')
  const [artworkFilter, setArtworkFilter] = useState('All')
  const [notice, setNotice] = useState('')
  const [artistName, setArtistName] = useState('')
  const [accountDisplayName, setAccountDisplayName] = useState('')
  const [artistBio, setArtistBio] = useState('')
  const [artistLocation, setArtistLocation] = useState('')
  const [email, setEmail] = useState('')
  const [profileImage, setProfileImage] = useState<string>('')
  const [artworkForm, setArtworkForm] = useState({
    title: '',
    category: 'Painting',
    price: '',
    description: '',
  })
  const [artworkImage, setArtworkImage] = useState('')
  const [artworkImageError, setArtworkImageError] = useState('')

  useEffect(() => {
    const controller = new AbortController();
    const requestOptions = {
      credentials: "include" as RequestCredentials,
      headers: { Accept: "application/json" },
      signal: controller.signal,
    };

    async function loadProfile() {
      const response = await fetch(
        `${API_URL}/dashboard/profile`,
        requestOptions,
      );

      if (!response.ok) return;

      const payload = await response.json();
      const user = payload?.user;
      const profile = payload?.profile;

      if (typeof user?.fullName === "string") {
        setArtistName(user.fullName);
      } else if (typeof user?.username === "string") {
        setArtistName(user.username);
      }

      setAccountDisplayName(
        typeof user?.username === "string" ? user.username : ""
      );

      if (typeof user?.email === "string") setEmail(user.email);
      if (typeof profile?.bio === "string") setArtistBio(profile.bio);
      if (typeof profile?.location === "string") {
        setArtistLocation(profile.location);
      }
      if (typeof profile?.profileImage === "string") {
        setProfileImage(profile.profileImage);
      }
    }

    async function loadArtworks() {
      const response = await fetch(`${API_URL}/artworks`, requestOptions);

      if (!response.ok) {
        setArtworks([]);
        setNotice(
          `Artwork data could not be loaded (HTTP ${response.status}). Check your sign-in session and backend.`,
        );
        return;
      }

      const payload = await response.json();

      if (Array.isArray(payload?.artworks)) {
        setArtworks(payload.artworks.map(mapApiArtwork));
      } else {
        setArtworks([]);
        setNotice("The backend returned an unexpected artwork response.");
      }
    }

    async function loadPreferences() {
      const response = await fetch(
        `${API_URL}/dashboard/preferences`,
        requestOptions,
      );

      if (!response.ok) return;

      const payload = await response.json();
      const preferences = payload?.preferences;

      if (Array.isArray(preferences)) {
        const savedTheme = preferences.find(
          (item: { key?: string }) => item.key === "artist-theme",
        )?.value;

        if (["Light", "Dark", "System"].includes(savedTheme)) {
          setTheme(savedTheme);
        }
      }
    }

    void Promise.allSettled([
      loadProfile(),
      loadArtworks(),
      loadPreferences(),
    ]).then((results) => {
      if (controller.signal.aborted) return;

      if (results.some((result) => result.status === "rejected")) {
        setNotice(
          "Some dashboard data could not be loaded. Check that you are signed in and the backend is running.",
        );
      }
    });

    return () => controller.abort();
  }, []);


  function handleArtworkImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setArtworkImageError('Please choose a valid image file.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setArtworkImageError('The image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setArtworkImage(reader.result)
        setArtworkImageError('')
      }
    }

    reader.onerror = () => {
      setArtworkImageError('The image could not be read. Please try another file.')
    }

    reader.readAsDataURL(file)
  }

  function downloadArtistBackup() {
    const backup = {
      format: 'ARTIST_WRLD_ARTIST_BACKUP_V1',
      createdAt: new Date().toISOString(),
      scope: 'Current artist account only',
      profile: {
        artistName,
        email,
        artistBio,
        artistLocation,
      },
      artworks: artworks.map((artwork) => ({ ...artwork })),
      orders: orders.map((order) => ({ ...order })),
      settings: {
        theme,
        profileImage,
      },
      restorePolicy: {
        existingData: 'Never overwrite',
        existingSettings: 'Never overwrite',
        transactionalRecords: 'Never modify',
      },
    }

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: 'application/json' },
    )

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `artist-wrld-backup-${Date.now()}.json`

    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    window.setTimeout(() => URL.revokeObjectURL(url), 1000)

    setNotice('Artist backup downloaded. Your current data remains unchanged.')
  }

  function handleRestoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setNotice('Restore failed: the backup file must be 10 MB or smaller.')
      input.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result))

        const isValidBackup =
          backup?.format === 'ARTIST_WRLD_ARTIST_BACKUP_V1' &&
          backup?.scope === 'Current artist account only' &&
          backup?.profile !== null &&
          typeof backup?.profile === 'object' &&
          !Array.isArray(backup.profile) &&
          Array.isArray(backup?.artworks) &&
          backup?.artworks.every(
            (artwork: unknown) =>
              artwork !== null &&
              typeof artwork === 'object' &&
              !Array.isArray(artwork) &&
              (typeof (artwork as Artwork).id === 'string' ||
                typeof (artwork as unknown as { id: unknown }).id === 'number') &&
              typeof (artwork as Artwork).title === 'string' &&
              typeof (artwork as Artwork).category === 'string' &&
              typeof (artwork as Artwork).price === 'number' &&
              ((artwork as Artwork).status === 'Published' ||
                (artwork as Artwork).status === 'Draft') &&
              typeof (artwork as Artwork).views === 'number' &&
              typeof (artwork as Artwork).sales === 'number',
          ) &&
          Array.isArray(backup?.orders) &&
          backup?.settings !== null &&
          typeof backup?.settings === 'object' &&
          !Array.isArray(backup.settings) &&
          typeof backup.profile.artistName === 'string' &&
          typeof backup.profile.email === 'string' &&
          typeof backup.profile.artistBio === 'string' &&
          typeof backup.profile.artistLocation === 'string' &&
          (backup.settings.theme === undefined ||
            ['Light', 'Dark', 'System'].includes(backup.settings.theme)) &&
          (backup.settings.profileImage === undefined ||
            typeof backup.settings.profileImage === 'string')

        if (!isValidBackup) {
          setNotice('Restore failed: invalid Artist-Wrld backup file.')
          return
        }

        const confirmed = window.confirm(
          'Restore the artist profile and supported settings from this backup? Existing artwork will not be replaced, and orders and transactions will remain unchanged.',
        )

        if (!confirmed) {
          setNotice('Restore cancelled. Your current data remains unchanged.')
          return
        }

        setArtistName(backup.profile.artistName)
        setEmail(backup.profile.email)
        setArtistBio(backup.profile.artistBio)
        setArtistLocation(backup.profile.artistLocation)

        if (backup.settings.theme !== undefined) {
          setTheme(backup.settings.theme)
        }

        if (backup.settings.profileImage !== undefined) {
          setProfileImage(backup.settings.profileImage)
        }

        setNotice(
          'Artist profile and supported settings restored. Existing artwork, orders and transactions were not changed.',
        )
      } catch {
        setNotice('Restore failed: the selected file is invalid or corrupted.')
      } finally {
        input.value = ''
      }
    }

    reader.onerror = () => {
      setNotice('Restore failed: the backup file could not be read.')
      input.value = ''
    }

    reader.readAsText(file)
  }
  const filteredArtworks = useMemo(() => {
    const query = artworkQuery.trim().toLowerCase()

    return artworks.filter((artwork) => {
      const matchesQuery =
        artwork.title.toLowerCase().includes(query) ||
        artwork.category.toLowerCase().includes(query)

      const matchesFilter =
        artworkFilter === 'All' || artwork.status === artworkFilter

      return matchesQuery && matchesFilter
    })
  }, [artworks, artworkQuery, artworkFilter])

  const publishedCount = artworks.filter((artwork) => artwork.status === 'Published').length
  const totalViews = artworks.reduce((sum, artwork) => sum + artwork.views, 0)
  const totalSales = artworks.reduce((sum, artwork) => sum + artwork.sales, 0)
  const pendingOrders = orders.filter((order) => order.status === 'Processing').length
  const completedRevenue = orders
    .filter((order) => order.status === 'Delivered')
    .reduce((sum, order) => sum + order.amount, 0)

  async function addArtwork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const price = Number(artworkForm.price)

    if (!artworkForm.title.trim() || !Number.isFinite(price) || price <= 0) {
      setNotice('Enter an artwork title and a valid price greater than zero.')
      return
    }

    if (artworkImageError) {
      setNotice('Please resolve the artwork image error before saving.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/artworks`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: artworkForm.title.trim(),
          category: artworkForm.category,
          price,
          description: artworkForm.description.trim() || null,
          image: artworkImage || null,
          status: "Draft",
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setNotice(payload?.message || "Unable to save artwork.")
        return
      }

      if (!payload?.artwork) {
        setNotice("The server saved the request but returned no artwork record.")
        return
      }

      const artwork = mapApiArtwork(payload.artwork)
      setArtworks((current) => [
        artwork,
        ...current.filter((item) => item.id !== artwork.id),
      ])
      setArtworkForm({
        title: "",
        category: "Painting",
        price: "",
        description: "",
      })
      setArtworkImage("")
      setArtworkImageError("")

      const input = document.getElementById(
        "artist-artwork-image-input",
      ) as HTMLInputElement | null

      if (input) input.value = ""

      setNotice("Artwork saved to your account as a draft.")
      setSection("My Artworks")
    } catch {
      setNotice("Unable to reach the backend. Check that the server is running.")
    }
  }

  async function toggleArtworkStatus(id: string) {
    const currentArtwork = artworks.find((item) => item.id === id)
    if (!currentArtwork) return

    const nextStatus =
      currentArtwork.status === "Published" ? "Draft" : "Published"

    try {
      const response = await fetch(
        `${API_URL}/artworks/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      )

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.artwork) {
        setNotice(payload?.message || "Unable to update artwork status.")
        return
      }

      const updated = mapApiArtwork(payload.artwork)

      setArtworks((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      )
      setNotice(`Artwork status saved as ${updated.status}.`)
    } catch {
      setNotice("Unable to reach the backend to update artwork status.")
    }
  }

  async function removeArtwork(id: string) {
    const artwork = artworks.find((item) => item.id === id)
    if (!artwork) return

    if (!window.confirm(`Remove "${artwork.title}" from your artwork catalogue?`)) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/artworks/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      )

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setNotice(payload?.message || "Unable to remove artwork.")
        return
      }

      setArtworks((current) => current.filter((item) => item.id !== id))
      setNotice("Artwork removed from your account.")
    } catch {
      setNotice("Unable to reach the backend to remove artwork.")
    }
  }

  function renderOverview() {
    return (
      <>
        <div className="artist-welcome">
          <div>
            <span className="artist-eyebrow">YOUR CREATIVE SPACE</span>
            <h2>Welcome back, {artistName.split(' ')[0]}.</h2>
            <p>Your work deserves to be seen. Here is how your studio is doing.</p>
          </div>
          <button className="artist-primary-button" onClick={() => { setSection('Add Artwork'); setNotice('') }}>
            + Add artwork
          </button>
        </div>

        <div className="artist-stat-grid">
          <article className="artist-stat-card">
            <span>Published artworks</span>
            <strong>{publishedCount}</strong>
            <small>Available in your studio</small>
          </article>
          <article className="artist-stat-card">
            <span>Total artwork views</span>
            <strong>{totalViews.toLocaleString()}</strong>
            <small>Across your current listings</small>
          </article>
          <article className="artist-stat-card">
            <span>Items sold</span>
            <strong>{totalSales}</strong>
            <small>Based on recorded artwork sales</small>
          </article>
          <article className="artist-stat-card">
            <span>Delivered order value</span>
            <strong>{formatMoney(completedRevenue)}</strong>
            <small>Calculated from recorded orders</small>
          </article>
        </div>

        <div className="artist-overview-grid">
          <section className="artist-panel">
            <div className="artist-panel-heading">
              <div><h3>Your artworks</h3><p>A quick look at your studio listings.</p></div>
              <button className="artist-text-button" onClick={() => setSection('My Artworks')}>View all</button>
            </div>
            {artworks.slice(0, 3).map((artwork) => (
              <div className="artist-artwork-row" key={artwork.id}>
                <div className="artist-artwork-placeholder">
                  <span>{artwork.category.slice(0, 1)}</span>
                  {artwork.image && (
                    <img
                      src={artwork.image}
                      alt={artwork.title}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </div>
                <div className="artist-row-main">
                  <strong>{artwork.title}</strong>
                  <span>{artwork.category}</span>
                </div>
                <div className="artist-row-end">
                  <strong>{formatMoney(artwork.price)}</strong>
                  <span className={`artist-status ${artwork.status === 'Published' ? 'is-live' : 'is-draft'}`}>{artwork.status}</span>
                </div>
              </div>
            ))}
            {artworks.length === 0 && <div className="artist-empty">Your studio is waiting for its first artwork.</div>}
          </section>

          <section className="artist-panel">
            <div className="artist-panel-heading">
              <div><h3>Recent orders</h3><p>Keep track of buyer purchases.</p></div>
              <button className="artist-text-button" onClick={() => setSection('Orders')}>View orders</button>
            </div>
            {orders.slice(0, 3).map((order) => (
              <div className="artist-order-row" key={order.id}>
                <div className="artist-order-icon">{'\u2192'}</div>
                <div className="artist-row-main">
                  <strong>{order.artwork}</strong>
                  <span>{order.id} {'\u00B7'} {order.buyer}</span>
                </div>
                <div className="artist-row-end">
                  <strong>{formatMoney(order.amount)}</strong>
                  <span className={`artist-status ${order.status === 'Delivered' ? 'is-live' : 'is-draft'}`}>{order.status}</span>
                </div>
              </div>
            ))}
          </section>
        </div>

        <section className="artist-tip">
          <span className="artist-tip-mark">{'\u2713'}</span>
          <div><strong>Give your artwork room to shine</strong><p>Add clear descriptions, accurate prices and complete details to help collectors understand your work.</p></div>
          <button className="artist-secondary-button" onClick={() => setSection('My Artworks')}>Manage listings</button>
        </section>
      </>
    )
  }

  function renderArtworks() {
    return (
      <section className="artist-panel">
        <div className="artist-panel-heading">
          <div><h3>My artworks</h3><p>Manage the pieces in your creative catalogue.</p></div>
          <button className="artist-primary-button" onClick={() => { setSection('Add Artwork'); setNotice('') }}>+ Add artwork</button>
        </div>
        <div className="artist-toolbar">
          <input aria-label="Search artworks" placeholder="Search artwork or category" value={artworkQuery} onChange={(event) => setArtworkQuery(event.target.value)} />
          <select aria-label="Filter by status" value={artworkFilter} onChange={(event) => setArtworkFilter(event.target.value)}>
            <option>All</option><option>Published</option><option>Draft</option>
          </select>
        </div>
        {filteredArtworks.length === 0 ? (
          <div className="artist-empty"><strong>No artworks found</strong><p>Try another search or add a new piece to your studio.</p></div>
        ) : (
          <div className="artist-table-wrap">
            <table className="artist-table">
              <thead><tr><th>Artwork</th><th>Category</th><th>Price</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{filteredArtworks.length === 0 ? <tr><td colSpan={6}>No artworks to display yet. Add your first artwork to get started.</td></tr> : filteredArtworks.map((artwork) => (
                  <tr key={artwork.id}>
                    <td><strong>{artwork.title}</strong><small>ID: AW-{String(artwork.id).padStart(4, '0')}</small></td>
                    <td>{artwork.category}</td>
                    <td>{formatMoney(artwork.price)}</td>
                    <td>{artwork.views}</td>
                    <td><span className={`artist-status ${artwork.status === 'Published' ? 'is-live' : 'is-draft'}`}>{artwork.status}</span></td>
                    <td><div className="artist-actions">
                      <button onClick={() => toggleArtworkStatus(artwork.id)}>{artwork.status === 'Published' ? 'Unpublish' : 'Publish'}</button>
                      <button className="is-danger" onClick={() => removeArtwork(artwork.id)}>Remove</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderAddArtwork() {
    return (
      <section className="artist-panel artist-form-panel">
        <div className="artist-panel-heading"><div><h3>Add a new artwork</h3><p>Start with the details collectors need to know.</p></div></div>
        <form className="artist-form" onSubmit={addArtwork}>
          <label>Artwork title<input required maxLength={100} value={artworkForm.title} onChange={(event) => setArtworkForm({ ...artworkForm, title: event.target.value })} placeholder="e.g. Colours of Home" /></label>
          <div className="artist-form-grid">
            <label>Category<select value={artworkForm.category} onChange={(event) => setArtworkForm({ ...artworkForm, category: event.target.value })}><option>Painting</option><option>Photography</option><option>Abstract</option><option>Sculpture</option>
<option value="More">More</option></select></label>
            <label>Price (GH{'\u20B5'})<input required type="number" min="0.01" step="0.01" value={artworkForm.price} onChange={(event) => setArtworkForm({ ...artworkForm, price: event.target.value })} placeholder="0.00" /></label>
          </div>
          <label>Description<textarea rows={5} maxLength={1500} value={artworkForm.description} onChange={(event) => setArtworkForm({ ...artworkForm, description: event.target.value })} placeholder="Describe the inspiration, materials and story behind your artwork." /></label>
          <div className="artist-upload-note artist-artwork-image-upload">
            <div className="artist-artwork-image-heading">
              <strong>Artwork image</strong>
              <p>Upload a clear image of your artwork. JPG, PNG, WebP and other browser-supported image formats are accepted. Maximum size: 5 MB.</p>
            </div>

            {artworkImage ? (
              <div className="artist-artwork-image-preview">
                <img src={artworkImage} alt="Preview of your artwork" />
                <button
                  type="button"
                  className="artist-secondary-button"
                  onClick={() => {
                    setArtworkImage('')
                    setArtworkImageError('')
                    const input = document.getElementById('artist-artwork-image-input') as HTMLInputElement | null
                    if (input) input.value = ''
                  }}
                >
                  Remove image
                </button>
              </div>
            ) : (
              <label htmlFor="artist-artwork-image-input" className="artist-artwork-image-picker">
                <span className="artist-artwork-image-icon" aria-hidden="true">{'\u21E7'}</span>
                <strong>Choose artwork image</strong>
                <span>Click to browse your computer</span>
              </label>
            )}

            <input
              id="artist-artwork-image-input"
              className="artist-artwork-image-input"
              type="file"
              accept="image/*"
              onChange={handleArtworkImageUpload}
            />

            {artworkImageError && (
              <p className="artist-artwork-image-error" role="alert">{artworkImageError}</p>
            )}
          </div>
          <div className="artist-form-actions"><button type="button" className="artist-secondary-button" onClick={() => setSection('My Artworks')}>Cancel</button><button type="submit" className="artist-primary-button">Save as draft</button></div>
        </form>
      </section>
    )
  }

  function renderOrders() {
    return (
      <section className="artist-panel">
        <div className="artist-panel-heading"><div><h3>Orders</h3><p>Purchases associated with your artworks.</p></div><span className="artist-count-pill">{pendingOrders} processing</span></div>
        <div className="artist-table-wrap"><table className="artist-table">
          <thead><tr><th>Order</th><th>Artwork</th><th>Buyer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{orders.length === 0 ? <tr><td colSpan={6}>No orders have been recorded yet.</td></tr> : orders.map((order) => <tr key={order.id}><td><strong>{order.id}</strong></td><td>{order.artwork}</td><td>{order.buyer}</td><td>{order.date}</td><td>{formatMoney(order.amount)}</td><td><span className={`artist-status ${order.status === 'Delivered' ? 'is-live' : 'is-draft'}`}>{order.status}</span></td></tr>)}</tbody>
        </table></div>
      </section>
    )
  }

  function renderEarnings() {
    return (
      <>
        <div className="artist-stat-grid artist-earnings-stats">
          <article className="artist-stat-card"><span>Delivered order value</span><strong>{formatMoney(completedRevenue)}</strong><small>Value of delivered orders</small></article>
          <article className="artist-stat-card"><span>All listed order value</span><strong>{formatMoney(orders.reduce((sum, order) => sum + order.amount, 0))}</strong><small>Includes processing and shipped orders</small></article>
          <article className="artist-stat-card"><span>Delivered orders</span><strong>{orders.filter((order) => order.status === 'Delivered').length}</strong><small>Based on recorded orders</small></article>
        </div>
        <section className="artist-panel"><div className="artist-panel-heading"><div><h3>Earnings summary</h3><p>Illustrative order figures, not confirmed payouts.</p></div></div><div className="artist-notice-box">Your live earnings, commission deductions and payment history will appear here once the order and payment backend is connected.</div></section>
      </>
    )
  }

  function renderMessages() {
    return (
      <section className="artist-panel">
        <div className="artist-panel-heading"><div><h3>Messages</h3><p>Keep conversations with interested collectors organised.</p></div></div>
        <div className="artist-empty"><strong>Your inbox is ready</strong><p>Buyer inquiries will appear here when messaging is connected.</p></div>
      </section>
    )
  }

  function handleProfileImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setNotice('Please choose a valid image file.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice('Please choose an image smaller than 5 MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileImage(reader.result)
        setNotice('Profile image updated. Save your profile to finish.')
      }
    }

    reader.onerror = () => {
      setNotice('The image could not be read. Please try another file.')
    }

    reader.readAsDataURL(file)
  }
  async function saveArtistProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      fullName: artistName.trim(),
      email: email.trim(),
      bio: artistBio,
      location: artistLocation,
      profileImage: profileImage || null,
    };

    if (payload.fullName.length < 2) {
      setNotice("Enter an artist name with at least two characters.");
      return;
    }

    try {
      const response = await fetch(`${api}/dashboard/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Could not save your profile.");
      }

      if (result.user?.fullName) setArtistName(result.user.fullName);
      if (result.user?.email) setEmail(result.user.email);

      if (result.profile?.bio !== undefined) {
        setArtistBio(result.profile.bio ?? "");
      }

      if (result.profile?.location !== undefined) {
        setArtistLocation(result.profile.location ?? "");
      }

      if (result.profile?.profileImage !== undefined) {
        setProfileImage(result.profile.profileImage ?? "");
      }

      setNotice("Your artist profile was saved successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not save your profile. Check that the backend is running."
      );
    }
  }

  async function updateArtistTheme(value: string) {
    if (value !== "Light" && value !== "Dark" && value !== "System") {
      setNotice("Choose a valid dashboard theme.");
      return;
    }

    setTheme(value);

    try {
      const response = await fetch(`${api}/dashboard/preferences`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "artist-theme", value }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Could not save the theme preference.");
      }

      setNotice("Dashboard theme preference saved.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Theme changed locally, but could not be saved to the server: ${error.message}`
          : "Theme changed locally, but could not be saved to the server."
      );
    }
  }

  function renderProfile() {
    return (
      <section className="artist-panel artist-form-panel">
        <div className="artist-panel-heading"><div><h3>Artist profile</h3><p>These details represent you to collectors.</p></div></div>
        <div className="artist-profile-image-upload">
          <div className="artist-profile-image-preview">
            {profileImage ? (
              <img src={profileImage} alt="Artist profile preview" />
            ) : (
              <span>{artistName.trim().charAt(0).toUpperCase() || 'A'}</span>
            )}
          </div>
          <div className="artist-profile-image-details">
            <strong>Profile picture</strong>
            <p>Choose a clear image to help collectors recognise you. JPG, PNG, GIF or WebP, up to 5 MB.</p>
            <label className="artist-secondary-button artist-image-choose">
              Choose image
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageUpload}
              />
            </label>
          </div>
        </div>        <form className="artist-form" onSubmit={saveArtistProfile}>
          <label>Artist name<input required value={artistName} onChange={(event) => setArtistName(event.target.value)} /></label>
          <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Location<input value={artistLocation} onChange={(event) => setArtistLocation(event.target.value)} /></label>
          <label>Artist biography<textarea rows={5} maxLength={1000} value={artistBio} onChange={(event) => setArtistBio(event.target.value)} /></label>
          <div className="artist-form-actions"><button type="submit" className="artist-primary-button">Save profile</button></div>
        </form>
      </section>
    )
  }

  function renderSettings() {
    return (
      <>
        <section className="artist-panel">
          <div className="artist-panel-heading">
            <div>
              <h3>Settings</h3>
              <p>Manage preferences for your artist workspace.</p>
            </div>
          </div>

          <div className="artist-settings-row">
            <div>
              <strong>Interface theme</strong>
              <p>Choose a comfortable appearance for your artist workspace.</p>
            </div>
            <select
              aria-label="Artist dashboard interface theme"
              value={theme}
              onChange={(event) => { void updateArtistTheme(event.target.value) }}
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
              <option value="System">System</option>
            </select>
          </div>

          <div className="artist-settings-row">
            <div>
              <strong>Order updates</strong>
              <p>Receive notifications when an order changes status.</p>
            </div>
            <span className="artist-status is-draft">Backend required</span>
          </div>

          <div className="artist-settings-row">
            <div>
              <strong>Account security</strong>
              <p>Password changes and sign-in security must be managed by the authentication service.</p>
            </div>
            <span className="artist-status is-draft">Not connected</span>
          </div>

          <div className="artist-settings-row">
            <div>
              <strong>Marketplace visibility</strong>
              <p>Marketplace publishing will be available when your account is connected to the backend.</p>
            </div>
            <span className="artist-status">Not connected</span>
          </div>
        </section>

        <section className="artist-panel">
          <div className="artist-panel-heading">
            <div>
              <h3>Backup &amp; Restore</h3>
              <p>Protect your artist workspace without overwriting existing information.</p>
            </div>
          </div>

          <div className="artist-settings-row">
            <div>
              <strong>Backup your data</strong>
              <p>Download a JSON snapshot of your artist profile, artwork, orders and settings.</p>
            </div>
            <button
              type="button"
              className="artist-primary-button"
              onClick={downloadArtistBackup}
            >
              Backup
            </button>
          </div>

          <div className="artist-settings-row">
            <div>
              <strong>Restore from backup</strong>
              <p>Validate a previous backup without replacing your current data or settings.</p>
            </div>
            <div>
              <input
                id="artist-backup-file"
                type="file"
                accept=".json,application/json"
                hidden
                onChange={handleRestoreBackup}
              />
              <button
                type="button"
                className="artist-secondary-button"
                onClick={() => document.getElementById('artist-backup-file')?.click()}
              >
                Restore
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  function renderSection() {
    switch (section) {
      case 'Overview': return renderOverview()
      case 'My Artworks': return renderArtworks()
      case 'Add Artwork': return renderAddArtwork()
      case 'Orders': return renderOrders()
      case 'Earnings': return renderEarnings()
      case 'Messages': return renderMessages()
      case 'My Profile': return renderProfile()
      case 'Settings': return renderSettings()
    }
  }

  return (
    <main className="artist-dashboard" data-theme={theme.toLowerCase()}>
      <aside className="artist-sidebar">
        <Link to="/" className="artist-brand">artist<span>-wrld</span><b>.</b><small>ARTIST STUDIO</small></Link>
        <div className="artist-sidebar-profile artist-sidebar-profile-static">
  <span className="artist-avatar">
    {profileImage ? (
      <img src={profileImage} alt="" />
    ) : (
      artistName.trim().charAt(0).toUpperCase() || 'A'
    )}
  </span>
  <span className="artist-sidebar-profile-details">
    <strong>{accountDisplayName || "Username unavailable"}</strong>
  </span>
</div>
<span className="artist-nav-label">WORKSPACE</span>
        <nav className="artist-nav" aria-label="Artist dashboard navigation">
          {navigation.map((item, index) => (
            <button key={item} className={section === item ? 'active' : ''} onClick={() => { setSection(item); setNotice('') }}>
              <span className="artist-nav-icon" aria-hidden="true">
  {[
    <svg key="overview" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
    <svg key="artworks" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
    <svg key="add" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg>,
    <svg key="orders" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h12l3 5-9 5-9-5 3-5Z" /><path d="M3 8v11l9 4 9-4V8M12 13v10" /></svg>,
    <svg key="earnings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9h.01M17 15h.01" /></svg>,
    <svg key="messages" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 21l2.1-5.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>,
    <svg key="profile" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
    <svg key="settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-2 .9l-.4 1.8h-2.8l-.4-1.8a8 8 0 0 1-2-.9l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2.2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 2-.9l.4-1.8h2.8l.4 1.8a8 8 0 0 1 2 .9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2.1Z" /></svg>
  ][index]}
</span>
              <span>{item}</span>
              {item === 'Orders' && pendingOrders > 0 && <small>{pendingOrders}</small>}
            </button>
          ))}
        </nav>
        <button type="button" className="dashboard-logout-button" onClick={() => void logoutToLogin()}>Log out</button>
      </aside>

      <div className="artist-main">
        <header className="artist-topbar">
          <div><span className="artist-eyebrow">ARTIST-WRLD / STUDIO</span><h1>{section}</h1></div>
          <div className="artist-topbar-right"><button type="button" className="dashboard-back-button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} aria-label="Go back" title="Go back">&#8592;</button><Link to="/" className="artist-home-link">Marketplace</Link></div>
        </header>

        <div className="artist-content">
          {notice && <div className="artist-notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}>{'\u00D7'}</button></div>}
          {renderSection()}
          <footer className="artist-footer"><span>artist-wrld.</span></footer>
        </div>
      </div>
    </main>
  )
}

export default ArtistDashboard














