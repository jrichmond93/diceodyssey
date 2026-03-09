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
    id: 'aeolus-wind-bag-vision',
    name: 'Aeolus Wind-Bag Vision',
    description: 'A storm erupts as a forbidden wind-bag is unbound at sea.',
    fullSrc: '/assets/mythic-reveal/aeolus-wind-bag-vision.png',
  },
  {
    id: 'circe-enchantment-vision',
    name: 'Circe Enchantment Vision',
    description: 'Moonlit sorcery in Circe\'s hall bends mortal fate.',
    fullSrc: '/assets/mythic-reveal/circe-enchantment-vision.png',
  },
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
  {
    id: 'laestrygonian-ambush-vision',
    name: 'Laestrygonian Ambush Vision',
    description: 'Giant raiders rain destruction through a narrow harbor trap.',
    fullSrc: '/assets/mythic-reveal/laestrygonian-ambush-vision.png',
  },
  {
    id: 'underworld-gate-vision',
    name: 'Underworld Gate Vision',
    description: 'A ritual threshold opens where shades gather in cold mist.',
    fullSrc: '/assets/mythic-reveal/underworld-gate-vision.png',
  },
  {
    id: 'athena-bio-vision',
    name: 'Athena',
    description: 'A strategic divine portrait from the rivals archive.',
    fullSrc: '/assets/opponents/athena-bio.png',
  },
  {
    id: 'calyp-bio-vision',
    name: 'Calypso',
    description: 'A rival portrait from the hidden opponents collection.',
    fullSrc: '/assets/opponents/calyp-bio.png',
  },
  {
    id: 'circe-bio-vision',
    name: 'Circe',
    description: 'An enchanted rival portrait from the opponents archive.',
    fullSrc: '/assets/opponents/circe-bio.png',
  },
  {
    id: 'hermes-bio-vision',
    name: 'Hermes',
    description: 'A swift divine portrait drawn from the rivals gallery.',
    fullSrc: '/assets/opponents/hermes-bio.png',
  },
  {
    id: 'odys-bio-vision',
    name: 'Odysseus',
    description: 'A veteran captain portrait from the opponents archive.',
    fullSrc: '/assets/opponents/odys-bio.png',
  },
  {
    id: 'poly-bio-vision',
    name: 'Polyphemus',
    description: 'A formidable rival portrait from the opponents archive.',
    fullSrc: '/assets/opponents/poly-bio.png',
  },
  {
    id: 'posey-bio-vision',
    name: 'Poseidon',
    description: 'A storm-forged rival portrait from the opponents archive.',
    fullSrc: '/assets/opponents/posey-bio.png',
  },
  {
    id: 'zeus-bio-vision',
    name: 'Zeus',
    description: 'A thunderous divine portrait from the rivals collection.',
    fullSrc: '/assets/opponents/zeus-bio.png',
  },
  {
    id: 'apologoi-odyssey-hero',
    name: 'Apologoi',
    description: 'Odysseus recounts his journey in a grand hall of listeners.',
    fullSrc: '/assets/odyssey/apologoi-hero.jpg',
  },
  {
    id: 'lotus-eaters-odyssey-hero',
    name: 'Lotus-Eaters',
    description: 'A dreamlike island temptation clashes with urgent command.',
    fullSrc: '/assets/odyssey/lotus-eaters-hero.jpg',
  },
  {
    id: 'cyclops-polyphemus-odyssey-hero',
    name: 'Cyclops Polyphemus',
    description: 'Escape from the giant unfolds between cavern dark and dawn light.',
    fullSrc: '/assets/odyssey/cyclops-polyphemus-hero.jpg',
  },
  {
    id: 'aeolus-and-the-winds-odyssey-hero',
    name: 'Aeolus and the Winds Odyssey Hero',
    description: 'A sealed storm is loosed and hope is blown off course.',
    fullSrc: '/assets/odyssey/aeolus-and-the-winds-hero.jpg',
  },
  {
    id: 'laestrygonians-odyssey-hero',
    name: 'Laestrygonians',
    description: 'A harbor ambush shatters fleets under towering violence.',
    fullSrc: '/assets/odyssey/laestrygonians-hero.jpg',
  },
  {
    id: 'circes-island-odyssey-hero',
    name: 'Circe\'s Island',
    description: 'Enchantment and steel meet in a moonlit palace standoff.',
    fullSrc: '/assets/odyssey/circes-island-hero.jpg',
  },
  {
    id: 'underworld-tiresias-odyssey-hero',
    name: 'Underworld Tiresias',
    description: 'Ritual fire and cold shadows frame a prophetic descent.',
    fullSrc: '/assets/odyssey/underworld-tiresias-hero.jpg',
  },
  {
    id: 'sirens-scylla-charybdis-odyssey-hero',
    name: 'Sirens Scylla Charybdis',
    description: 'Impossible choices close in across reef, cliff, and whirlpool.',
    fullSrc: '/assets/odyssey/sirens-scylla-charybdis-hero.jpg',
  },
  {
    id: 'return-to-ithaca-odyssey-hero',
    name: 'Return to Ithaca',
    description: 'Justice and homecoming collide in the hall of Ithaca.',
    fullSrc: '/assets/odyssey/return-to-ithaca-hero.jpg',
  },
]

export const getMythicImageById = (id: string): MythicImageManifestEntry | undefined =>
  MYTHIC_IMAGE_MANIFEST.find((entry) => entry.id === id)
