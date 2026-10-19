import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PublicAccountActions from '../components/PublicAccountActions'
import './ArtistProfile.css'

type Artist = {
  id: string
  slug: string
  name: string
  specialty: string
  image: string | null
  bio: string | null
  location: string | null
}

type ArtistArtwork = {
  id: string
  title: string
  category: string
  description: string | null
  price: number
  image: string | null
  createdAt: string
}

function ArtistProfile() {
  const navigate = useNavigate()
  const { slug } = useParams()

  const [artist, setArtist] = useState<Artist | null>(null)
  const [artistArtworks, setArtistArtworks] = useState<ArtistArtwork[]>([])
  const [loading, setLoading] = useState(Boolean(slug))
  const [error, setError] = useState(
    slug ? '' : 'Artist profile not found.',
  )

  useEffect(() => {
    if (!slug) {
      return
    }

    const artistSlug = slug
    const controller = new AbortController()

    async function loadArtist() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `https://artist-wrld-backend.onrender.com/api/artists/public/${encodeURIComponent(artistSlug)}`,
          { signal: controller.signal },
        )

        if (response.status === 404) {
          throw new Error('This artist profile could not be found.')
        }

        if (!response.ok) {
          throw new Error('Unable to load this artist profile. Please try again.')
        }

        const data: {
          artist?: Artist
          artworks?: ArtistArtwork[]
        } = await response.json()

        if (!data.artist) {
          throw new Error('This artist profile could not be found.')
        }

        setArtist(data.artist)
        setArtistArtworks(
          Array.isArray(data.artworks) ? data.artworks : [],
        )
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load this artist profile.',
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadArtist()

    return () => controller.abort()
  }, [slug])

  if (loading) {
    return (
      <main className="artist-profile-page">
        <div className="artist-profile-container">
          <p role="status">Loading artist profile...</p>
        </div>
      </main>
    )
  }

  if (error || !artist) {
    return (
      <main className="artist-profile-page">
        <div className="artist-profile-container">
          <p role="alert">
            {error || 'This artist profile could not be found.'}
          </p>
          <Link to="/artists" className="artist-profile-secondary">
            Back to Artists
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="artist-profile-page">
      <header className="artist-profile-header">
        <Link to="/" className="artist-profile-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <nav className="artist-profile-nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/artworks">Gallery</Link>
          <Link to="/artists" className="active">Artists</Link>
          <PublicAccountActions variant="artists" />
        </nav>
      </header>

      <div className="artist-profile-container">
        <button type="button" className="artist-profile-back" onClick={() => navigate(-1)}>
          &larr; Back
        </button>

        <section className="artist-profile-hero">
          <div className="artist-profile-image-wrap">
                        {artist.image ? (
              <img src={artist.image} alt={artist.name} className="artist-profile-image" />
            ) : (
              <div
                className="artist-profile-image"
                role="img"
                aria-label={`No profile image available for ${artist.name}`}
              />
            )}
            <span className="artist-profile-image-label">ARTIST-WRLD COMMUNITY</span>
          </div>

          <div className="artist-profile-intro">
            <span className="artist-profile-eyebrow">MEET THE ARTIST</span>
            <h1>{artist.name}</h1>
            <p className="artist-profile-specialty">{artist.specialty}</p>
            <div className="artist-profile-divider" />
            <p className="artist-profile-bio">{artist.bio || "This artist has not added a biography yet."}</p>
            {artist.location && <p className="artist-profile-statement">{artist.location}</p>}

            <div className="artist-profile-actions">
              <a href="#artist-works" className="artist-profile-primary">
                Explore their work &rarr;
              </a>
              <Link to="/artworks" className="artist-profile-secondary">
                Browse Gallery
              </Link>
            </div>
          </div>
        </section>

        <section className="artist-profile-works" id="artist-works">
          <div className="artist-profile-section-heading">
            <div>
              <span className="artist-profile-eyebrow">SELECTED COLLECTION</span>
              <h2>Works by {artist.name.split(' ')[0]}</h2>
            </div>
            <Link to="/artworks" className="artist-profile-view-all">
              View Gallery 
            </Link>
          </div>

          {artistArtworks.length > 0 ? (
            <div className="artist-profile-artwork-grid">
              {artistArtworks.map((artwork) => (
                <Link
                  to={`/artworks/${artwork.id}`}
                  className="artist-profile-artwork-card"
                  key={artwork.id}
                >
                  <div className="artist-profile-artwork-image-wrap">
                                        {artwork.image ? (
                      <img src={artwork.image} alt={artwork.title} />
                    ) : (
                      <div role="img" aria-label={`No image available for ${artwork.title}`} />
                    )}
                    <span className="artist-profile-artwork-arrow" aria-hidden="true"></span>
                  </div>
                  <div className="artist-profile-artwork-info">
                    <div>
                      <h3>{artwork.title}</h3>
                      <p>{artwork.category}</p>
                    </div>
                    <span className="artist-profile-price">{`${String.fromCharCode(8373)} ${artwork.price.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="artist-profile-empty">
              New artworks from this artist will be added to the collection soon.
            </p>
          )}
        </section>

        <section className="artist-profile-cta">
          <span className="artist-profile-eyebrow">ART IS BETTER WHEN SHARED</span>
          <h2>Discover more stories<br />through art.</h2>
          <p>Explore the collection or become part of the Artist-Wrld community.</p>
          <div className="artist-profile-actions">
            <Link to="/artworks" className="artist-profile-primary">Explore Gallery </Link>
            <Link to="/register" className="artist-profile-secondary">Join the Community</Link>
          </div>
        </section>
      </div>

      <footer className="artist-profile-footer">
        <Link to="/" className="artist-profile-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>
        <span>{String.fromCharCode(169)} {new Date().getFullYear()} Artist-Wrld. Made for the love of art.</span>
      </footer>
    </main>
  )
}

export default ArtistProfile


