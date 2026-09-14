import { useEffect } from 'react'
import LocationControl from '@site/src/components/LocationControl'

export default function LocationControlNavbarItem() {
  useEffect(() => {
    document
      .querySelectorAll<HTMLAnchorElement>('.navbar__brand, .header-user-guide-link')
      .forEach((link) => {
        const url = new URL(link.href, location.origin)
        url.search = location.search
        link.href = url.toString()
      })
  }, [])

  return <LocationControl />
}
