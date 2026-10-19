import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    if (pathname === '/artworks' && new URLSearchParams(search).has('category')) {
      const timer = window.setTimeout(() => {
        document.getElementById('artwork-results')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)

      return () => window.clearTimeout(timer)
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  }, [pathname, search])

  return null
}

export default ScrollToTop
