import type { MythicRevealAiProfile } from './types'

export const MYTHIC_REVEAL_SECTION_COUNT = 6
export const MYTHIC_REVEAL_DICE_PER_TURN = 6

// MVP rule: sabotage is available when the roll includes this trigger face.
export const SABOTAGE_TRIGGER_FACE = 1

export const AI_PROFILE_LABEL: Record<MythicRevealAiProfile, string> = {
  circe: 'Circe',
  poly: 'Poly',
}

export interface MythicImageManifestEntry {
  id: string
  name: string
  description: string
  fullSrc: string
}

export const MYTHIC_IMAGE_MANIFEST: ReadonlyArray<MythicImageManifestEntry> = [
  {
    id: 'trojan-horse-vision',
    name: 'Trojan Horse Vision',
    description: 'A prophetic glimpse of the horse crossing burning battlements.',
    fullSrc: '/assets/mythic-reveal/trojan-horse-vision.png',
  },
  {
    id: 'sirens-reef-vision',
    name: 'Sirens Reef Vision',
    description: 'Shattered moonlight over reefs where songs bend fate.',
    fullSrc: '/assets/mythic-reveal/sirens-reef-vision.png',
  },
  {
    id: 'ithaca-storm-vision',
    name: 'Ithaca Storm Vision',
    description: 'Storm-torn sails racing toward the beacon of home.',
    fullSrc: '/assets/mythic-reveal/ithaca-storm-vision.png',
  },
  {
    id: 'cyclops-cavern-vision',
    name: 'Cyclops Cavern Vision',
    description: 'A one-eyed giant looms in volcanic shadows by the sea.',
    fullSrc: '/assets/mythic-reveal/cyclops-cavern-vision.png',
  },
]

export const getMythicImageById = (id: string): MythicImageManifestEntry | undefined =>
  MYTHIC_IMAGE_MANIFEST.find((entry) => entry.id === id)
