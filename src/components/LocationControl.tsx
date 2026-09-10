import { useMemo, useState } from 'react'
import { config } from '../api/config'

function withQuery(pathname: string, mutate: (qs: URLSearchParams) => void): string {
  const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  mutate(qs)
  const query = qs.toString()
  return query ? `${pathname}?${query}` : pathname
}

export default function LocationControl() {
  const qs = useMemo(
    () => new URLSearchParams(typeof location !== 'undefined' ? location.search : ''),
    [],
  )
  const pathname = typeof location !== 'undefined' ? location.pathname : '/'
  const latitude = qs.get('lat') || config.defaultLatitude
  const longitude = qs.get('lon') || config.defaultLongitude

  const [coordInput, setCoordInput] = useState(`${latitude},${longitude}`)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coordMapHref = useMemo(() => {
    const [lat, lon] = coordInput.split(',').map((s) => s.trim())
    return lat && lon
      ? `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`
      : '#'
  }, [coordInput])

  const handleSubmit = () => {
    const trimmed = coordInput.trim()
    if (!trimmed) {
      if (qs.has('lat') || qs.has('lon')) {
        location.href = withQuery(pathname, (q) => {
          q.delete('lat')
          q.delete('lon')
        })
        return
      }
      setCoordInput(`${latitude},${longitude}`)
      location.reload()
      return
    }
    const [newLat, newLon] = trimmed.split(',').map((s) => s.trim())
    if (newLat && newLon && (newLat !== latitude || newLon !== longitude)) {
      location.href = withQuery(pathname, (q) => {
        q.set('lat', newLat)
        q.set('lon', newLon)
      })
      return
    }
    location.reload()
  }

  const handleUseMyLocationClick = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }
    setError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const newLat = pos.coords.latitude.toFixed(4)
        const newLon = pos.coords.longitude.toFixed(4)
        location.href = withQuery(pathname, (q) => {
          q.set('lat', newLat)
          q.set('lon', newLon)
        })
      },
      (err) => {
        setLocating(false)
        setError(err.message)
      },
    )
  }

  return (
    <div className="coord-group navbar-coord-group">
      <a className="coord-label" href={coordMapHref} target="_blank" rel="noopener noreferrer">
        Lat,Lon:
      </a>
      <input
        type="text"
        size={16}
        inputMode="decimal"
        className="coord-input"
        placeholder="lat,lon"
        title={
          error ||
          (latitude === config.defaultLatitude && longitude === config.defaultLongitude
            ? 'Dublin'
            : undefined)
        }
        value={coordInput}
        onChange={(e) => setCoordInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
        }}
      />
      <button
        className="icon-btn"
        disabled={locating}
        onClick={handleUseMyLocationClick}
        aria-label={locating ? 'Locating…' : 'Use My Location'}
        title={error || (locating ? 'Locating…' : 'Use My Location')}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
          />
        </svg>
      </button>
    </div>
  )
}
