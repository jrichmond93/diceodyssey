import { describe, expect, it } from 'vitest'
import { getMultiplayerEligibility, mapAuthUserToMultiplayerIdentity } from './auth'

describe('getMultiplayerEligibility', () => {
  it('returns loading state while auth is initializing', () => {
    expect(getMultiplayerEligibility(false, true)).toEqual({
      eligible: false,
      reason: 'AUTH_LOADING',
    })
  })

  it('requires authentication once auth is loaded', () => {
    expect(getMultiplayerEligibility(false, false)).toEqual({
      eligible: false,
      reason: 'UNAUTHENTICATED',
    })
  })

  it('marks authenticated users as eligible', () => {
    expect(getMultiplayerEligibility(true, false)).toEqual({
      eligible: true,
    })
  })
})

describe('mapAuthUserToMultiplayerIdentity', () => {
  it('returns null when user has no subject identifier', () => {
    expect(mapAuthUserToMultiplayerIdentity({ name: 'Captain' })).toBeNull()
  })

  it('maps authenticated user to seat identity with display fallback', () => {
    expect(
      mapAuthUserToMultiplayerIdentity({
        sub: 'auth0|123',
        email: 'captain@example.com',
      }),
    ).toEqual({
      userId: 'auth0|123',
      displayName: 'captain',
    })
  })
})
