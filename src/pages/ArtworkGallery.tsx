import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import PublicAccountActions from '../components/PublicAccountActions'
import { API_URL } from '../lib/api'
import './ArtworkGallery.css'

type Artwork = {
  id: string
  title: string
  artist: string
  category: string
  price: number
  image: string | null
}

const categories = ['All', 'Paintings', 'Photography', 'Abstract', 'Sculpture', 'More']

function ArtworkGallery() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPublishedArtworks() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetch(`${API_URL}/artworks/public`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Artwork request failed (${response.status}).`)
        }

        const data: { artworks?: Artwork[] } = await response.json()

        if (!Array.isArray(data.artworks)) {
          throw new Error('The server returned an unexpected artwork response.')
        }

        setArtworks(data.artworks)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to load published artwork.'
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadPublishedArtworks()

    return () => controller.abort()
  }, [retryCount])
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('featured')

  const selectedCategory = searchParams.get('category') || 'All'

  const filteredArtworks = useMemo(() => {
    const query = search.trim().toLowerCase()

    const results = artworks.filter((artwork) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        artwork.category.trim().toLowerCase().replace(/s$/, '') === selectedCategory.trim().toLowerCase().replace(/s$/, '')

      const matchesSearch =
        artwork.title.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        artwork.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })

    if (sort === 'price-low') {
      return [...results].sort((a, b) => a.price - b.price)
    }

    if (sort === 'price-high') {
      return [...results].sort((a, b) => b.price - a.price)
    }

    if (sort === 'title') {
      return [...results].sort((a, b) => a.title.localeCompare(b.title))
    }

    return results
  }, [artworks, selectedCategory, search, sort])

  function selectCategory(category: string) {
    if (category === 'All') {
      setSearchParams({})
    } else {
      setSearchParams({ category })
    }
  }

  return (
    <div className="gallery-page">
      <div className="gallery-announcement">
        Discover original art. Support independent African artists.
      </div>

      <header className="gallery-navbar">
        <Link className="gallery-brand" to="/">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <nav className="gallery-nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
          <NavLink to="/artworks" end className={({ isActive }) => isActive ? "active" : ""}>Gallery</NavLink>
          <NavLink to="/artists" className={({ isActive }) => isActive || window.location.pathname.startsWith("/artists/") ? "active" : ""}>Artists</NavLink>
        </nav>

        <PublicAccountActions variant="gallery" />
      </header>

      <main className="gallery-main">
        <section className="gallery-hero">
          <span className="gallery-eyebrow">THE ART COLLECTION</span>
          <h1>Find art that <em>moves you.</em></h1>
          <p>
            Explore original artwork, discover new perspectives, and find
            something meaningful for your space.
          </p>
          <span className="gallery-art-count">
            {artworks.length} artworks to discover
          </span>
        </section>

        <section className="gallery-content" id="artwork-results">
          <div className="gallery-heading">
            <div>
              <span className="gallery-eyebrow">CURATED FOR YOU</span>
              <h2>Gallery</h2>
            </div>
            <span className="gallery-results-count">
              {filteredArtworks.length}{' '}
              {filteredArtworks.length === 1 ? 'artwork' : 'artworks'}
            </span>
          </div>

          <div className="gallery-tools">
            <label className="gallery-search">
              <span className="gallery-search-icon" aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
</span>
              <input
                type="search"
                placeholder="Search by artwork or artist..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search artworks by title or artist"
              />
            </label>

            <label className="gallery-sort">
              <span>Sort by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort artworks"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="title">Title: A to Z</option>
              </select>
            </label>
          </div>

          <div className="gallery-category-filters" aria-label="Artwork categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={
                  selectedCategory.toLowerCase() === category.toLowerCase()
                    ? 'gallery-filter active'
                    : 'gallery-filter'
                }
                aria-pressed={
                  selectedCategory.toLowerCase() === category.toLowerCase()
                }
                onClick={() => selectCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="gallery-empty-state" role="status">
              <h3>Loading published artwork...</h3>
              <p>Please wait while we retrieve the gallery.</p>
            </div>
          ) : loadError ? (
            <div className="gallery-empty-state" role="alert">
              <h3>Unable to load artwork</h3>
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => setRetryCount((current) => current + 1)}
              >
                Try again
              </button>
            </div>
          ) : filteredArtworks.length > 0 ? (
            <div className="gallery-artwork-grid">
              {filteredArtworks.map((artwork) => (
                <article className="gallery-artwork-card" key={artwork.id}>
                  <Link
                    className="gallery-artwork-image-link"
                    to={`/artworks/${artwork.id}`}
                    aria-label={`View ${artwork.title}`}
                  >
                    {artwork.image ? (
                      <img
                        src={artwork.image}
                        alt={artwork.title}
                        className="gallery-artwork-image"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="gallery-artwork-image"
                        role="img"
                        aria-label={`${artwork.title}: no image uploaded`}
                      />
                    )}
                    <span className="gallery-artwork-category">
                      {artwork.category}
                    </span>
                  </Link>

                  <div className="gallery-artwork-info">
                    <div>
                      <h3>
                        <Link to={`/artworks/${artwork.id}`}>
                          {artwork.title}
                        </Link>
                      </h3>
                      <p>By {artwork.artist}</p>
                    </div>
                    <strong>
                      {new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(artwork.price)}
                    </strong>
                  </div>

                  <Link
                    className="gallery-view-button"
                    to={`/artworks/${artwork.id}`}
                  >
                    View artwork <span></span>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="gallery-empty-state">
              <span className="gallery-empty-icon" aria-hidden="true">
<svg viewBox="0 0 32 32" fill="none" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M16 3.5C8.8 3.5 3 8.9 3 15.5S8.5 27 15.5 27h2.2c2 0 3.3-1.4 3.3-3.1 0-1-.5-1.8-1.2-2.4-.6-.5-.8-1.2-.5-1.9.3-.8 1-1.2 2-1.2h2.2c3.3 0 5.5-2.3 5.5-5.3C29 7.8 23.1 3.5 16 3.5Z" />
  <circle cx="10" cy="11" r="1.3" />
  <circle cx="15.5" cy="8.5" r="1.3" />
  <circle cx="21" cy="11" r="1.3" />
  <circle cx="9" cy="17" r="1.3" />
  <path d="m20 23 7-10.5c.5-.8 1.5-1 2.2-.5.7.4.9 1.3.5 2L23 25l-3 1 0-3Z" />
</svg>
</span>
              <h3>{artworks.length === 0 ? "No published artwork yet" : "No artworks found"}</h3>
              <p>{artworks.length === 0 ? "Published artworks will appear here when artists share their work." : "Try another search or choose a different category."}</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSearchParams({})
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section className="gallery-artist-cta">
          <div>
            <span className="gallery-eyebrow">ARE YOU AN ARTIST?</span>
            <h2>Your creativity deserves to be discovered.</h2>
            <p>Join the Artist-Wrld community and share your work.</p>
          </div>
          <Link to="/register">Join the community </Link>
        </section>
      </main>

      <footer className="gallery-footer">
        <Link className="gallery-brand" to="/">
          artist<span>-wrld</span><b>.</b>
        </Link>
        <span>© {new Date().getFullYear()} Artist-Wrld. Made for the love of art.</span>
        
      </footer>
    </div>
  )
}

export default ArtworkGallery








