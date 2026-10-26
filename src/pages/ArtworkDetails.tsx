import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PublicAccountActions from '../components/PublicAccountActions'
import { API_URL } from '../lib/api'
import './ArtworkDetails.css'

type Artwork = {
  id: string
  title: string
  artist: string
  category: string
  price: number
  image: string | null
  description: string | null
}

function ArtworkDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [cartMessage, setCartMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadArtwork() {
      setLoading(true)
      setError('')
      setArtwork(null)

      try {
        const response = await fetch(`${API_URL}/artworks/public`)

        const data: {
          artworks?: Artwork[]
          message?: string
        } = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load this artwork.',
          )
        }

        const foundArtwork = data.artworks?.find(
          (item) => item.id === id,
        ) ?? null

        if (!cancelled) {
          setArtwork(foundArtwork)
        }
      } catch {
        if (!cancelled) {
          setError(
            'Unable to load artwork. Please check that the server is running and try again.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadArtwork()

    return () => {
      cancelled = true
    }
  }, [id])
  if (loading) {
    return (
      <main className="artwork-not-found" aria-live="polite">
        <p className="eyebrow">ARTIST-WRLD</p>
        <h1>Loading artwork...</h1>
        <p>Retrieving artwork details.</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="artwork-not-found" role="alert">
        <p className="eyebrow">ARTIST-WRLD</p>
        <h1>Artwork unavailable</h1>
        <p>{error}</p>
        <Link to="/" className="artwork-button artwork-button-dark">
          Return to homepage
        </Link>
      </main>
    )
  }
  if (!artwork) {
    return (
      <main className="artwork-not-found">
        <p className="eyebrow">ARTIST-WRLD</p>
        <h1>Artwork not found</h1>
        <p>The artwork you're looking for may no longer be available.</p>
        <Link to="/" className="artwork-button artwork-button-dark">
          Return to homepage
        </Link>
      </main>
    )
  }

  function addToCart() {
    if (!artwork) return

    const existingCart = JSON.parse(
      localStorage.getItem('artistWrldCart') || '[]',
    ) as { id: string | number; quantity: number }[]

    const existingItem = existingCart.find((item) => String(item.id) === artwork.id)

    if (existingItem) {
      existingItem.quantity += 1
    } else {
      existingCart.push({ id: artwork.id, quantity: 1 })
    }

    localStorage.setItem('artistWrldCart', JSON.stringify(existingCart))
    setCartMessage('Artwork added to your cart.')
  }

  return (
    <div className="artwork-details-page">
      <header className="artwork-details-header">
        <Link to="/" className="artwork-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <nav className="artwork-details-nav">
          <Link to="/">Home</Link>
          <Link to="/#explore" className="active">Gallery</Link>
          <Link to="/artists">Artists</Link>
        </nav>

        <div className="artwork-header-actions">
          <PublicAccountActions variant="artists" />
        </div>
      </header>

      <main className="artwork-details-main">
        <div className="artwork-breadcrumb">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="artwork-details-back-button"
          >
            &larr; Back
          </button>
        </div>

        <section className="artwork-details-layout">
          <div className="artwork-image-column">
            <div className="artwork-main-image">
              {artwork.image ? (
                <img src={artwork.image} alt={artwork.title} />
              ) : (
                <div className="artwork-image-unavailable">
                  No image provided by the artist.
                </div>
              )}
            </div>

            <div className="artwork-image-caption">
              <span>DISCOVER ORIGINAL ART</span>
              <span>ARTIST-WRLD COLLECTION</span>
            </div>
          </div>

          <div className="artwork-information">
            <p className="eyebrow">{artwork.category.toUpperCase()}</p>

            <h1>{artwork.title}</h1>

            <p className="artwork-artist-name">
              Created by <strong>{artwork.artist}</strong>
            </p>

            <div className="artwork-price">
              {new Intl.NumberFormat('en-GH', {
                style: 'currency',
                currency: 'GHS',
              }).format(artwork.price)}
            </div>

            <p className="artwork-description">{artwork.description || "No description has been provided by the artist yet."}</p>

            <div className="artwork-detail-divider" />

            <div className="artwork-detail-row">
              <span>Category</span>
              <strong>{artwork.category}</strong>
            </div>

            <div className="artwork-detail-row">
              <span>Artist</span>
              <strong>{artwork.artist}</strong>
            </div>

            <div className="artwork-detail-row">
              <span>Availability</span>
              <strong className="artwork-availability">
                Available to explore
              </strong>
            </div>

            <div className="artwork-purchase-actions">
              <button
                type="button"
                className="artwork-button artwork-button-dark artwork-add-cart"
                onClick={addToCart}
              >
                Add to Cart
              </button>

              <button
                type="button"
                className={`artwork-button artwork-favorite-button ${
                  isFavorite ? 'is-favorite' : ''
                }`}
                onClick={() => setIsFavorite((previous) => !previous)}
                aria-pressed={isFavorite}
              >
                {isFavorite ? '♥ Saved to Favorites' : '♡ Add to Favorites'}
              </button>
            </div>

            {cartMessage && (
              <p className="artwork-feedback" role="status">
                {cartMessage}
              </p>
            )}


            <button
              type="button"
              className="artwork-back-link"
              onClick={() => navigate(-1)}
            >
              ← Back to previous page
            </button>
          </div>
        </section>

        <section className="artwork-bottom-banner">
          <div>
            <p className="eyebrow">ARTIST-WRLD</p>
            <h2>Discover the stories behind the art.</h2>
            <p>
              Explore original work and connect with creative talent.
            </p>
          </div>

          <Link to="/artworks" className="artwork-button artwork-button-light">
            Back to Gallery
          </Link>
        </section>
      </main>

      <footer className="artwork-details-footer">
        <Link to="/" className="artwork-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>
        <p>Discover art. Connect with creativity.</p>
        <span>© {new Date().getFullYear()} Artist-Wrld</span>
      </footer>
    </div>
  )
}

export default ArtworkDetails






