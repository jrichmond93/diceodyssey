import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const loadSitemapXml = (): string =>
  readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')

describe('sitemap regression coverage', () => {
  it('includes key game and how-to-play routes for SEO crawl discovery', () => {
    const sitemap = loadSitemapXml()

    const requiredUrls = [
      'https://diceodysseys.com/how-to-play',
      'https://diceodysseys.com/odyssey',
      'https://diceodysseys.com/odyssey/apologoi',
      'https://diceodysseys.com/odyssey/lotus-eaters',
      'https://diceodysseys.com/odyssey/cyclops-polyphemus',
      'https://diceodysseys.com/odyssey/aeolus-and-the-winds',
      'https://diceodysseys.com/odyssey/laestrygonians',
      'https://diceodysseys.com/odyssey/circes-island',
      'https://diceodysseys.com/odyssey/underworld-tiresias',
      'https://diceodysseys.com/odyssey/sirens-scylla-charybdis',
      'https://diceodysseys.com/odyssey/return-to-ithaca',
      'https://diceodysseys.com/games/space-race',
      'https://diceodysseys.com/games/space-race/how-to-play',
      'https://diceodysseys.com/games/voyage-home',
      'https://diceodysseys.com/games/mythic-reveal',
      'https://diceodysseys.com/games/voyage-home/how-to-play',
      'https://diceodysseys.com/games/mythic-reveal/how-to-play',
    ]

    requiredUrls.forEach((url) => {
      expect(sitemap).toContain(`<loc>${url}</loc>`)
    })
  })

  it('does not include removed Asteroid Siege routes', () => {
    const sitemap = loadSitemapXml()

    expect(sitemap).not.toContain('asteroid-siege')
    expect(sitemap).not.toContain('Asteroid Siege')
  })
})
