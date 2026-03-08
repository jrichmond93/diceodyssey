import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Voyage Home app integration', () => {
  it('wires Voyage Home routes and page rendering branches', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

    expect(appSource).toContain("const isVoyageHomeHowToPlayPath = pathname === '/games/voyage-home/how-to-play'")
    expect(appSource).toContain("const isVoyageHomeRoute = gameSlugFromPath === 'voyage-home'")

    expect(appSource).toContain('if (isVoyageHomeHowToPlayPath) {')
    expect(appSource).toContain('<VoyageHomeHowToPlayPage />')

    expect(appSource).toContain('if (isVoyageHomeRoute && !authoritativeVoyageState.started) {')
    expect(appSource).toContain('if (isVoyageHomeRoute) {')
    expect(appSource).toContain('<VoyageHomePage')
  })

  it('starts Voyage Home from home launcher with local-only branching', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    const handleStartStart = appSource.indexOf('const handleStart = () => {')
    const handleStartEnd = appSource.indexOf('const handleStartInstantAdventure = useCallback(')

    expect(handleStartStart).toBeGreaterThanOrEqual(0)
    expect(handleStartEnd).toBeGreaterThan(handleStartStart)

    const handleStartSource = appSource.slice(handleStartStart, handleStartEnd)

    expect(handleStartSource).toContain("if (selectedGame.slug === 'voyage-home')")
    expect(handleStartSource).toContain("type: 'INIT_VOYAGE_HOME'")
    expect(handleStartSource).toContain("mode: 'hotseat'")
    expect(handleStartSource).toContain("mode: 'single'")
    expect(handleStartSource).toContain("navigate('/games/voyage-home')")
    expect(handleStartSource).toContain('voyage_home_start_clicked')
  })

  it('keeps Voyage Home online mode available in launcher mode selection', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

    expect(appSource).toContain("selectedGame.slug === SPACE_RACE_GAME.slug || selectedGame.slug === 'voyage-home'")
    expect(appSource).not.toContain("if (nextMode === 'ONLINE' && selected.slug === 'voyage-home')")
    expect(appSource).not.toContain('Voyage Home is local-only in this release. Choose Instant Adventure or Hotseat.')
  })
})
