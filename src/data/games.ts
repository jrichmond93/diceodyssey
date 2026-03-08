export type GameCatalogStatus = 'active' | 'coming-soon'

export interface GameCatalogEntry {
  slug: string
  name: string
  summary: string
  status: GameCatalogStatus
}

export const GAME_CATALOG: ReadonlyArray<GameCatalogEntry> = [
  {
    slug: 'space-race',
    name: 'Space Race',
    summary: 'Race across planets, claim MacGuffins, and disrupt rivals.',
    status: 'active',
  },
  {
    slug: 'voyage-home',
    name: 'Voyage Home',
    summary: 'Pig-style sea race with curses, sudden death, and deterministic AI captains.',
    status: 'active',
  },
  {
    slug: 'mythic-reveal',
    name: 'Mythic Reveal',
    summary: 'Unveil a six-part prophecy before your rival can sabotage your progress.',
    status: 'active',
  },
]

export const SPACE_RACE_GAME = GAME_CATALOG[0]

export const findGameBySlug = (slug: string): GameCatalogEntry | undefined =>
  GAME_CATALOG.find((entry) => entry.slug === slug)
