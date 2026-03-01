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

interface PlanetStateVisual {
  shellClass: string
  labelClass: string
  faceClass: string
}

const planetStateVisual: Record<PlanetState, PlanetStateVisual> = {
  unknown: {
    shellClass: 'border-slate-500/70 shadow-[0_0_16px_rgba(100,116,139,0.25)]',
    labelClass: 'text-slate-400',
    faceClass: 'text-slate-300',
  },
  barren: {
    shellClass: 'border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.22)]',
    labelClass: 'text-amber-200/80',
    faceClass: 'text-amber-200',
  },
  event: {
    shellClass: 'border-fuchsia-400/60 shadow-[0_0_18px_rgba(217,70,239,0.24)]',
    labelClass: 'text-fuchsia-200/85',
    faceClass: 'text-fuchsia-200',
  },
  macguffin: {
    shellClass: 'border-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.26)]',
    labelClass: 'text-emerald-200/90',
    faceClass: 'text-emerald-200',
  },
}

export const getPlanetStateVisual = (state: PlanetState): PlanetStateVisual => planetStateVisual[state]
