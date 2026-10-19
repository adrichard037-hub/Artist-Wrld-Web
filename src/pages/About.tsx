import { Link, NavLink } from 'react-router-dom'
import PublicAccountActions from '../components/PublicAccountActions'
import './About.css'

function About() {
  return (
    <main className="about-page">
      <header className="about-header">
        <Link to="/" className="about-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>

        <nav className="about-nav" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about" end className={({ isActive }) => isActive ? "active" : ""}>About</NavLink>
          <NavLink to="/artworks">Gallery</NavLink>
          <NavLink to="/artists">Artists</NavLink>
          <PublicAccountActions variant="about" />
        </nav>
      </header>

      <section className="about-hero">
        <span className="about-eyebrow">OUR STORY · OUR PURPOSE</span>
        <h1>Art brings us<br /> <em>together.</em></h1>
        <p>
          A creative home where independent artists share their work,
          collectors discover meaningful art, and creativity finds its audience.
        </p>
        <Link to="/artists" className="about-primary-button">
          Meet our community
        </Link>
      </section>

      <section className="about-intro">
        <div className="about-intro-label">
          <span className="about-eyebrow">WHO WE ARE</span>
          <h2>More than a gallery.</h2>
        </div>
        <div className="about-intro-copy">
          <p>
            Artist-Wrld is a space built around the people and stories behind
            the art. We bring independent artists and art lovers together
            through a shared appreciation for creativity, culture, and
            individual expression.
          </p>
          <p>
            From expressive paintings to photography, abstract compositions,
            and sculpture, every work offers a different perspective.
            We believe those perspectives deserve to be seen and explored.
          </p>
        </div>
      </section>

      <section className="about-values">
        <div className="about-values-heading">
          <span className="about-eyebrow">WHAT GUIDES US</span>
          <h2>Our values</h2>
        </div>

        <div className="about-values-grid">
          <article className="about-value-card">
            <span className="about-value-number">01</span>
            <h3>Champion artists</h3>
            <p>
              We celebrate independent creatives and give their work a place
              to be discovered by new audiences.
            </p>
          </article>

          <article className="about-value-card">
            <span className="about-value-number">02</span>
            <h3>Celebrate expression</h3>
            <p>
              We welcome different styles, ideas, materials, and perspectives
              that make the creative world richer.
            </p>
          </article>

          <article className="about-value-card">
            <span className="about-value-number">03</span>
            <h3>Build connections</h3>
            <p>
              We connect artists with people who value their work and want
              to discover the stories behind it.
            </p>
          </article>
        </div>
      </section>

      <section className="about-community">
        <div className="about-community-copy">
          <span className="about-eyebrow">DISCOVER SOMETHING DIFFERENT</span>
          <h2>Every artist has a story. Every artwork has a feeling.</h2>
          <p>
            Explore the people behind the work, discover new perspectives,
            and find the art that speaks to you.
          </p>
          <div className="about-community-actions">
            <Link to="/artists" className="about-primary-button">
              Meet our artists
            </Link>
            <Link to="/artworks" className="about-secondary-button">
              Explore the gallery
            </Link>
          </div>
        </div>
        <div className="about-community-image">
          <img
            src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1100&q=85"
            alt="Colourful artwork in an art gallery"
            loading="lazy"
          />
        </div>
      </section>

      <section className="about-final-cta">
        <span className="about-eyebrow">BE PART OF THE STORY</span>
        <h2>Creativity deserves a community.</h2>
        <p>Join Artist-Wrld and be part of a world inspired by art.</p>
        <Link to="/register" className="about-join-button">
          Join Artist-Wrld
        </Link>
      </section>

      <footer className="about-footer">
        <Link to="/" className="about-brand">
          artist<span>-wrld</span><b>.</b>
        </Link>
        <span>© 2026 Artist-Wrld. Made for the love of art.</span>
      </footer>
    </main>
  )
}

export default About

