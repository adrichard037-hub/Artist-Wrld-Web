import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import PublicAccountActions from '../components/PublicAccountActions'
import { API_URL } from '../lib/api'
import './Artists.css'

type Artist = {
  id: string
  slug: string
  name: string
  specialty: string
  image: string | null
  bio: string | null
  location: string | null
  artworkCount: number
}

function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadArtists() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_URL}/artists/public`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('Unable to load artists. Please try again later.')
        }

        const data: { artists?: Artist[] } = await response.json()
        setArtists(Array.isArray(data.artists) ? data.artists : [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load artists. Please try again later.',
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadArtists()

    return () => controller.abort()
  }, [])
  return (
    <main className="artists-directory">
      <header className="artists-header">
        <Link to="/" className="artists-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <nav className="artists-nav" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/artworks">Gallery</NavLink>
          <NavLink to="/artists" className={({ isActive }) => isActive || window.location.pathname.startsWith("/artists/") ? "active" : ""}>Artists</NavLink>
          <PublicAccountActions variant="artists" />
        </nav>
      </header>

      <section className="artists-hero">
        <span className="artists-eyebrow">MEET THE CREATORS</span>
        <h1>Discover the <em>artists.</em></h1>
        <p>
          Meet the creative minds behind the work. Explore their stories,
          discover their styles, and find art that speaks to you.
        </p>
      </section>

      <section className="artists-listing">
        <div className="artists-listing-heading">
          <div>
            <span className="artists-eyebrow">OUR CREATIVE COMMUNITY</span>
            <h2>Featured artists</h2>
          </div>
          <span className="artists-count">{artists.length} artists</span>
        </div>

                {loading && <p role="status">Loading artists...</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && artists.length === 0 && (
          <p>No artist profiles are available yet. Check back soon.</p>
        )}

        <div className="artists-grid">
          {artists.map((artist, index) => (
            <article className="directory-artist-card" key={artist.slug}>
              <Link
                to={`/artists/${artist.slug}`}
                className="directory-artist-image-link"
                aria-label={`View ${artist.name}'s profile`}
              >
                {artist.image ? (
                  <img
                    className="directory-artist-image"
                    src={artist.image}
                    alt={artist.name}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="directory-artist-image directory-artist-image-placeholder"
                    role="img"
                    aria-label={`No profile image available for ${artist.name}`}
                  />
                )}
                <span className="directory-artist-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </Link>

              <div className="directory-artist-info">
                <span className="directory-artist-specialty">
                  {artist.specialty}
                </span>
                <h3>{artist.name}</h3>
                <p>{artist.bio || 'This artist has not added a biography yet.'}</p>
                <Link
                  to={`/artists/${artist.slug}`}
                  className="directory-artist-link"
                >
                  View artist profile <span aria-hidden="true"></span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="artists-cta">
        <span className="artists-eyebrow">YOUR CREATIVE JOURNEY</span>
        <h2>Have art to share with the world?</h2>
        <p>Join our community and introduce your work to art lovers.</p>
        <Link to="/register" className="artists-cta-button">
          Become an artist 
        </Link>
      </section>

      <footer className="artists-footer">
        <Link to="/" className="artists-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>
        <span>Â© 2026 Artist-Wrld. Made for the love of art.</span>
      </footer>
    </main>
  )
}

export default Artists



