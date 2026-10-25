import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate, useLocation, useNavigationType, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ArtistDashboard from './pages/ArtistDashboard'
import BuyerDashboard from './pages/BuyerDashboard'
import DeliveryDashboard from './pages/DeliveryDashboard'
import Register from './pages/Register'
import AuthenticatorSetup from './pages/AuthenticatorSetup'
import VerifyTwoFactor from './pages/VerifyTwoFactor'
import ArtworkDetails from './pages/ArtworkDetails'
import ArtworkGallery from './pages/ArtworkGallery'
import ArtistProfile from './pages/ArtistProfile'
import Artists from './pages/Artists'
import About from './pages/About'
import ScrollToTop from './components/ScrollToTop'
import { API_URL } from './lib/api'
import './App.css'

type HomepageRole = 'ADMIN' | 'ARTIST' | 'BUYER'

type HomepageUser = {
  fullName?: string
  username?: string
  profileImage?: string | null
  role: HomepageRole
}

const homepageDashboardPaths: Record<HomepageRole, string> = {
  ADMIN: '/admin',
  ARTIST: '/artist-dashboard',
  BUYER: '/buyer-dashboard',
}

let cachedHomepageUser: HomepageUser | null = null

type HomepageArtist = {
  id: string
  slug: string
  name: string
  bio: string
  location: string
  image: string | null
  specialty: string
  artworkCount: number
}
type Artwork = {
  id: string
  title: string
  artist: string
  category: string
  price: number
  image: string | null
}

function HomePage() {
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [artworksLoading, setArtworksLoading] = useState(true)
  const [artworksError, setArtworksError] = useState('')
  const [featuredArtists, setFeaturedArtists] = useState<HomepageArtist[]>([])
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [artistsError, setArtistsError] = useState('')
  const [homepageUser, setHomepageUser] = useState<HomepageUser | null>(cachedHomepageUser)

  const artworkCarouselRef = useRef<HTMLDivElement | null>(null)
  const artistCarouselRef = useRef<HTMLDivElement | null>(null)
  const artworkPausedRef = useRef(false)
  const artistPausedRef = useRef(false)
  const artworkDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null)
  const artistDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null)
  const suppressArtworkClickRef = useRef(false)
  const suppressArtistClickRef = useRef(false)


  const categories = ['All', 'Paintings', 'Photography', 'Abstract', 'Sculpture', 'More']

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      const container = artworkCarouselRef.current

      if (!container || artworkPausedRef.current) return

      const firstCard = container.firstElementChild as HTMLElement | null
      if (!firstCard) return

      const gap = parseFloat(getComputedStyle(container).columnGap) || 0
      const step = firstCard.getBoundingClientRect().width + gap
      const maxScroll = container.scrollWidth - container.clientWidth

      if (maxScroll <= 2) return

      if (container.scrollLeft >= maxScroll - 5) {
        container.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' })
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [activeCategory, artworks.length])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      const container = artistCarouselRef.current

      if (!container || artistPausedRef.current) return

      const firstCard = container.firstElementChild as HTMLElement | null
      if (!firstCard) return

      const gap = parseFloat(getComputedStyle(container).columnGap) || 0
      const step = firstCard.getBoundingClientRect().width + gap
      const maxScroll = container.scrollWidth - container.clientWidth

      if (maxScroll <= 2) return

      if (container.scrollLeft >= maxScroll - 5) {
        container.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' })
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [featuredArtists.length])

  useEffect(() => {
    let cancelled = false

    async function loadArtworks() {
      try {
        const response = await fetch(`${API_URL}/artworks/public`)

        if (!response.ok) {
          throw new Error('Unable to load published artwork.')
        }

        const data: { artworks?: Artwork[] } = await response.json()

        if (!Array.isArray(data.artworks)) {
          throw new Error('The server returned an unexpected artwork response.')
        }

        if (!cancelled) {
          setArtworks(data.artworks)
          setArtworksError('')
        }
      } catch {
        if (!cancelled) {
          setArtworksError('Unable to load artwork. Please check that the server is running and try again.')
        }
      } finally {
        if (!cancelled) {
          setArtworksLoading(false)
        }
      }
    }

    void loadArtworks()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadFeaturedArtists() {
      try {
        const response = await fetch(`${API_URL}/artists/public`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to retrieve artists.')
        }

        const result: { artists?: HomepageArtist[] } = await response.json()

        setFeaturedArtists(
          Array.isArray(result.artists) ? result.artists : [],
        )
        setArtistsError('')
      } catch {
        if (!controller.signal.aborted) {
          setArtistsError('Unable to load artists right now. Please try again later.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setArtistsLoading(false)
        }
      }
    }

    void loadFeaturedArtists()

    return () => {
      controller.abort()
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()

    async function loadHomepageSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 401) {
            cachedHomepageUser = null
            setHomepageUser(null)
          }

          // Keep the current account during temporary errors such as 429.
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

        const user = result.user

        if (
          result.authenticated === true &&
          user?.role &&
          ['ADMIN', 'ARTIST', 'BUYER'].includes(user.role)
        ) {
          let savedProfileImage: string | null = null

          try {
            const profileResponse = await fetch(`${API_URL}/dashboard/profile`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                Accept: 'application/json',
              },
              signal: controller.signal,
            })

            if (profileResponse.ok) {
              const profileResult: {
                profile?: {
                  profileImage?: string | null
                  avatar?: string | null
                } | null
              } = await profileResponse.json()

              savedProfileImage =
                profileResult.profile?.profileImage ??
                profileResult.profile?.avatar ??
                null
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              return
            }
          }

          if (!controller.signal.aborted) {
            cachedHomepageUser = {
              fullName: user.fullName,
              username: user.username,
              profileImage: savedProfileImage,
              role: user.role as HomepageRole,
            }

            setHomepageUser(cachedHomepageUser)
          }
        } else {
          // Delivery Man is intentionally excluded from this feature.
          cachedHomepageUser = null
          setHomepageUser(null)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        if (!controller.signal.aborted) {
          setHomepageUser(cachedHomepageUser)
        }
      }
    }

    void loadHomepageSession()

    return () => controller.abort()
  }, [])

  const filteredArtworks =
    activeCategory === 'All'
      ? artworks
      : artworks.filter((artwork) => artwork.category.toLowerCase() === activeCategory.toLowerCase())

  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id],
    )
  }

  return (
    <div className="app">
      <div className="announcement">
        Discover original art. Support independent African artists.
      </div>

      <header className="navbar">
        <a className="brand" href="#home">
          artist<span>-wrld</span>
          <span className="brand-dot">.</span>
        </a>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
          <NavLink to="/about" end className={({ isActive }) => isActive ? "active" : ""}>About</NavLink>
          <NavLink to="/artworks" className={({ isActive }) => isActive || window.location.pathname.startsWith("/artworks/") ? "active" : ""}>Gallery</NavLink>
          <NavLink to="/artists" end className={({ isActive }) => isActive ? "active" : ""}>Artists</NavLink>
            </nav>

        <div className="nav-actions">
          {homepageUser ? (
            <Link
              to={homepageDashboardPaths[homepageUser.role]}
              className="homepage-account-link"
              aria-label={`Open ${homepageUser.role.toLowerCase()} dashboard`}
              title="Open your dashboard"
            >
              <span className="homepage-account-avatar" aria-hidden="true">
                {homepageUser.profileImage ? (
                  <img
                    src={homepageUser.profileImage}
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
                  (homepageUser.fullName || homepageUser.username || 'U')
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                )}
              </span>
              <span className="homepage-account-name">
                {homepageUser.username || homepageUser.fullName || 'My account'}
              </span>
            </Link>
          ) : (
            <>
              <Link className="login-link" to="/login">Log in</Link>
              <Link className="button button-dark nav-join" to="/register">
                Join Artist-Wrld
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">A WORLD OF CREATIVITY</span>
            <h1>
              Art that
              <br />
              moves <span>you.</span>
            </h1>
            <p>
              Discover original artworks, meet extraordinary artists, and
              bring creativity into your world.
            </p>

            <div className="hero-actions">
              <a href="/artworks" className="button button-dark">
                Gallery 
              </a>
              <a href="/register" className="button button-light">
                Become an artist
              </a>
            </div>

            <div className="hero-note">
              <span className="note-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span>A creative home for artists and art lovers.</span>
            </div>
          </div>

          <div className="hero-visual">
            <img
              className="hero-image"
              src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85"
              alt="Colourful contemporary artwork"
            />
            <div className="floating-card">
              <div className="floating-icon" aria-label="Artist palette and paintbrush" role="img">
<svg viewBox="0 0 32 32" fill="none" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M16 3.5C8.8 3.5 3 8.9 3 15.5S8.5 27 15.5 27h2.2c2 0 3.3-1.4 3.3-3.1 0-1-.5-1.8-1.2-2.4-.6-.5-.8-1.2-.5-1.9.3-.8 1-1.2 2-1.2h2.2c3.3 0 5.5-2.3 5.5-5.3C29 7.8 23.1 3.5 16 3.5Z" />
  <circle cx="10" cy="11" r="1.3" />
  <circle cx="15.5" cy="8.5" r="1.3" />
  <circle cx="21" cy="11" r="1.3" />
  <circle cx="9" cy="17" r="1.3" />
  <path d="m20 23 7-10.5c.5-.8 1.5-1 2.2-.5.7.4.9 1.3.5 2L23 25l-3 1 0-3Z" />
</svg>
</div>
              <div>
                <strong>Art with a story</strong>
                <p>Created by independent artists</p>
              </div>
            </div>
            <span className="hero-side-label">CREATIVITY WITHOUT BORDERS</span>
          </div>
        </section>

        <section className="trust-strip">
          <div><strong>Discover</strong><span>Unique original artworks</span></div>
          <div><strong>Connect</strong><span>Meet creative minds</span></div>
          <div><strong>Support</strong><span>Independent artists</span></div>
          <div><strong>Collect</strong><span>Pieces that inspire you</span></div>
        </section>

        <section className="section categories-section" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIND YOUR INSPIRATION</span>
              <h2>Explore by category</h2>
            </div>
            <p>There is a story waiting in every form of art.</p>
          </div>

          <div className="category-grid">
            <a
              className="category-card category-painting"
              href="/artworks?category=Paintings"
            >
              
              <img src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=700&q=80" alt="Paintings" />
              <span className="category-overlay">
                <span>01 / CANVAS</span>
                <strong>Paintings</strong>
                <span>Explore collection</span>
              </span>
            </a>

            <a
              className="category-card category-photo"
              href="/artworks?category=Photography"
            >
              
              <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=80" alt="Photography" />
              <span className="category-overlay">
                <span>02 / PERSPECTIVE</span>
                <strong>Photography</strong>
                <span>Explore collection</span>
              </span>
            </a>

            <a
              className="category-card category-abstract"
              href="/artworks?category=Abstract"
            >
              
              <img src="https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=700&q=80" alt="Abstract art" />
              <span className="category-overlay">
                <span>03 / EXPRESSION</span>
                <strong>Abstract</strong>
                <span>Explore collection</span>
              </span>
            </a>

            <a
              className="category-card category-sculpture"
              href="/artworks?category=Sculpture"
            >
              
              <img src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=700&q=80" alt="Sculpture and mixed media" />
              <span className="category-overlay">
                <span>04 / FORM</span>
                <strong>Sculpture &amp; more</strong>
                <span>Explore collection</span>
              </span>
            </a>
          </div>
        </section>

        <section className="section artworks-section" id="explore">
          <div className="section-heading">
            <div>
              <span className="eyebrow">HANDPICKED FOR YOU</span>
              <h2>Art worth discovering<span className="heading-dot">.</span></h2>
            </div>
            <a className="text-link" href="/artworks">Discover all art</a>
          </div>

          <div className="filter-row">
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-button ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div
            className="artwork-grid"
            ref={artworkCarouselRef}
            onPointerDown={(event) => {
              if (event.pointerType !== 'mouse' || event.button !== 0) return
              if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) return
              artworkDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startScrollLeft: event.currentTarget.scrollLeft,
                moved: false,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
              artworkPausedRef.current = true
            }}
            onPointerMove={(event) => {
              const drag = artworkDragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return
              const distance = event.clientX - drag.startX
              if (Math.abs(distance) > 5) drag.moved = true
              if (drag.moved) {
                event.currentTarget.scrollLeft = drag.startScrollLeft - distance
                event.preventDefault()
              }
            }}
            onPointerUp={(event) => {
              const drag = artworkDragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return
              suppressArtworkClickRef.current = drag.moved
              artworkDragRef.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onPointerCancel={() => { artworkDragRef.current = null }}
            onClickCapture={(event) => {
              if (suppressArtworkClickRef.current) {
                event.preventDefault()
                event.stopPropagation()
                suppressArtworkClickRef.current = false
              }
            }}
            onDragStart={(event) => {
              if (artworkDragRef.current?.moved) event.preventDefault()
            }}
            onMouseEnter={() => { artworkPausedRef.current = true }}
            onMouseLeave={() => { artworkPausedRef.current = false }}
            onTouchStart={() => { artworkPausedRef.current = true }}
            onTouchEnd={() => { artworkPausedRef.current = false }}
            onFocusCapture={() => { artworkPausedRef.current = true }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                artworkPausedRef.current = false
              }
            }}
          >
            {filteredArtworks.map((artwork) => (
              <article className="artwork-card" key={artwork.id}>
                <div className="artwork-image-wrap">
                  <img
                    src={artwork.image || undefined}
                    alt={artwork.title}
                    className="artwork-image"
                  />

                  <button
                    className={`favorite-button ${favorites.includes(artwork.id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(artwork.id)}
                    aria-label={
                      favorites.includes(artwork.id)
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                    aria-pressed={favorites.includes(artwork.id)}
                  >
                    {favorites.includes(artwork.id) ? '\u2665' : '\u2661'}
                  </button>

                  <span className="artwork-category">{artwork.category}</span>
                </div>

                <div className="artwork-info">
                  <div>
                    <h3>{artwork.title}</h3>
                    <p>By {artwork.artist}</p>
                  </div>
                  <strong>{new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(artwork.price)}</strong>
                </div>

                <button
                  className="view-art-button"
                  onClick={() => navigate(`/artworks/${artwork.id}`)}
                >
                  View artwork
                </button>
              </article>
            ))}
          </div>

          {artworksLoading && (
            <p className="empty-state">Loading published artwork...</p>
          )}

          {!artworksLoading && artworksError && (
            <p className="empty-state" role="alert">{artworksError}</p>
          )}

          {!artworksLoading && !artworksError && filteredArtworks.length === 0 && (
            <p className="empty-state">
              {artworks.length === 0
                ? 'No published artwork is available yet.'
                : 'No artworks in this category yet.'}
            </p>
          )}
        </section>

        

                <section className="section home-artists-section" id="featured-artists">
          <div className="home-artists-heading">
            <div>
              <p className="home-artists-eyebrow">The people behind the art</p>
              <h2>Meet our artists</h2>
              <p>Discover the creative minds and stories behind original works.</p>
            </div>

            <Link to="/artists" className="home-artists-explore">
              Explore all artists <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {artistsLoading && (
            <p className="home-artists-message" role="status">
              Discovering our artists...
            </p>
          )}

          {!artistsLoading && artistsError && (
            <p className="home-artists-message" role="alert">
              {artistsError}
            </p>
          )}

          {!artistsLoading && !artistsError && featuredArtists.length === 0 && (
            <p className="home-artists-message">
              No approved artist profiles are available yet. Please check back soon.
            </p>
          )}

          {!artistsLoading && !artistsError && featuredArtists.length > 0 && (
            <div
              className="home-artists-grid"
              ref={artistCarouselRef}
              onPointerDown={(event) => {
                if (event.pointerType !== 'mouse' || event.button !== 0) return
                if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) return
                artistDragRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startScrollLeft: event.currentTarget.scrollLeft,
                  moved: false,
                }
                event.currentTarget.setPointerCapture(event.pointerId)
                artistPausedRef.current = true
              }}
              onPointerMove={(event) => {
                const drag = artistDragRef.current
                if (!drag || drag.pointerId !== event.pointerId) return
                const distance = event.clientX - drag.startX
                if (Math.abs(distance) > 5) drag.moved = true
                if (drag.moved) {
                  event.currentTarget.scrollLeft = drag.startScrollLeft - distance
                  event.preventDefault()
                }
              }}
              onPointerUp={(event) => {
                const drag = artistDragRef.current
                if (!drag || drag.pointerId !== event.pointerId) return
                suppressArtistClickRef.current = drag.moved
                artistDragRef.current = null
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }
              }}
              onPointerCancel={() => { artistDragRef.current = null }}
              onClickCapture={(event) => {
                if (suppressArtistClickRef.current) {
                  event.preventDefault()
                  event.stopPropagation()
                  suppressArtistClickRef.current = false
                }
              }}
              onDragStart={(event) => {
                if (artistDragRef.current?.moved) event.preventDefault()
              }}
              onMouseEnter={() => { artistPausedRef.current = true }}
              onMouseLeave={() => { artistPausedRef.current = false }}
              onTouchStart={() => { artistPausedRef.current = true }}
              onTouchEnd={() => { artistPausedRef.current = false }}
              onFocusCapture={() => { artistPausedRef.current = true }}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  artistPausedRef.current = false
                }
              }}
            >
              {featuredArtists.map((artist) => (
                <article className="home-artist-card" key={artist.id}>
                  <Link
                    to={`/artists/${artist.slug}`}
                    className="home-artist-image-link"
                    aria-label={`View ${artist.name}'s profile`}
                  >
                    {artist.image ? (
                      <img
                        className="home-artist-image"
                        src={artist.image}
                        alt={`${artist.name}'s artist profile`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="home-artist-placeholder" aria-hidden="true">
                        {artist.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join('')}
                      </div>
                    )}
                  </Link>

                  <div className="home-artist-details">
                    <p className="home-artist-specialty">
                      {artist.specialty || 'Independent Artist'}
                    </p>

                    <h3>
                      <Link to={`/artists/${artist.slug}`}>
                        {artist.name}
                      </Link>
                    </h3>

                    {artist.location && (
                      <p className="home-artist-location">{artist.location}</p>
                    )}


                    <div className="home-artist-card-footer">
                      <span>
                        {artist.artworkCount} {artist.artworkCount === 1 ? 'artwork' : 'artworks'}
                      </span>

                      <Link to={`/artists/${artist.slug}`}>
                        View profile &rarr;
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
<section className="join-section" id="join">
          <div className="join-decoration" aria-label="Art tools" role="img">
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M31 7C17 7 6 17 6 30s10 24 23 24h5c4 0 7-3 7-7 0-3-2-5-2-7 0-3 2-5 6-5h3c7 0 10-5 10-11C58 14 46 7 31 7Z" />
    <circle cx="19" cy="23" r="2" />
    <circle cx="29" cy="16" r="2" />
    <circle cx="40" cy="19" r="2" />
    <circle cx="17" cy="35" r="2" />
    <path d="m39 48 13-19c2-3 5-3 7-1s2 4 0 7L44 54l-7 3 2-9Z" />
  </svg>
</div>
          <div className="join-content">
            <span className="eyebrow">YOUR CREATIVITY BELONGS HERE</span>
            <h2>Make room for<br />something <em>extraordinary.</em></h2>
            <p>
              Whether you create art or collect it, there is a place for you here.
            </p>
            <div className="hero-actions">
              <a href="/register" className="button button-cream">
                Join the community
              </a>
              <a href="/artworks" className="button button-outline">
                Discover art
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" id="login">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand" href="#home">
              artist<span>-wrld</span><span className="brand-dot">.</span>
            </a>
            <p>
              A home for creativity, culture, and the people who make art matter.
            </p>
          </div>

          <div className="footer-column">
            <strong>Discover</strong>
            <Link to="/artworks">Gallery</Link>
            <Link to="/artists">Artists</Link>
                </div>

          <div className="footer-column">
            <strong>Community</strong>
            <a href="/register">Become an artist</a>
            <a href="/register">Become a collector</a>
            <Link to="/about">Our story</Link>
          </div>

          <div className="footer-column">
            <strong>Account</strong>
            <a href="/login">Log in</a>
            <a href="/register">Create an account</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; 2026 Artist-Wrld. Made for the love of art.</span>
          <span>Created with creativity in mind</span>
        </div>
      </footer>
    </div>
  )
}

function PreviousRouteTracker() {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    const current = location.pathname + location.search
    const storageKey = 'artist-wrld-route-stack'

    let stack: string[]
    try {
      const saved = sessionStorage.getItem(storageKey)
      const parsed: unknown = saved ? JSON.parse(saved) : []
      stack = Array.isArray(parsed)
        ? parsed.filter((route): route is string => typeof route === 'string')
        : []
    } catch {
      stack = []
    }

    if (location.pathname === '/register') {
      const previousRoute = stack.length > 0 ? stack[stack.length - 1] : ''

      if (
        previousRoute &&
        previousRoute !== '/register' &&
        !previousRoute.startsWith('/register?')
      ) {
        sessionStorage.setItem('artist-wrld-register-return', previousRoute)
      }
    }
    if (navigationType === 'POP') {
      const existingIndex = stack.lastIndexOf(current)

      if (existingIndex >= 0) {
        stack = stack.slice(0, existingIndex + 1)
      } else {
        stack.push(current)
      }
    } else if (navigationType === 'REPLACE') {
      if (stack.length > 0) {
        stack[stack.length - 1] = current
      } else {
        stack = [current]
      }
    } else {
      if (stack[stack.length - 1] !== current) {
        stack.push(current)
      }
    }

    sessionStorage.setItem(storageKey, JSON.stringify(stack))
  }, [location.pathname, location.search, navigationType])

  return null
}

type DashboardRole = 'ADMIN' | 'ARTIST' | 'BUYER' | 'DELIVERY_MAN'

type ProtectedRouteProps = {
  allowedRole: DashboardRole
  children: React.ReactNode
}

const dashboardPaths: Record<DashboardRole, string> = {
  ADMIN: '/admin',
  ARTIST: '/artist-dashboard',
  BUYER: '/buyer-dashboard',
  DELIVERY_MAN: '/delivery-dashboard',
}

function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<DashboardRole | null>(null)
  const [requestFailed, setRequestFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (response.status === 401) {
          setRole(null)
          return
        }

        if (!response.ok) {
          setRequestFailed(true)
          return
        }

        const result: {
          authenticated?: boolean
          user?: { role?: string }
        } = await response.json()

        const validRoles: DashboardRole[] = [
          'ADMIN',
          'ARTIST',
          'BUYER',
          'DELIVERY_MAN',
        ]

        if (
          result.authenticated === true &&
          result.user?.role &&
          validRoles.includes(result.user.role as DashboardRole)
        ) {
          setRole(result.user.role as DashboardRole)
        } else {
          setRole(null)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setRequestFailed(true)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void checkSession()

    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
        }}
      >
        <p>Verifying your session...</p>
      </main>
    )
  }

  if (requestFailed) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
        }}
      >
        <div role="alert">
          <h2>Unable to verify your session</h2>
          <p>
            The Artist-Wrld server could not be reached. Check that the
            backend is running, then try again.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (role !== allowedRole) {
    return <Navigate to={dashboardPaths[role]} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
            <PreviousRouteTracker />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/artist-dashboard" element={<ProtectedRoute allowedRole="ARTIST"><ArtistDashboard /></ProtectedRoute>} />
      <Route path="/buyer-dashboard" element={<ProtectedRoute allowedRole="BUYER"><BuyerDashboard /></ProtectedRoute>} />
        <Route path="/delivery-dashboard" element={<ProtectedRoute allowedRole="DELIVERY_MAN"><DeliveryDashboard /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/setup-authenticator" element={<AuthenticatorSetup />} />
        <Route path="/verify-2fa" element={<VerifyTwoFactor />} />
        <Route path="/artworks" element={<ArtworkGallery />} />
        <Route path="/artworks/:id" element={<ArtworkDetails />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/about" element={<About />} />
        <Route path="/artists/:slug" element={<ArtistProfile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App




































