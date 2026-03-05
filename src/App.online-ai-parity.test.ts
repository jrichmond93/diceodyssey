import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Online AI parity with Instant Adventure', () => {
  it('uses local Instant Adventure path instead of start-vs-ai API from App flow', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

    expect(appSource).not.toContain('/api/sessions/start-vs-ai')
    expect(appSource).toContain('handleStartInstantAdventure()')
  })

  it('keeps Online→AI handler on local-start sequence', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    const handlerStart = appSource.indexOf('const handleStartOnlineAiMatch = useCallback(')
    const handlerEnd = appSource.indexOf('const handleSelectHomeStartMode = useCallback(')

    expect(handlerStart).toBeGreaterThanOrEqual(0)
    expect(handlerEnd).toBeGreaterThan(handlerStart)

    const handlerSource = appSource.slice(handlerStart, handlerEnd)

    expect(handlerSource).toContain('await leaveCurrentLobbySessionIfNeeded()')
    expect(handlerSource).toContain('handleStartInstantAdventure({')
    expect(handlerSource).toContain('aiCount: 1')
    expect(handlerSource).toContain('selectedAiSlug: aiSlug')
    expect(handlerSource).not.toContain("setMode('multiplayer')")
    expect(handlerSource).not.toContain('connectOnlineSession(')
    expect(handlerSource).not.toContain('/api/sessions/start-vs-ai')
  })
})
