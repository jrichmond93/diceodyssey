import type { Planet } from '../types'

export type PlanetState = 'unknown' | 'barren' | 'event' | 'macguffin'

export const getPlanetState = ({ revealed, face }: Pick<Planet, 'revealed' | 'face'>): PlanetState => {
  if (!revealed) {
    return 'unknown'
  }

  if (face >= 3) {
    return 'macguffin'
  }

  return 'barren'
}

export const planetStateLabel: Record<PlanetState, string> = {
  unknown: 'Unknown',
  barren: 'Barren',
  event: 'Event',
  macguffin: 'MacGuffin-rich',
}

export const planetStateIcon: Record<PlanetState, string> = {
  unknown: '/assets/ui/icon-planet-unknown.png',
  barren: '/assets/ui/icon-planet-barren.png',
  event: '/assets/ui/icon-planet-event.png',
  macguffin: '/assets/ui/icon-planet-macguffin.png',
}
