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
    slug: 'nebula-heist',
    name: 'Nebula Heist',
    summary: 'Coming soon: coordinated raids across unstable sectors.',
    status: 'coming-soon',
  },
  {
    slug: 'asteroid-siege',
    name: 'Asteroid Siege',
    summary: 'Coming soon: hold asteroid outposts under pressure.',
    status: 'coming-soon',
  },
]

export const SPACE_RACE_GAME = GAME_CATALOG[0]

export const findGameBySlug = (slug: string): GameCatalogEntry | undefined =>
  GAME_CATALOG.find((entry) => entry.slug === slug)
