import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const loadSitemapXml = (): string =>
  readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')

describe('sitemap regression coverage', () => {
  it('includes active game and how-to-play routes for SEO crawl discovery', () => {
    const sitemap = loadSitemapXml()

    const requiredUrls = [
      'https://diceodysseys.com/how-to-play',
      'https://diceodysseys.com/games/space-race',
      'https://diceodysseys.com/games/space-race/how-to-play',
      'https://diceodysseys.com/games/voyage-home',
      'https://diceodysseys.com/games/voyage-home/how-to-play',
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
