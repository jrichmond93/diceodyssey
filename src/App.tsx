import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type SyntheticEvent } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { AppFooter } from './components/AppFooter'
import { DicePool } from './components/DicePool'
import { GalaxyBoard } from './components/GalaxyBoard'
import { PlayerStatus } from './components/PlayerStatus'
import { TurnResolution } from './components/TurnResolution'
import { TurnLog } from './components/TurnLog'
import { TurnControls } from './components/TurnControls'
import { ResolveDiceAnimation } from './components/ResolveDiceAnimation'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { OpponentBioPage } from './pages/OpponentBioPage'
import { OpponentsPage } from './pages/OpponentsPage'
import { ProfilePage } from './pages/ProfilePage'
import { emptyAllocation, gameReducer, initialGameState } from './reducers/gameReducer'
import type { Allocation, Difficulty, GameMode, GameState, TurnResolutionPlaybackStage } from './types'
import { findAICharacterBySlug } from './data/aiCharacters'
import { buildPostGameNarrative } from './utils/buildPostGameNarrative'
import { preloadDiceAnimationAssets } from './utils/dieAssets'
import {
  getMultiplayerEligibility,
  mapAuthUserToMultiplayerIdentity,
  type AuthUserProfile,
} from './multiplayer/auth'
import {
  getPlayerAvatarSrc,
  PLAYER_AVATAR_FALLBACK_SRC,
} from './multiplayer/avatarCatalog'
import { getAuth0EnvConfig } from './multiplayer/env'
import { getUnifiedPlayFeatureFlags } from './multiplayer/env'
import { createSessionRealtimeController, type SessionRealtimeController } from './multiplayer/realtime'
import type { RealtimeEvent, SessionLifecycleAck, SessionSnapshot, TurnAck } from './multiplayer/types'

const HELP_STORAGE_KEY = 'dice-odysseys-help-open'
const HOME_MODE_STORAGE_KEY = 'dice-odysseys-home-mode'
const PRESENCE_VISIBILITY_STORAGE_KEY = 'dice-odysseys-presence-visibility'
const AI_THINK_DELAY_MS = 600
const RESOLVE_STAGE_DELAY_MS = 240
const REDUCED_MOTION_STAGE_DELAY_MS = 80
const REDUCED_MOTION_AI_DELAY_MS = 200
const RESOLVE_ANIMATION_MS = 2000
const MACGUFFIN_TOKEN_ICON = '/assets/ui/icon-macguffin-token.png'

const HUMAN_WIN_CELEBRATION_MS = 4200
const HUMAN_WIN_REDUCED_MOTION_MS = 2400
const HUMAN_WIN_SCROLL_LEAD_MS = 260
const QUICK_ONLINE_AUTOFILL_TIMEOUT_MS = 12000
const SHOW_DEBUG_CONTROLS = /^(1|true)$/i.test(import.meta.env.VITE_SHOW_DEBUG_CONTROLS ?? '')

const humanWinConfetti = [
  { left: 3, delay: 0, duration: 1850, colorClass: 'text-cyan-300' },
  { left: 9, delay: 180, duration: 2050, colorClass: 'text-emerald-300' },
  { left: 15, delay: 60, duration: 1950, colorClass: 'text-fuchsia-300' },
  { left: 21, delay: 320, duration: 2120, colorClass: 'text-cyan-200' },
  { left: 27, delay: 120, duration: 1880, colorClass: 'text-emerald-200' },
  { left: 33, delay: 260, duration: 2200, colorClass: 'text-fuchsia-200' },
  { left: 39, delay: 80, duration: 2000, colorClass: 'text-cyan-300' },
  { left: 45, delay: 210, duration: 1920, colorClass: 'text-emerald-300' },
  { left: 51, delay: 140, duration: 2160, colorClass: 'text-fuchsia-300' },
  { left: 57, delay: 40, duration: 1860, colorClass: 'text-cyan-200' },
  { left: 63, delay: 280, duration: 2060, colorClass: 'text-emerald-200' },
  { left: 69, delay: 100, duration: 1980, colorClass: 'text-fuchsia-200' },
  { left: 75, delay: 360, duration: 2140, colorClass: 'text-cyan-300' },
  { left: 81, delay: 190, duration: 1900, colorClass: 'text-emerald-300' },
  { left: 87, delay: 70, duration: 2080, colorClass: 'text-fuchsia-300' },
  { left: 93, delay: 240, duration: 1960, colorClass: 'text-cyan-200' },
]

type ResolveAnimationVariant = 'rolling' | 'skip'
type PresenceVisibility = 'discoverable' | 'friends-only' | 'private'
type HybridSeatMode = 'auto' | 'human' | 'ai'
type MatchStartState =
  | 'IDLE'
  | 'LOCKING_PLAN'
  | 'SEARCHING_PLAYERS'
  | 'SEAT_UPDATE'
  | 'MATCH_FOUND'
  | 'AUTO_FILLING_AI'
  | 'WAITING_USER_DECISION'
  | 'STARTING'
  | 'ENTERED_MATCH'
  | 'CANCELLED'
  | 'ERROR'

interface ActiveOpponent {
  id: string
  shortName: string
  slug: string
  fullName?: string
}

interface SocialUserEntry {
  userId: string
  displayName: string
}

interface PresenceDirectoryEntry {
  userId: string
  displayName: string
  status?: 'Available' | 'In Lobby' | 'In Match'
  sessionId?: string
}

interface PresenceSnapshotPayload {
  viewerVisibility?: PresenceVisibility
  playersOnlineNow: number
  playersSearchingNow: number
  estimatedWaitSeconds?: number
  region?: string
  availableNow?: PresenceDirectoryEntry[]
  friendsOnline?: SocialUserEntry[]
  joinNextGame?: Array<{
    id: string
    sessionId: string
    fromDisplayName?: string
    expiresAt?: string
  }>
}

interface PartyInviteEntry {
  id: string
  sessionId: string
  fromDisplayName?: string
  toDisplayName?: string
  status: string
  expiresAt: string
  createdAt?: string
}

interface ProfileDisplayNamePayload {
  profile?: {
    displayName?: string | null
    avatarKey?: string | null
  }
}

const withAvatarFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget
  if (image.src.endsWith(PLAYER_AVATAR_FALLBACK_SRC)) {
    return
  }

  image.src = PLAYER_AVATAR_FALLBACK_SRC
}

const allDiceAllocated = (allocation: Allocation): boolean =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length === 6

const buildApiErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const raw = await response.text().catch(() => '')

  let detail: string | undefined
  if (raw) {
    try {
      const payload = JSON.parse(raw) as { error?: string; detail?: string; reason?: string }
      detail = payload?.detail ?? payload?.error ?? payload?.reason
    } catch {
      detail = raw.trim()
    }
  }

  if (!detail) {
    return `${fallback} (${response.status})`
  }

  return `${fallback} (${response.status}): ${detail}`
}

const getNormalizedPathname = (pathname: string): string => {
  if (pathname.length <= 1) {
    return pathname
  }

  return pathname.replace(/\/+$/, '')
}

const getOpponentBioSlug = (pathname: string): string | undefined => {
  const prefix = '/opponents/'

  if (!pathname.startsWith(prefix)) {
    return undefined
  }

  const slug = pathname.slice(prefix.length)
  return slug.length > 0 ? slug : undefined
}

const isGameStateLike = (value: unknown): value is GameState => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<GameState>
  return (
    typeof candidate.started === 'boolean' &&
    Array.isArray(candidate.players) &&
    typeof candidate.currentPlayerIndex === 'number' &&
    typeof candidate.turn === 'number' &&
    Array.isArray(candidate.galaxy) &&
    Boolean(candidate.turnResolution) &&
    typeof candidate.turnResolution?.active === 'boolean'
  )
}

const getStoredHomeMode = (): GameMode => {
  if (typeof window === 'undefined') {
    return 'single'
  }

  const stored = window.localStorage.getItem(HOME_MODE_STORAGE_KEY)
  if (stored === 'single' || stored === 'hotseat' || stored === 'multiplayer') {
    return stored
  }

  return 'single'
}

const buildDefaultHotseatNames = (count: number): string =>
  Array.from({ length: count }, (_, index) => `Capt${index + 1}`).join(', ')

const logAutofillDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.debug(...args)
  }
}

const logPresenceDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.debug(...args)
  }
}

function App() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
    loginWithRedirect,
    getAccessTokenSilently,
  } = useAuth0()
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = getNormalizedPathname(location.pathname)
  const joinCodeFromQuery = useMemo(() => new URLSearchParams(location.search).get('code')?.trim() ?? '', [location.search])
  const opponentBioSlug = getOpponentBioSlug(pathname)
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [mode, setMode] = useState<GameMode>(() => getStoredHomeMode())
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [humanName, setHumanName] = useState('Captain')
  const [aiCount, setAiCount] = useState(1)
  const [hotseatCount, setHotseatCount] = useState(2)
  const [hotseatNames, setHotseatNames] = useState(buildDefaultHotseatNames(2))
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [draftAllocation, setDraftAllocation] = useState<Allocation>(emptyAllocation())
  const [showDebrief, setShowDebrief] = useState(false)
  const [singlePlayerAiTurnGate, setSinglePlayerAiTurnGate] = useState(false)
  const [singlePlayerAutoContinueAiTurns, setSinglePlayerAutoContinueAiTurns] = useState(false)
  const [playbackStage, setPlaybackStage] = useState<TurnResolutionPlaybackStage>('idle')
  const [showResolveAnimation, setShowResolveAnimation] = useState(false)
  const [resolveAnimationVariant, setResolveAnimationVariant] = useState<ResolveAnimationVariant>('rolling')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showHumanWinCelebration, setShowHumanWinCelebration] = useState(false)
  const [onlineSessionId, setOnlineSessionId] = useState<string | null>(null)
  const [onlineJoinSessionId, setOnlineJoinSessionId] = useState('')
  const [onlineSnapshot, setOnlineSnapshot] = useState<SessionSnapshot | null>(null)
  const [onlineStatusMessage, setOnlineStatusMessage] = useState<string | null>(null)
  const [onlineError, setOnlineError] = useState<string | null>(null)
  const [matchStartState, setMatchStartState] = useState<MatchStartState>('IDLE')
  const [quickOnlineFlowActive, setQuickOnlineFlowActive] = useState(false)
  const [quickOnlineRetryKey, setQuickOnlineRetryKey] = useState(0)
  const [presenceVisibility, setPresenceVisibility] = useState<PresenceVisibility>(() => {
    if (typeof window === 'undefined') {
      return 'discoverable'
    }

    const stored = window.localStorage.getItem(PRESENCE_VISIBILITY_STORAGE_KEY)
    if (stored === 'discoverable' || stored === 'friends-only' || stored === 'private') {
      return stored
    }

    return 'discoverable'
  })
  const [onlineSubmitting, setOnlineSubmitting] = useState(false)
  const [onlineLifecycleSubmitting, setOnlineLifecycleSubmitting] = useState(false)
  const [onlineInviteCode, setOnlineInviteCode] = useState<string | null>(null)
  const [onlineInviteExpiry, setOnlineInviteExpiry] = useState<string | null>(null)
  const [hybridSlotPlan, setHybridSlotPlan] = useState<HybridSeatMode[]>(['auto', 'auto', 'auto'])
  const [onlineJoinCode, setOnlineJoinCode] = useState('')
  const [joinLinkProcessing, setJoinLinkProcessing] = useState(false)
  const [friendTargetDisplayName, setFriendTargetDisplayName] = useState('')
  const [partyInviteTargetDisplayName, setPartyInviteTargetDisplayName] = useState('')
  const [friends, setFriends] = useState<SocialUserEntry[]>([])
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<SocialUserEntry[]>([])
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<SocialUserEntry[]>([])
  const [receivedPartyInvites, setReceivedPartyInvites] = useState<PartyInviteEntry[]>([])
  const [sentPartyInvites, setSentPartyInvites] = useState<PartyInviteEntry[]>([])
  const [socialLoading, setSocialLoading] = useState(false)
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null)
  const [presenceSnapshot, setPresenceSnapshot] = useState<PresenceSnapshotPayload | null>(null)

  const auth0Audience = useMemo(() => {
    try {
      return getAuth0EnvConfig().audience
    } catch {
      return undefined
    }
  }, [])

  const unifiedPlayFeatureFlags = useMemo(() => getUnifiedPlayFeatureFlags(), [])

  const getApiAccessToken = useCallback(async () => {
    const token = await getAccessTokenSilently(
      auth0Audience
        ? {
            authorizationParams: {
              audience: auth0Audience,
            },
          }
        : undefined,
    )

    return token
  }, [getAccessTokenSilently, auth0Audience])

  const resolutionTimersRef = useRef<number[]>([])
  const celebrationTimerRef = useRef<number | null>(null)
  const onlineRealtimeRef = useRef<SessionRealtimeController | null>(null)
  const onlineSessionGuardRef = useRef<string | null>(null)
  const joinLinkHandledRef = useRef<string | null>(null)
  const matchStartStateRef = useRef<MatchStartState>('IDLE')
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(HELP_STORAGE_KEY) === 'true'
  })

  const authoritativeState =
    onlineSnapshot && isGameStateLike(onlineSnapshot.gameState) ? onlineSnapshot.gameState : state
  const isOnlineMode = Boolean(onlineSessionId)
  const currentPlayer = authoritativeState.players[authoritativeState.currentPlayerIndex]
  const resolveStageDelay = prefersReducedMotion ? REDUCED_MOTION_STAGE_DELAY_MS : RESOLVE_STAGE_DELAY_MS
  const aiThinkDelay = prefersReducedMotion ? REDUCED_MOTION_AI_DELAY_MS : AI_THINK_DELAY_MS
  const isResolving = authoritativeState.turnResolution.active || onlineSubmitting
  const resolvingMessage =
    playbackStage === 'move'
      ? 'Resolving move rolls...'
      : playbackStage === 'claim'
        ? 'Resolving claim rolls...'
        : playbackStage === 'sabotage'
          ? 'Resolving sabotage rolls...'
          : playbackStage === 'post'
            ? 'Applying post effects...'
            : authoritativeState.turnResolution.message

  const trackUnifiedPlayEvent = useCallback((eventName: string, payload: Record<string, unknown> = {}) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('diceodyssey:telemetry', {
          detail: {
            eventName,
            ...payload,
            at: new Date().toISOString(),
          },
        }),
      )
    }

    if (import.meta.env.DEV) {
      console.info('[telemetry]', eventName, payload)
    }
  }, [])

  const setMatchStartStateTracked = useCallback(
    (next: MatchStartState, payload: Record<string, unknown> = {}) => {
      const previous = matchStartStateRef.current
      if (previous !== next) {
        trackUnifiedPlayEvent('match_start_state_changed', {
          fromState: previous,
          toState: next,
          ...payload,
        })
      }

      matchStartStateRef.current = next
      setMatchStartState(next)
    },
    [trackUnifiedPlayEvent],
  )

  useEffect(() => {
    matchStartStateRef.current = matchStartState
  }, [matchStartState])

  const clearResolutionTimers = useCallback(() => {
    resolutionTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    resolutionTimersRef.current = []
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraftAllocation(emptyAllocation())
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authoritativeState.currentPlayerIndex, authoritativeState.started])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(media.matches)
    update()

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    return () => clearResolutionTimers()
  }, [clearResolutionTimers])

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(HELP_STORAGE_KEY, String(helpOpen))
  }, [helpOpen])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(HOME_MODE_STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(PRESENCE_VISIBILITY_STORAGE_KEY, presenceVisibility)
  }, [presenceVisibility])

  useEffect(() => {
    setHotseatNames(buildDefaultHotseatNames(hotseatCount))
  }, [hotseatCount])

  useEffect(() => {
    if (authoritativeState.winnerId) {
      const timer = window.setTimeout(() => {
        setShowDebrief(true)
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [authoritativeState.winnerId])

  useEffect(() => {
    if (!authoritativeState.started || typeof window === 'undefined') {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [authoritativeState.started])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (!animationEnabled && !authoritativeState.animationEnabled) {
      return
    }

    void preloadDiceAnimationAssets()
  }, [animationEnabled, authoritativeState.animationEnabled])

  const winnerName = useMemo(
    () => authoritativeState.players.find((player) => player.id === authoritativeState.winnerId)?.name,
    [authoritativeState.players, authoritativeState.winnerId],
  )

  const winnerPlayer = useMemo(
    () => authoritativeState.players.find((player) => player.id === authoritativeState.winnerId),
    [authoritativeState.players, authoritativeState.winnerId],
  )

  const multiplayerIdentity = useMemo(
    () => mapAuthUserToMultiplayerIdentity((user ?? null) as AuthUserProfile | null),
    [user],
  )

  const multiplayerEligibility = useMemo(
    () => getMultiplayerEligibility(isAuthenticated, isAuthLoading),
    [isAuthenticated, isAuthLoading],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileDisplayName(null)
      logAutofillDebug('[name-autofill] not authenticated; cleared profile display name')
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const token = await getApiAccessToken()
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok || cancelled) {
          if (!cancelled) {
            logAutofillDebug('[name-autofill] profile fetch not ok', { status: response.status })
          }
          return
        }

        const body = (await response.json()) as ProfileDisplayNamePayload
        const nextDisplayName = body.profile?.displayName?.trim()
        if (!cancelled) {
          setProfileDisplayName(nextDisplayName || null)
          logAutofillDebug('[name-autofill] profile display name fetched', {
            profileDisplayName: nextDisplayName || null,
          })
        }
      } catch {
        if (!cancelled) {
          setProfileDisplayName(null)
          logAutofillDebug('[name-autofill] profile fetch failed; cleared profile display name')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getApiAccessToken, isAuthenticated])

  useEffect(() => {
    if (mode !== 'single') {
      return
    }

    const displayName = profileDisplayName?.trim()
    if (!displayName) {
      logAutofillDebug('[name-autofill] no profile display name available; keeping current single-player name')
      return
    }

    setHumanName((current) => {
      const trimmedCurrent = current.trim()
      if (trimmedCurrent && trimmedCurrent !== 'Captain') {
        logAutofillDebug('[name-autofill] preserving custom user-entered name', { current: trimmedCurrent })
        return current
      }

      logAutofillDebug('[name-autofill] applying profile display name to single-player name', {
        from: trimmedCurrent || 'Captain',
        to: displayName,
      })
      return displayName
    })
  }, [mode, profileDisplayName])

  const onlinePlayerId = useMemo(() => {
    if (!onlineSnapshot || !multiplayerIdentity) {
      return undefined
    }

    const seat = onlineSnapshot.playerSeats.find((entry) => entry.userId === multiplayerIdentity.userId)
    if (!seat) {
      return undefined
    }

    return `p${seat.seat}`
  }, [onlineSnapshot, multiplayerIdentity])

  const onlineHumanAvatarByPlayerId = useMemo(() => {
    if (!onlineSnapshot) {
      return {} as Record<string, string | undefined>
    }

    return onlineSnapshot.playerSeats.reduce<Record<string, string | undefined>>((accumulator, seat) => {
      accumulator[`p${seat.seat}`] = seat.avatarKey
      return accumulator
    }, {})
  }, [onlineSnapshot])

  const isOnlineActivePlayer = Boolean(
    isOnlineMode && onlinePlayerId && currentPlayer && currentPlayer.id === onlinePlayerId,
  )
  const isOnlineStatusWarning = Boolean(
    onlineStatusMessage &&
      (onlineStatusMessage.includes('Opponent left the match.') ||
        onlineStatusMessage.includes('Match ended because a player left.')),
  )
  const matchmakingRegionLabel = useMemo(() => {
    if (presenceSnapshot?.region) {
      return presenceSnapshot.region
    }

    if (typeof Intl === 'undefined') {
      return 'Global'
    }

    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!zone) {
      return 'Global'
    }

    const pieces = zone.split('/')
    return pieces[pieces.length - 1]?.replace(/_/g, ' ') ?? 'Global'
  }, [presenceSnapshot?.region])

  const playersOnlineNowCount = useMemo(() => {
    if (typeof presenceSnapshot?.playersOnlineNow === 'number') {
      return presenceSnapshot.playersOnlineNow
    }

    const connectedInSession = onlineSnapshot?.playerSeats.filter((seat) => seat.connected).length ?? 0
    return Math.max(connectedInSession, friends.length)
  }, [friends.length, onlineSnapshot, presenceSnapshot?.playersOnlineNow])

  const playersSearchingNowCount = useMemo(() => {
    if (typeof presenceSnapshot?.playersSearchingNow === 'number') {
      return presenceSnapshot.playersSearchingNow
    }

    if (!quickOnlineFlowActive || onlineSessionId) {
      return 0
    }

    return 1
  }, [onlineSessionId, presenceSnapshot?.playersSearchingNow, quickOnlineFlowActive])

  const estimatedWaitLabel = useMemo(() => {
    if (typeof presenceSnapshot?.estimatedWaitSeconds === 'number') {
      return `~${presenceSnapshot.estimatedWaitSeconds}s`
    }

    if (quickOnlineFlowActive && !onlineSessionId) {
      return '~12s'
    }

    if (mode === 'multiplayer') {
      return '<30s'
    }

    return '—'
  }, [mode, onlineSessionId, presenceSnapshot?.estimatedWaitSeconds, quickOnlineFlowActive])

  const availableNowPlayers = useMemo(
    () => {
      if (presenceSnapshot?.availableNow?.length) {
        const uniquePlayers = new Map<string, (typeof presenceSnapshot.availableNow)[number]>()

        for (const entry of presenceSnapshot.availableNow) {
          if (!entry.userId) {
            continue
          }

          if (!uniquePlayers.has(entry.userId)) {
            uniquePlayers.set(entry.userId, entry)
          }
        }

        if (presenceSnapshot.availableNow.length !== uniquePlayers.size) {
          logPresenceDebug('[presence] deduplicated availableNow entries', {
            before: presenceSnapshot.availableNow.length,
            after: uniquePlayers.size,
          })
        }

        return Array.from(uniquePlayers.values()).slice(0, 3)
      }

      const uniqueByUserId = new Map<string, {
        userId: string
        displayName: string
        status: 'Available' | 'In Match'
        sessionId?: string
      }>()

      ;(onlineSnapshot?.playerSeats ?? [])
        .filter((seat) => seat.connected && seat.userId !== multiplayerIdentity?.userId)
        .forEach((seat) => {
          if (!uniqueByUserId.has(seat.userId)) {
            uniqueByUserId.set(seat.userId, {
              userId: seat.userId,
              displayName: seat.displayName,
              status: seat.connected ? 'Available' : 'In Match',
              sessionId: onlineSessionId ?? undefined,
            })
          }
        })

      return Array.from(uniqueByUserId.values()).slice(0, 3)
    },
    [multiplayerIdentity?.userId, onlineSessionId, onlineSnapshot, presenceSnapshot?.availableNow],
  )

  const friendsOnlineEntries = useMemo(() => {
    if (presenceSnapshot?.friendsOnline?.length) {
      return presenceSnapshot.friendsOnline.slice(0, 3)
    }

    return friends.slice(0, 3)
  }, [friends, presenceSnapshot?.friendsOnline])

  const joinNextGameEntries = useMemo(() => {
    if (presenceSnapshot?.joinNextGame?.length) {
      return presenceSnapshot.joinNextGame.slice(0, 3)
    }

    return receivedPartyInvites
      .filter((invite) => invite.status === 'pending')
      .slice(0, 3)
      .map((invite) => ({
        id: invite.id,
        sessionId: invite.sessionId,
        fromDisplayName: invite.fromDisplayName,
        expiresAt: invite.expiresAt,
      }))
  }, [presenceSnapshot?.joinNextGame, receivedPartyInvites])

  const hybridSlotSummary = useMemo(() => {
    const counts = hybridSlotPlan.reduce(
      (accumulator, value) => {
        if (value === 'human') {
          accumulator.human += 1
        } else if (value === 'ai') {
          accumulator.ai += 1
        } else {
          accumulator.auto += 1
        }

        return accumulator
      },
      {
        human: 0,
        ai: 0,
        auto: 0,
      },
    )

    return `${counts.human} Human • ${counts.ai} AI • ${counts.auto} Auto`
  }, [hybridSlotPlan])

  const handleHybridSlotModeChange = useCallback((slotIndex: number, nextMode: HybridSeatMode) => {
    setHybridSlotPlan((previous) => previous.map((value, index) => (index === slotIndex ? nextMode : value)))
  }, [])

  useEffect(() => {
    return () => {
      if (onlineRealtimeRef.current) {
        void onlineRealtimeRef.current.disconnect()
      }
    }
  }, [])

  const connectOnlineSession = useCallback(
    async (sessionId: string) => {
      if (onlineRealtimeRef.current) {
        await onlineRealtimeRef.current.disconnect()
      }

      onlineSessionGuardRef.current = sessionId

      const controller = await createSessionRealtimeController(
        sessionId,
        {
          onEvent: (event: RealtimeEvent) => {
            if (onlineSessionGuardRef.current !== sessionId) {
              return
            }

            setOnlineError(null)

            if (event.type === 'PLAYER_LEFT' && event.userId !== multiplayerIdentity?.userId) {
              setOnlineStatusMessage('Opponent left the match.')
              return
            }

            if (event.type === 'GAME_ABANDONED' && event.reason === 'leave') {
              setOnlineStatusMessage('Match ended because a player left.')
              setShowDebrief(true)
            }
          },
          onSnapshot: (snapshot) => {
            if (onlineSessionGuardRef.current !== sessionId) {
              return
            }

            setOnlineSnapshot(snapshot)
            setOnlineStatusMessage(
              snapshot.status === 'abandoned'
                ? 'Match has been abandoned.'
                : snapshot.status === 'finished'
                  ? 'Game finished.'
                  : snapshot.gameState.started
                ? `Connected (v${snapshot.version}).`
                : 'Waiting for players...',
            )
          },
          onError: (message) => {
            if (onlineSessionGuardRef.current !== sessionId) {
              return
            }

            setOnlineError(message)
          },
        },
        {
          getAccessToken: () => getApiAccessToken(),
        },
      )

      onlineRealtimeRef.current = controller
      await controller.refreshSnapshot()
    },
    [getApiAccessToken, multiplayerIdentity?.userId],
  )

  const detachOnlineSession = useCallback(async () => {
    onlineSessionGuardRef.current = null

    if (onlineRealtimeRef.current) {
      await onlineRealtimeRef.current.disconnect()
      onlineRealtimeRef.current = null
    }

    setOnlineSnapshot(null)
    setOnlineSessionId(null)
    setOnlineJoinSessionId('')
    setOnlineJoinCode('')
    setOnlineSubmitting(false)
    setOnlineLifecycleSubmitting(false)
    setOnlineInviteCode(null)
    setOnlineInviteExpiry(null)
    setQuickOnlineFlowActive(false)
    setQuickOnlineRetryKey(0)
    setMatchStartStateTracked('IDLE')
  }, [setMatchStartStateTracked])

  const clearOnlineContextForOfflineStart = useCallback(() => {
    onlineSessionGuardRef.current = null

    if (onlineRealtimeRef.current) {
      void onlineRealtimeRef.current.disconnect()
      onlineRealtimeRef.current = null
    }

    setOnlineSnapshot(null)
    setOnlineSessionId(null)
    setOnlineJoinSessionId('')
    setOnlineJoinCode('')
    setOnlineSubmitting(false)
    setOnlineLifecycleSubmitting(false)
    setOnlineInviteCode(null)
    setOnlineInviteExpiry(null)
  }, [])

  const handleStartOnlineMatch = useCallback(async (entryPoint: 'FAST_ONLINE' | 'MANUAL_MULTIPLAYER' = 'MANUAL_MULTIPLAYER') => {
    if (entryPoint === 'MANUAL_MULTIPLAYER') {
      trackUnifiedPlayEvent('play_start_clicked', {
        entryPoint,
      })
    }

    if (!multiplayerEligibility.eligible) {
      setOnlineError('Login is required before starting an online match.')
      setMatchStartStateTracked('ERROR', { reason: 'NOT_ELIGIBLE', entryPoint })
      trackUnifiedPlayEvent('match_start_error', {
        entryPoint,
        reason: 'NOT_ELIGIBLE',
      })
      return
    }

    try {
      setOnlineError(null)
      setOnlineStatusMessage('Finding match...')
      setMatchStartStateTracked('SEARCHING_PLAYERS', { entryPoint })

      const token = await getApiAccessToken()
      const response = await fetch('/api/matchmaking/queue', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await buildApiErrorMessage(response, 'Queue failed'))
      }

      const body = (await response.json()) as { sessionId: string }
      setOnlineSessionId(body.sessionId)
  setMatchStartStateTracked('MATCH_FOUND', { entryPoint, sessionId: body.sessionId })
      await connectOnlineSession(body.sessionId)
  setMatchStartStateTracked('SEAT_UPDATE', { entryPoint, sessionId: body.sessionId })

      const inviteToken = await getApiAccessToken()
      const inviteResponse = await fetch('/api/sessions/invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${inviteToken}`,
        },
        body: JSON.stringify({
          sessionId: body.sessionId,
        }),
      })

      if (inviteResponse.ok) {
        const inviteBody = (await inviteResponse.json()) as {
          code: string
          expiresAt?: string
        }
        setOnlineInviteCode(inviteBody.code)
        setOnlineInviteExpiry(inviteBody.expiresAt ?? null)
        setOnlineStatusMessage(`Invite code ready: ${inviteBody.code}`)
      }
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to start online match.')
      setOnlineStatusMessage(null)
      setMatchStartStateTracked('ERROR', { entryPoint })
      trackUnifiedPlayEvent('match_start_error', {
        entryPoint,
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      })
    }
  }, [
    connectOnlineSession,
    getApiAccessToken,
    multiplayerEligibility.eligible,
    setMatchStartStateTracked,
    trackUnifiedPlayEvent,
  ])

  const handleJoinOnlineMatch = useCallback(async () => {
    if (!multiplayerEligibility.eligible) {
      setOnlineError('Login is required before joining an online match.')
      return
    }

    const sessionId = onlineJoinSessionId.trim()
    if (!sessionId) {
      setOnlineError('Enter a session ID to join.')
      return
    }

    try {
      setOnlineError(null)
      setOnlineStatusMessage(`Joining session ${sessionId}...`)

      const token = await getApiAccessToken()
      const response = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error(await buildApiErrorMessage(response, 'Join failed'))
      }

      setOnlineSessionId(sessionId)
      await connectOnlineSession(sessionId)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to join session.')
      setOnlineStatusMessage(null)
    }
  }, [connectOnlineSession, getApiAccessToken, multiplayerEligibility.eligible, onlineJoinSessionId])

  const joinOnlineMatchByCode = useCallback(
    async (codeInput: string, options?: { navigateHome?: boolean }) => {
      if (!multiplayerEligibility.eligible) {
        setOnlineError('Login is required before joining an online match.')
        return false
      }

      const code = codeInput.trim().toLowerCase()
      if (!code) {
        setOnlineError('Enter an invite code to join.')
        return false
      }

      try {
        setOnlineError(null)
        setOnlineStatusMessage(`Joining with invite code ${code}...`)

        const token = await getApiAccessToken()
        const response = await fetch('/api/sessions/join-by-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code,
          }),
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Join by invite code failed'))
        }

        const body = (await response.json()) as { sessionId: string }
        setOnlineSessionId(body.sessionId)
        await connectOnlineSession(body.sessionId)

        if (options?.navigateHome) {
          navigate('/', { replace: true })
        }

        return true
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : 'Failed to join by invite code.')
        setOnlineStatusMessage(null)
        return false
      }
    },
    [connectOnlineSession, getApiAccessToken, multiplayerEligibility.eligible, navigate],
  )

  const handleCreateInviteCode = useCallback(async () => {
    if (!multiplayerEligibility.eligible) {
      setOnlineError('Login is required before creating invite codes.')
      return
    }

    if (!onlineSessionId) {
      setOnlineError('Start or join an online session before creating invite codes.')
      return
    }

    try {
      setOnlineError(null)
      setOnlineStatusMessage('Creating invite code...')

      const token = await getApiAccessToken()
      const response = await fetch('/api/sessions/invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: onlineSessionId,
        }),
      })

      if (!response.ok) {
        throw new Error(await buildApiErrorMessage(response, 'Invite code request failed'))
      }

      const body = (await response.json()) as {
        code: string
        expiresAt?: string
      }

      setOnlineInviteCode(body.code)
      setOnlineInviteExpiry(body.expiresAt ?? null)
      setOnlineStatusMessage(`Invite code ready: ${body.code}`)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to create invite code.')
      setOnlineStatusMessage(null)
    }
  }, [getApiAccessToken, multiplayerEligibility.eligible, onlineSessionId])

  const handleCopyInviteLink = useCallback(async () => {
    if (!onlineInviteCode || typeof navigator === 'undefined' || !navigator.clipboard) {
      setOnlineError('Create an invite code before copying an invite link.')
      return
    }

    const inviteUrl = `${window.location.origin}/join?code=${encodeURIComponent(onlineInviteCode)}`

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setOnlineError(null)
      setOnlineStatusMessage(`Invite link copied for code ${onlineInviteCode}.`)
    } catch {
      setOnlineError('Failed to copy invite link.')
    }
  }, [onlineInviteCode])

  const refreshSocialData = useCallback(async () => {
    if (!multiplayerEligibility.eligible) {
      return
    }

    try {
      setSocialLoading(true)
      const token = await getApiAccessToken()

      const [friendsResponse, invitesResponse, presenceResponse] = await Promise.all([
        fetch('/api/friends/list', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch('/api/sessions/party-invites', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch('/api/matchmaking/presence', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ])

      if (!friendsResponse.ok) {
        throw new Error(await buildApiErrorMessage(friendsResponse, 'Failed to load friends'))
      }

      if (!invitesResponse.ok) {
        throw new Error(await buildApiErrorMessage(invitesResponse, 'Failed to load party invites'))
      }

      const friendsBody = (await friendsResponse.json()) as {
        friends?: SocialUserEntry[]
        incomingRequests?: SocialUserEntry[]
        outgoingRequests?: SocialUserEntry[]
      }

      const invitesBody = (await invitesResponse.json()) as {
        received?: PartyInviteEntry[]
        sent?: PartyInviteEntry[]
      }

      if (presenceResponse.ok) {
        const presenceBody = (await presenceResponse.json()) as {
          presence?: PresenceSnapshotPayload
        }
        setPresenceSnapshot(presenceBody.presence ?? null)
        if (presenceBody.presence?.viewerVisibility) {
          setPresenceVisibility(presenceBody.presence.viewerVisibility)
        }
      } else {
        setPresenceSnapshot(null)
      }

      setFriends(friendsBody.friends ?? [])
      setIncomingFriendRequests(friendsBody.incomingRequests ?? [])
      setOutgoingFriendRequests(friendsBody.outgoingRequests ?? [])
      setReceivedPartyInvites(invitesBody.received ?? [])
      setSentPartyInvites(invitesBody.sent ?? [])
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to refresh social data.')
    } finally {
      setSocialLoading(false)
    }
  }, [getApiAccessToken, multiplayerEligibility.eligible])

  const handleModerationAction = useCallback(
    async (targetDisplayName: string, action: 'BLOCK' | 'MUTE' | 'REPORT') => {
      if (!multiplayerEligibility.eligible) {
        setOnlineError('Login is required before moderation actions.')
        return
      }

      try {
        setOnlineError(null)
        const token = await getApiAccessToken()
        const response = await fetch('/api/friends/moderate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetDisplayName,
            action,
          }),
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Moderation action failed'))
        }

        setOnlineStatusMessage(`${action} requested for ${targetDisplayName}.`)
        await refreshSocialData()
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : 'Moderation action failed.')
      }
    },
    [getApiAccessToken, multiplayerEligibility.eligible, refreshSocialData],
  )

  const handlePresenceVisibilityChange = useCallback(
    async (visibility: PresenceVisibility) => {
      if (!multiplayerEligibility.eligible) {
        setPresenceVisibility(visibility)
        return
      }

      try {
        const token = await getApiAccessToken()
        const response = await fetch('/api/profile/visibility', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ visibility }),
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Failed to update visibility'))
        }

        setPresenceVisibility(visibility)
        setOnlineError(null)
        setOnlineStatusMessage(`Presence visibility set to ${visibility}.`)
        await refreshSocialData()
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : 'Failed to update visibility.')
      }
    },
    [getApiAccessToken, multiplayerEligibility.eligible, refreshSocialData],
  )

  const handleSendFriendRequest = useCallback(async () => {
    if (!multiplayerEligibility.eligible) {
      setOnlineError('Login is required before managing friends.')
      return
    }

    const targetDisplayName = friendTargetDisplayName.trim()
    if (!targetDisplayName) {
      setOnlineError('Enter a display name to send a friend request.')
      return
    }

    try {
      setOnlineError(null)
      const token = await getApiAccessToken()
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetDisplayName,
        }),
      })

      if (!response.ok) {
        throw new Error(await buildApiErrorMessage(response, 'Friend request failed'))
      }

      setFriendTargetDisplayName('')
      setOnlineStatusMessage(`Friend request sent to ${targetDisplayName}.`)
      await refreshSocialData()
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to send friend request.')
    }
  }, [friendTargetDisplayName, getApiAccessToken, multiplayerEligibility.eligible, refreshSocialData])

  const handleRespondFriendRequest = useCallback(
    async (requesterUserId: string, requesterDisplayName: string, action: 'ACCEPT' | 'DECLINE' | 'BLOCK') => {
      if (!multiplayerEligibility.eligible) {
        setOnlineError('Login is required before managing friends.')
        return
      }

      try {
        setOnlineError(null)
        const token = await getApiAccessToken()
        const response = await fetch('/api/friends/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requesterUserId,
            action,
          }),
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Friend response failed'))
        }

        setOnlineStatusMessage(
          action === 'ACCEPT'
            ? `Friend request from ${requesterDisplayName} accepted.`
            : action === 'DECLINE'
              ? `Friend request from ${requesterDisplayName} declined.`
              : `${requesterDisplayName} blocked.`,
        )

        await refreshSocialData()
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : 'Failed to respond to friend request.')
      }
    },
    [getApiAccessToken, multiplayerEligibility.eligible, refreshSocialData],
  )

  const handleSendPartyInvite = useCallback(async () => {
    if (!multiplayerEligibility.eligible) {
      setOnlineError('Login is required before sending party invites.')
      return
    }

    if (!onlineSessionId) {
      setOnlineError('Start or join an online match before sending party invites.')
      return
    }

    const toDisplayName = partyInviteTargetDisplayName.trim()
    if (!toDisplayName) {
      setOnlineError('Select a friend to invite.')
      return
    }

    try {
      setOnlineError(null)
      const token = await getApiAccessToken()
      const response = await fetch('/api/sessions/party-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: onlineSessionId,
          toDisplayName,
        }),
      })

      if (!response.ok) {
        throw new Error(await buildApiErrorMessage(response, 'Party invite failed'))
      }

      setPartyInviteTargetDisplayName('')
      setOnlineStatusMessage(`Party invite sent to ${toDisplayName}.`)
      await refreshSocialData()
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to send party invite.')
    }
  }, [getApiAccessToken, multiplayerEligibility.eligible, onlineSessionId, partyInviteTargetDisplayName, refreshSocialData])

  const handleRespondPartyInvite = useCallback(
    async (inviteId: string, action: 'ACCEPT' | 'DECLINE') => {
      if (!multiplayerEligibility.eligible) {
        setOnlineError('Login is required before responding to party invites.')
        return
      }

      try {
        setOnlineError(null)
        const token = await getApiAccessToken()
        const response = await fetch('/api/sessions/party-invite/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inviteId,
            action,
          }),
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Party invite response failed'))
        }

        const body = (await response.json()) as { sessionId?: string }

        if (action === 'ACCEPT' && body.sessionId) {
          setOnlineSessionId(body.sessionId)
          await connectOnlineSession(body.sessionId)
          setOnlineStatusMessage('Party invite accepted. Connected to match.')
        } else {
          setOnlineStatusMessage('Party invite declined.')
        }

        await refreshSocialData()
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : 'Failed to respond to party invite.')
      }
    },
    [connectOnlineSession, getApiAccessToken, multiplayerEligibility.eligible, refreshSocialData],
  )

  useEffect(() => {
    if (pathname !== '/join') {
      return
    }

    const code = joinCodeFromQuery.trim().toLowerCase()

    if (!code) {
      setOnlineError('Invite link is missing code parameter.')
      return
    }

    if (!multiplayerEligibility.eligible || joinLinkProcessing) {
      return
    }

    if (joinLinkHandledRef.current === code) {
      return
    }

    joinLinkHandledRef.current = code

    void (async () => {
      setJoinLinkProcessing(true)
      try {
        await joinOnlineMatchByCode(code, { navigateHome: true })
      } finally {
        setJoinLinkProcessing(false)
      }
    })()
  }, [joinCodeFromQuery, joinLinkProcessing, joinOnlineMatchByCode, multiplayerEligibility.eligible, pathname])

  useEffect(() => {
    if (!multiplayerEligibility.eligible) {
      setFriends([])
      setIncomingFriendRequests([])
      setOutgoingFriendRequests([])
      setReceivedPartyInvites([])
      setSentPartyInvites([])
      setPresenceSnapshot(null)
      return
    }

    void refreshSocialData()
  }, [multiplayerEligibility.eligible, refreshSocialData])

  const refreshOnlineSnapshot = useCallback(async () => {
    if (!onlineRealtimeRef.current || !onlineSessionId) {
      return
    }

    try {
      await onlineRealtimeRef.current.refreshSnapshot()
      setOnlineError(null)
      setOnlineStatusMessage(`Connected to session ${onlineSessionId} (snapshot refreshed).`)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to refresh online session snapshot.')
    }
  }, [onlineSessionId])

  const handleCopySessionId = useCallback(async () => {
    if (!onlineSessionId || typeof navigator === 'undefined' || !navigator.clipboard) {
      setOnlineError('Clipboard is not available in this environment.')
      return
    }

    try {
      await navigator.clipboard.writeText(onlineSessionId)
      setOnlineError(null)
      setOnlineStatusMessage(`Session ID copied: ${onlineSessionId}`)
    } catch {
      setOnlineError('Failed to copy session ID.')
    }
  }, [onlineSessionId])

  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return 'ontouchstart' in window || window.navigator.maxTouchPoints > 0
  }, [])

  const dndBackend = isTouchDevice ? TouchBackend : HTML5Backend
  const dndBackendOptions = isTouchDevice
    ? {
        enableMouseEvents: true,
        delayTouchStart: 0,
        ignoreContextMenu: true,
      }
    : undefined

  useEffect(() => {
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current)
      celebrationTimerRef.current = null
    }

    if (!authoritativeState.winnerId || !winnerPlayer || winnerPlayer.isAI) {
      setShowHumanWinCelebration(false)
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })

    const celebrationStartDelay = prefersReducedMotion ? 0 : HUMAN_WIN_SCROLL_LEAD_MS
    celebrationTimerRef.current = window.setTimeout(() => {
      setShowHumanWinCelebration(true)

      const celebrationDuration = prefersReducedMotion ? HUMAN_WIN_REDUCED_MOTION_MS : HUMAN_WIN_CELEBRATION_MS
      celebrationTimerRef.current = window.setTimeout(() => {
        setShowHumanWinCelebration(false)
        celebrationTimerRef.current = null
      }, celebrationDuration)
    }, celebrationStartDelay)
  }, [authoritativeState.winnerId, winnerPlayer, prefersReducedMotion])

  const currentRound = useMemo(() => {
    const playerCount = Math.max(authoritativeState.players.length, 1)
    return Math.floor((authoritativeState.turn - 1) / playerCount) + 1
  }, [authoritativeState.players.length, authoritativeState.turn])

  const postGameNarrative = useMemo(
    () =>
      buildPostGameNarrative({
        players: authoritativeState.players,
        log: authoritativeState.log,
        winnerId: authoritativeState.winnerId,
        winnerReason: authoritativeState.winnerReason,
        turn: authoritativeState.turn,
      }),
    [
      authoritativeState.players,
      authoritativeState.log,
      authoritativeState.winnerId,
      authoritativeState.winnerReason,
      authoritativeState.turn,
    ],
  )

  const activeOpponents = useMemo(
    () =>
      authoritativeState.players.reduce<ActiveOpponent[]>((collected, player) => {
        if (!player.isAI || !player.aiCharacterSlug) {
          return collected
        }

        const character = findAICharacterBySlug(player.aiCharacterSlug)
        collected.push({
          id: player.id,
          shortName: player.name,
          slug: player.aiCharacterSlug,
          fullName: character?.fullName,
        })

        return collected
      }, []),
    [authoritativeState.players],
  )

  const turnResolutionRoundRecap = useMemo(() => {
    if (authoritativeState.turnResolutionHistory.length === 0) {
      return undefined
    }

    const focusPlayer =
      authoritativeState.players.find((player) => !player.isAI) ?? authoritativeState.players[0]
    const latestFocusTurnIndex =
      focusPlayer
        ? authoritativeState.turnResolutionHistory.findIndex(
            (snapshot) => snapshot.playerId === focusPlayer.id,
          )
        : -1

    const windowedSnapshots =
      latestFocusTurnIndex >= 0
        ? authoritativeState.turnResolutionHistory.slice(0, latestFocusTurnIndex + 1)
        : authoritativeState.turnResolutionHistory.slice(0, 1)

    const chronologicalSnapshots = [...windowedSnapshots].reverse()

    const lines = chronologicalSnapshots.map((snapshot) => {
      if (snapshot.skipped) {
        return `${snapshot.playerName} skipped turn (sabotage effect).`
      }

      const moveDelta = snapshot.position.after - snapshot.position.before
      const movedBy = Math.abs(moveDelta)
      const appliedSkips = snapshot.skips.appliedToTarget?.amount ?? 0
      const targetName = snapshot.skips.appliedToTarget?.targetName

      const claimPart =
        snapshot.totals.gainedMacGuffins > 0
          ? `claim +${snapshot.totals.gainedMacGuffins} MG`
          : snapshot.claim.landedPlanetId
            ? `claim no gain on P${snapshot.claim.landedPlanetId}`
            : 'claim no target'

      const sabotagePart =
        appliedSkips > 0
          ? `sabotage ${targetName ?? 'rival'} +${appliedSkips} skip`
          : snapshot.totals.sabotage > 0
            ? 'sabotage no impact'
            : 'sabotage none'

      const movePart =
        moveDelta > 0
          ? `move forward ${movedBy}`
          : moveDelta < 0
            ? `move backward ${movedBy}`
            : 'move no change'

      return `${snapshot.playerName}: ${movePart} (${snapshot.position.before}→${snapshot.position.after}), ${claimPart}, ${sabotagePart}.`
    })

    return lines.join(' ')
  }, [authoritativeState.players, authoritativeState.turnResolutionHistory])

  const latestHumanTurnResolution = useMemo(() => {
    const humanPlayer = authoritativeState.players.find((player) => !player.isAI)
    if (!humanPlayer) {
      return undefined
    }

    return authoritativeState.turnResolutionHistory.find(
      (snapshot) => snapshot.playerId === humanPlayer.id,
    )
  }, [authoritativeState.players, authoritativeState.turnResolutionHistory])

  const startResolutionFlow = useCallback((allocation?: Allocation) => {
    if (!state.started || state.winnerId || !currentPlayer || isResolving) {
      return
    }

    const isSkippedTurn = currentPlayer.skippedTurns > 0

    dispatch({
      type: 'START_TURN_RESOLUTION',
      payload: {
        stage: 'resolving',
        message: isSkippedTurn
          ? `${currentPlayer.name} is resolving post effects...`
          : `${currentPlayer.name} is resolving Move → Claim → Sabotage...`,
      },
    })

    setPlaybackStage(isSkippedTurn ? 'post' : 'move')

    clearResolutionTimers()

    const continueResolution = () => {
      if (allocation) {
        dispatch({ type: 'ALLOCATE_DICE', payload: allocation })
      }

      dispatch({ type: 'RESOLVE_TURN' })

      if (!isSkippedTurn) {
        resolutionTimersRef.current.push(
          window.setTimeout(() => {
            setPlaybackStage('claim')
          }, resolveStageDelay),
        )
        resolutionTimersRef.current.push(
          window.setTimeout(() => {
            setPlaybackStage('sabotage')
          }, resolveStageDelay * 2),
        )
        resolutionTimersRef.current.push(
          window.setTimeout(() => {
            setPlaybackStage('post')
          }, resolveStageDelay * 3),
        )
      }

      resolutionTimersRef.current.push(window.setTimeout(() => {
        const nextPlayer =
          state.players.length > 0
            ? state.players[(state.currentPlayerIndex + 1) % state.players.length]
            : undefined

        dispatch({ type: 'NEXT_PLAYER' })
        dispatch({ type: 'END_TURN_RESOLUTION' })
        setPlaybackStage('idle')

        if (!isOnlineMode && mode === 'single' && nextPlayer?.isAI && !singlePlayerAutoContinueAiTurns) {
          setSinglePlayerAiTurnGate(true)
        }

        resolutionTimersRef.current = []
      }, isSkippedTurn ? resolveStageDelay * 2 : resolveStageDelay * 4))
    }

    if (state.animationEnabled) {
      void preloadDiceAnimationAssets()
      setResolveAnimationVariant(isSkippedTurn ? 'skip' : 'rolling')
      setShowResolveAnimation(true)
      resolutionTimersRef.current.push(
        window.setTimeout(() => {
          setShowResolveAnimation(false)
          continueResolution()
        }, RESOLVE_ANIMATION_MS),
      )
      return
    }

    continueResolution()
  }, [
    state.started,
    state.winnerId,
    state.animationEnabled,
    state.currentPlayerIndex,
    state.players,
    currentPlayer,
    mode,
    isOnlineMode,
    singlePlayerAutoContinueAiTurns,
    isResolving,
    clearResolutionTimers,
    resolveStageDelay,
  ])

  useEffect(() => {
    if (isOnlineMode || mode !== 'single' || !state.started || state.winnerId || !currentPlayer?.isAI) {
      setSinglePlayerAiTurnGate(false)
    }
  }, [isOnlineMode, mode, state.started, state.winnerId, currentPlayer?.isAI])

  useEffect(() => {
    if (isOnlineMode || !state.started || state.winnerId || !currentPlayer?.isAI || isResolving || singlePlayerAiTurnGate) {
      return
    }

    const timer = window.setTimeout(() => {
      startResolutionFlow()
    }, aiThinkDelay)

    return () => window.clearTimeout(timer)
  }, [
    isOnlineMode,
    state.started,
    state.winnerId,
    currentPlayer?.id,
    currentPlayer?.isAI,
    isResolving,
    singlePlayerAiTurnGate,
    startResolutionFlow,
    aiThinkDelay,
  ])

  const handleStart = () => {
    if (mode === 'multiplayer') {
      return
    }

    if (mode === 'hotseat') {
      const parsed = hotseatNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, hotseatCount)

      const names = Array.from({ length: hotseatCount }, (_, index) => {
        return parsed[index] || `Captain ${index + 1}`
      })

      dispatch({
        type: 'INIT_GAME',
        payload: {
          mode,
          humanNames: names,
          aiCount: 0,
          difficulty,
          debugEnabled,
          animationEnabled,
        },
      })
      return
    }

    dispatch({
      type: 'INIT_GAME',
      payload: {
        mode,
        humanNames: [humanName.trim() || 'Captain'],
        aiCount,
        difficulty,
        debugEnabled,
        animationEnabled,
      },
    })
  }

  const handleStartInstantAdventure = useCallback(() => {
    const instantName = (profileDisplayName?.trim() || humanName.trim() || 'Captain')

    trackUnifiedPlayEvent('play_start_clicked', {
      entryPoint: 'INSTANT_ADVENTURE',
      aiCount: 2,
      difficulty: 'medium',
    })

    setQuickOnlineFlowActive(false)
    clearOnlineContextForOfflineStart()
    setMode('single')
    setDifficulty('medium')
    setAiCount(2)
    setOnlineError(null)
    setOnlineStatusMessage('Launching Instant Adventure...')
    setMatchStartStateTracked('ENTERED_MATCH', { entryPoint: 'INSTANT_ADVENTURE' })

    dispatch({
      type: 'INIT_GAME',
      payload: {
        mode: 'single',
        humanNames: [instantName],
        aiCount: 2,
        difficulty: 'medium',
        debugEnabled,
        animationEnabled,
      },
    })
    trackUnifiedPlayEvent('match_entered', {
      entryPoint: 'INSTANT_ADVENTURE',
      humanCount: 1,
      aiCount: 2,
    })
  }, [
    animationEnabled,
    clearOnlineContextForOfflineStart,
    debugEnabled,
    humanName,
    profileDisplayName,
    setMatchStartStateTracked,
    trackUnifiedPlayEvent,
  ])

  const handleStartQuickOnline = useCallback(async () => {
    trackUnifiedPlayEvent('play_start_clicked', {
      entryPoint: 'FAST_ONLINE',
    })

    setQuickOnlineFlowActive(true)
    setQuickOnlineRetryKey((value) => value + 1)
    setMode('multiplayer')
    setOnlineError(null)
    setOnlineStatusMessage('Finding a quick online match...')
    setMatchStartStateTracked('LOCKING_PLAN', { entryPoint: 'FAST_ONLINE' })
    await handleStartOnlineMatch('FAST_ONLINE')
  }, [handleStartOnlineMatch, setMatchStartStateTracked, trackUnifiedPlayEvent])

  const handlePlayWithFriendsEntry = useCallback(() => {
    trackUnifiedPlayEvent('play_start_clicked', {
      entryPoint: 'PLAY_WITH_FRIENDS',
    })

    setQuickOnlineFlowActive(false)
    setQuickOnlineRetryKey(0)
    setMode('multiplayer')
    setOnlineError(null)
    setOnlineStatusMessage('Use invite code or social panels below to play with friends.')
    setMatchStartStateTracked('IDLE')
  }, [setMatchStartStateTracked, trackUnifiedPlayEvent])

  const handleCustomSetupEntry = useCallback(() => {
    trackUnifiedPlayEvent('play_start_clicked', {
      entryPoint: 'CUSTOM_SETUP',
    })

    setQuickOnlineFlowActive(false)
    setQuickOnlineRetryKey(0)
    setOnlineError(null)
    setOnlineStatusMessage('Customize your match setup using the options below.')
    setMatchStartStateTracked('IDLE')
  }, [setMatchStartStateTracked, trackUnifiedPlayEvent])

  const handleKeepWaitingQuickOnline = useCallback(() => {
    setOnlineError(null)
    setOnlineStatusMessage('Continuing to search for players...')
    setMatchStartStateTracked('SEARCHING_PLAYERS', {
      entryPoint: 'FAST_ONLINE',
      reason: 'KEEP_WAITING',
    })
    setQuickOnlineRetryKey((value) => value + 1)
  }, [setMatchStartStateTracked])

  const handleStartWithAiFallback = useCallback(() => {
    trackUnifiedPlayEvent('auto_fill_triggered', {
      reason: 'user_choice',
      entryPoint: 'FAST_ONLINE',
      openSeatCount: 1,
    })

    setMatchStartStateTracked('AUTO_FILLING_AI', {
      entryPoint: 'FAST_ONLINE',
      reason: 'USER_CHOICE',
    })
    setOnlineStatusMessage('No full lobby yet—starting instantly with AI.')

    window.setTimeout(() => {
      setMatchStartStateTracked('STARTING', {
        entryPoint: 'FAST_ONLINE',
      })
      handleStartInstantAdventure()
    }, 220)
  }, [handleStartInstantAdventure, setMatchStartStateTracked, trackUnifiedPlayEvent])

  useEffect(() => {
    if (!quickOnlineFlowActive) {
      return
    }

    if (onlineSnapshot?.gameState.started) {
      return
    }

    if (
      matchStartState !== 'LOCKING_PLAN' &&
      matchStartState !== 'SEARCHING_PLAYERS' &&
      matchStartState !== 'SEAT_UPDATE'
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      const connectedHumanSeats = onlineSnapshot?.playerSeats.filter((seat) => !seat.isAI && seat.connected).length ?? 1
      const openSeatCount = Math.max(1, 2 - connectedHumanSeats)

      trackUnifiedPlayEvent('auto_fill_triggered', {
        reason: 'timeout',
        entryPoint: 'FAST_ONLINE',
        openSeatCount,
        sessionId: onlineSessionId ?? undefined,
      })

      setMatchStartStateTracked('WAITING_USER_DECISION', {
        entryPoint: 'FAST_ONLINE',
        timeoutMs: QUICK_ONLINE_AUTOFILL_TIMEOUT_MS,
        sessionId: onlineSessionId ?? undefined,
      })

      setOnlineStatusMessage('One seat still needs a player. Start with AI now or keep waiting.')
    }, QUICK_ONLINE_AUTOFILL_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [
    matchStartState,
    onlineSessionId,
    onlineSnapshot,
    quickOnlineFlowActive,
    quickOnlineRetryKey,
    setMatchStartStateTracked,
    trackUnifiedPlayEvent,
  ])

  useEffect(() => {
    if (!quickOnlineFlowActive || !onlineSessionId || !onlineSnapshot) {
      return
    }

    if (!onlineSnapshot.gameState.started) {
      setMatchStartStateTracked('SEAT_UPDATE', {
        sessionId: onlineSessionId,
        version: onlineSnapshot.version,
      })
      return
    }

    setMatchStartStateTracked('STARTING', {
      sessionId: onlineSessionId,
      version: onlineSnapshot.version,
    })

    const timer = window.setTimeout(() => {
      setMatchStartStateTracked('ENTERED_MATCH', {
        sessionId: onlineSessionId,
        version: onlineSnapshot.version,
      })
      trackUnifiedPlayEvent('match_entered', {
        entryPoint: 'FAST_ONLINE',
        sessionId: onlineSessionId,
        humanCount: onlineSnapshot.playerSeats.filter((seat) => !seat.isAI).length,
        aiCount: onlineSnapshot.playerSeats.filter((seat) => seat.isAI).length,
      })
    }, 220)

    return () => window.clearTimeout(timer)
  }, [onlineSessionId, onlineSnapshot, quickOnlineFlowActive, setMatchStartStateTracked, trackUnifiedPlayEvent])

  const handleEndTurn = () => {
    if (!currentPlayer || currentPlayer.isAI || isResolving) {
      return
    }

    if (isOnlineMode) {
      void (async () => {
        if (!onlineSessionId || !onlineSnapshot || !multiplayerIdentity || !isOnlineActivePlayer) {
          setOnlineError('You cannot submit a turn right now.')
          return
        }

        if (currentPlayer.skippedTurns <= 0 && !allDiceAllocated(draftAllocation)) {
          return
        }

        const allocationForIntent: Allocation =
          currentPlayer.skippedTurns > 0
            ? {
                move: [],
                claim: [],
                sabotage: [],
              }
            : draftAllocation

        try {
          setOnlineSubmitting(true)
          setOnlineError(null)

          const token = await getApiAccessToken()
          const response = await fetch('/api/sessions/turn-intent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sessionId: onlineSessionId,
              actorUserId: multiplayerIdentity.userId,
              actorPlayerId: currentPlayer.id,
              expectedVersion: onlineSnapshot.version,
              allocation: allocationForIntent,
              clientRequestId: crypto.randomUUID(),
              sentAt: new Date().toISOString(),
            }),
          })

          const raw = await response.text().catch(() => '')
          let ack: (TurnAck & { snapshot?: SessionSnapshot }) | null = null

          if (raw) {
            try {
              ack = JSON.parse(raw) as TurnAck & { snapshot?: SessionSnapshot }
            } catch {
              if (!response.ok) {
                throw new Error(`Turn intent failed (${response.status}): ${raw.slice(0, 120)}`)
              }

              throw new Error('Turn intent endpoint returned non-JSON response.')
            }
          }

          if (!response.ok || !ack?.accepted) {
            const reason = ack?.reason ?? `Turn intent failed (${response.status})`
            setOnlineError(reason)

            if (ack?.reason === 'STALE_VERSION' || ack?.reason === 'NOT_YOUR_TURN') {
              await refreshOnlineSnapshot()
            }

            return
          }

          if (ack?.snapshot) {
            setOnlineSnapshot(ack.snapshot)
          }

          setDraftAllocation(emptyAllocation())
        } catch (error) {
          setOnlineError(error instanceof Error ? error.message : 'Failed to submit turn intent.')
        } finally {
          setOnlineSubmitting(false)
        }
      })()

      return
    }

    if (currentPlayer.skippedTurns > 0) {
      startResolutionFlow()
      return
    }

    if (!allDiceAllocated(draftAllocation)) {
      return
    }

    startResolutionFlow(draftAllocation)
  }

  const callOnlineLifecycleAction = useCallback(
    async (action: 'RESIGN' | 'LEAVE' | 'REMATCH') => {
      const sessionId = onlineSessionId
      if (!sessionId || !multiplayerIdentity) {
        setOnlineError('You are not connected to an online session.')
        return
      }

      const endpoint =
        action === 'RESIGN'
          ? '/api/sessions/resign'
          : action === 'LEAVE'
            ? '/api/sessions/leave'
            : '/api/sessions/rematch'

      try {
        setOnlineLifecycleSubmitting(true)
        setOnlineError(null)

        const token = await getApiAccessToken()
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId,
            clientRequestId: crypto.randomUUID(),
            ...(action === 'REMATCH' && unifiedPlayFeatureFlags.hybridRematchReplacementV1
              ? {
                  seatPlan: hybridSlotPlan,
                }
              : {}),
          }),
        })

        const raw = await response.text().catch(() => '')
        let ack: SessionLifecycleAck | null = null

        if (raw) {
          try {
            ack = JSON.parse(raw) as SessionLifecycleAck
          } catch {
            if (!response.ok) {
              throw new Error(`${action} failed (${response.status}): ${raw.slice(0, 120)}`)
            }

            throw new Error(`${action} endpoint returned non-JSON response.`)
          }
        }

        if (!response.ok || !ack?.accepted) {
          if (ack?.reason === 'REMATCH_SEAT_LOCKED') {
            setOnlineError('Cannot start rematch: one or more Human-only seats are not connected.')
          } else if (ack?.reason === 'REMATCH_INVALID_PLAN') {
            setOnlineError('Rematch seat plan is invalid. Refresh and try again.')
          } else {
            setOnlineError(ack?.reason ?? `${action} failed (${response.status}).`)
          }
          if (response.status === 409 || response.status === 403) {
            await refreshOnlineSnapshot()
          }
          return
        }

        if (action === 'LEAVE') {
          await detachOnlineSession()
          setOnlineStatusMessage('You left the online match.')
          dispatch({ type: 'NEW_GAME' })
          return
        }

        if (ack.snapshot) {
          setOnlineSnapshot(ack.snapshot)
        }

        if (action === 'RESIGN') {
          setOnlineStatusMessage('You resigned the current game.')
        } else {
          setOnlineStatusMessage('Rematch started.')
          setShowDebrief(false)
          setShowHumanWinCelebration(false)
          setDraftAllocation(emptyAllocation())
        }
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : `${action} failed.`)
      } finally {
        setOnlineLifecycleSubmitting(false)
      }
    },
    [
      detachOnlineSession,
      getApiAccessToken,
      hybridSlotPlan,
      multiplayerIdentity,
      onlineSessionId,
      refreshOnlineSnapshot,
      unifiedPlayFeatureFlags.hybridRematchReplacementV1,
    ],
  )

  const handleResign = useCallback(() => {
    if (!window.confirm('Resign this online game? This will immediately end the current game.')) {
      return
    }

    void callOnlineLifecycleAction('RESIGN')
  }, [callOnlineLifecycleAction])

  const handleLeaveMatch = useCallback(() => {
    if (!window.confirm('Leave this online match and return home?')) {
      return
    }

    void callOnlineLifecycleAction('LEAVE')
  }, [callOnlineLifecycleAction])

  const handlePlayAgain = useCallback(() => {
    void callOnlineLifecycleAction('REMATCH')
  }, [callOnlineLifecycleAction])

  const handleAllocatePreferred = () => {
    if (
      !currentPlayer ||
      currentPlayer.isAI ||
      currentPlayer.skippedTurns > 0 ||
      authoritativeState.winnerId ||
      isResolving
    ) {
      return
    }

    const preferred = currentPlayer.dicePool.reduce<Allocation>((next, die) => {
      if (die.color === 'blue') {
        next.move.push(die.id)
        return next
      }

      if (die.color === 'green') {
        next.claim.push(die.id)
        return next
      }

      next.sabotage.push(die.id)
      return next
    }, emptyAllocation())

    setDraftAllocation(preferred)
  }

  const handleNewGame = () => {
    clearResolutionTimers()
    setPlaybackStage('idle')
    setShowResolveAnimation(false)
    setResolveAnimationVariant('rolling')
    setShowDebrief(false)
    setOnlineError(null)
    setOnlineStatusMessage(null)
    onlineSessionGuardRef.current = null
    setOnlineSnapshot(null)
    setOnlineSessionId(null)
    setOnlineJoinSessionId('')
    setOnlineJoinCode('')
    setOnlineSubmitting(false)
    setOnlineLifecycleSubmitting(false)
    setOnlineInviteCode(null)
    setOnlineInviteExpiry(null)
    setQuickOnlineFlowActive(false)
    setMatchStartStateTracked('IDLE')

    if (onlineRealtimeRef.current) {
      void onlineRealtimeRef.current.disconnect()
      onlineRealtimeRef.current = null
    }

    dispatch({ type: 'NEW_GAME' })
  }

  const matchStartStateCopy: Partial<Record<MatchStartState, { title: string; detail: string }>> = {
    LOCKING_PLAN: {
      title: 'Preparing your match...',
      detail: 'Saving your seat plan and checking availability.',
    },
    SEARCHING_PLAYERS: {
      title: 'Finding players...',
      detail: 'We will auto-fill AI if needed to keep startup fast.',
    },
    SEAT_UPDATE: {
      title: 'Seats updating',
      detail: 'Players are joining your match now.',
    },
    MATCH_FOUND: {
      title: 'Match found!',
      detail: 'Finalizing seats and loading game.',
    },
    AUTO_FILLING_AI: {
      title: 'No problem—adding AI captains',
      detail: 'Missing seats are being filled so you can start now.',
    },
    WAITING_USER_DECISION: {
      title: 'One seat still needs a player',
      detail: 'Choose to keep waiting or launch with AI.',
    },
    STARTING: {
      title: 'Launching match...',
      detail: 'Syncing final session state.',
    },
    ENTERED_MATCH: {
      title: 'Connected',
      detail: 'You are in the match.',
    },
    ERROR: {
      title: 'Could not start match',
      detail: 'Check your connection and try again.',
    },
  }

  const handleDownloadDebugLog = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      winnerId: authoritativeState.winnerId,
      winnerReason: authoritativeState.winnerReason,
      players: authoritativeState.players,
      turn: authoritativeState.turn,
      debugLog: authoritativeState.debugLog,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dice-odysseys-debug-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (pathname === '/join') {
    const inviteCode = joinCodeFromQuery.trim().toLowerCase()

    return (
      <div className="flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-6">
          <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
            <h1 className="text-2xl font-bold text-cyan-200">Join Match</h1>
            <p className="mt-2 text-sm text-slate-300">Use your invite link to join an online match.</p>

            <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
              <p>
                Invite code: <span className="font-semibold text-cyan-200">{inviteCode || 'Missing code'}</span>
              </p>
            </div>

            {!multiplayerEligibility.eligible ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-300">Log in to continue with this invite.</p>
                <button
                  type="button"
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100"
                  onClick={() => {
                    void loginWithRedirect({
                      authorizationParams: {
                        redirect_uri: window.location.href,
                      },
                    })
                  }}
                  disabled={isAuthLoading}
                >
                  {isAuthLoading ? 'Checking auth…' : 'Log in to Join'}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  onClick={() => {
                    void joinOnlineMatchByCode(inviteCode, { navigateHome: true })
                  }}
                  disabled={!inviteCode || joinLinkProcessing}
                >
                  {joinLinkProcessing ? 'Joining…' : 'Join Match'}
                </button>
              </div>
            )}

            {(onlineStatusMessage || onlineError) && (
              <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs">
                {onlineStatusMessage ? <p className="text-cyan-200">{onlineStatusMessage}</p> : null}
                {onlineError ? <p className="mt-1 text-rose-300">{onlineError}</p> : null}
              </div>
            )}
          </section>
        </main>
        <AppFooter />
      </div>
    )
  }

  if (pathname === '/profile') {
    return (
      <div className="flex min-h-screen flex-col">
        <ProfilePage
          animationEnabled={animationEnabled}
          onAnimationEnabledChange={setAnimationEnabled}
        />
        <AppFooter />
      </div>
    )
  }

  if (pathname === '/about') {
    return (
      <div className="flex min-h-screen flex-col">
        <AboutPage />
        <AppFooter />
      </div>
    )
  }

  if (pathname === '/opponents') {
    return (
      <div className="flex min-h-screen flex-col">
        <OpponentsPage />
        <AppFooter />
      </div>
    )
  }

  if (pathname === '/contact') {
    return (
      <div className="flex min-h-screen flex-col">
        <ContactPage />
        <AppFooter />
      </div>
    )
  }

  if (opponentBioSlug) {
    return (
      <div className="flex min-h-screen flex-col">
        <OpponentBioPage slug={opponentBioSlug} />
        <AppFooter />
      </div>
    )
  }

  if (pathname !== '/') {
    return <Navigate to="/" replace />
  }

  if (!authoritativeState.started) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center p-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odysseys logo"
                className="h-20 w-20 rounded-md border border-slate-700 object-cover"
              />
              <div className="flex flex-col">
                <h1 className="text-[2.1rem] font-bold text-cyan-200">Dice Odysseys</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/opponents"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                Opponents
              </Link>
              <Link
                to="/about"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                About
              </Link>
              <Link
                to="/profile"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                Profile
              </Link>
            </div>
          </div>

          <div className="relative mt-4">
            <img
              src="/assets/branding/hero-banner.png"
              alt="Dice Odysseys hero banner"
              className="h-auto w-full rounded-xl border border-slate-700 object-cover"
            />
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-slate-950/70 px-3 py-1 text-center text-base text-slate-100 backdrop-blur-sm">
              A dice-powered race for cosmic MacGuffins.
            </p>
          </div>

          {unifiedPlayFeatureFlags.unifiedPlayV1 && (
            <section className="mt-6 rounded-xl border border-cyan-500/50 bg-cyan-950/20 p-4">
            <h2 className="text-lg font-semibold text-cyan-100">Choose your next mission</h2>
            <p className="mt-1 text-sm text-cyan-50/90">Start instantly with AI, or jump online in seconds.</p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <button
                type="button"
                className="rounded-lg border border-cyan-300/70 bg-cyan-900/30 px-4 py-3 text-left text-cyan-50"
                onClick={handleStartInstantAdventure}
              >
                <p className="text-sm font-semibold">Instant Adventure</p>
                <p className="mt-1 text-xs text-cyan-100/90">Start now vs AI rivals. No waiting.</p>
              </button>

              <button
                type="button"
                className="rounded-lg border border-emerald-300/70 bg-emerald-900/30 px-4 py-3 text-left text-emerald-50 disabled:opacity-50"
                onClick={handleStartQuickOnline}
                disabled={!multiplayerEligibility.eligible || isOnlineMode}
              >
                <p className="text-sm font-semibold">Quick Online Match</p>
                <p className="mt-1 text-xs text-emerald-100/90">Find players fast. Auto-fill AI if needed.</p>
              </button>

              <button
                type="button"
                className="rounded-lg border border-slate-400/70 bg-slate-900/60 px-4 py-3 text-left text-slate-100"
                onClick={handlePlayWithFriendsEntry}
              >
                <p className="text-sm font-semibold">Play With Friends</p>
                <p className="mt-1 text-xs text-slate-300">Invite by code or pick friends.</p>
              </button>

              <button
                type="button"
                className="rounded-lg border border-slate-400/70 bg-slate-900/60 px-4 py-3 text-left text-slate-100"
                onClick={handleCustomSetupEntry}
              >
                <p className="text-sm font-semibold">Custom Setup</p>
                <p className="mt-1 text-xs text-slate-300">Choose every opponent and slot.</p>
              </button>
            </div>

            {!multiplayerEligibility.eligible && (
              <p className="mt-2 text-xs text-slate-300">Log in on Profile to enable online quick match and friend play.</p>
            )}
            </section>
          )}

          <div className="mt-6 grid gap-3 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-slate-200">
              Mode
              <select
                className="rounded-md border border-slate-600 bg-slate-900 p-2"
                value={mode}
                onChange={(event) => setMode(event.target.value as GameMode)}
              >
                <option value="single">Single Player</option>
                <option value="hotseat">Hotseat Multiplayer</option>
                <option value="multiplayer">Multiplayer</option>
              </select>
            </label>

            {mode === 'single' && (
              <>
                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  AI Difficulty
                  <select
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  Your Name
                  <input
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={humanName}
                    onChange={(event) => setHumanName(event.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  AI Opponents
                  <select
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={aiCount}
                    onChange={(event) => setAiCount(Number(event.target.value))}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
              </>
            )}

            {mode === 'hotseat' && (
              <>
                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  Players
                  <select
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={hotseatCount}
                    onChange={(event) => setHotseatCount(Number(event.target.value))}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-200 md:col-span-2">
                  Player Names (comma-separated)
                  <input
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={hotseatNames}
                    onChange={(event) => setHotseatNames(event.target.value)}
                    placeholder="Capt1, Capt2"
                  />
                </label>
              </>
            )}

          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
            {mode === 'multiplayer' && !isAuthenticated && (
              <Link
                to="/profile"
                className="rounded-md border border-cyan-400 bg-cyan-900/30 px-4 py-2 text-sm font-semibold text-cyan-100"
              >
                Log In for Multiplayer mode
              </Link>
            )}

            {mode !== 'multiplayer' && (
              <button
                type="button"
                className="rounded-md bg-cyan-500 px-5 py-2 font-semibold text-slate-950 lg:whitespace-nowrap"
                onClick={handleStart}
                disabled={isOnlineMode}
              >
                Start Game
              </button>
            )}

            {mode === 'multiplayer' && (
              <>
                <button
                  type="button"
                  className="rounded-md border border-cyan-400 bg-cyan-900/30 px-5 py-2 font-semibold text-cyan-100 lg:whitespace-nowrap disabled:opacity-50"
                  onClick={() => {
                    void handleStartOnlineMatch()
                  }}
                  disabled={!multiplayerEligibility.eligible || isOnlineMode}
                >
                  Start Online Match
                </button>

                <div className="flex w-full items-center gap-2 lg:max-w-sm">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                    value={onlineJoinCode}
                    onChange={(event) => setOnlineJoinCode(event.target.value)}
                    placeholder="Invite code (e.g. roll1)"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void joinOnlineMatchByCode(onlineJoinCode)
                    }}
                    disabled={!multiplayerEligibility.eligible}
                  >
                    Join Code
                  </button>
                </div>
              </>
            )}
          </div>

          {mode === 'multiplayer' && unifiedPlayFeatureFlags.hybridRematchReplacementV1 && (
            <section className="mt-3 space-y-2 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-cyan-100">Hybrid slot planner (MVP)</p>
                <p className="text-[11px] text-slate-300">{hybridSlotSummary}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {hybridSlotPlan.map((slotMode, index) => (
                  <label key={`hybrid-slot-${index + 1}`} className="flex flex-col gap-1 rounded border border-slate-700 bg-slate-950/40 p-2">
                    <span className="text-[11px] text-slate-300">Seat {index + 1}</span>
                    <select
                      className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                      value={slotMode}
                      onChange={(event) => handleHybridSlotModeChange(index, event.target.value as HybridSeatMode)}
                    >
                      <option value="auto">Auto</option>
                      <option value="human">Human only</option>
                      <option value="ai">AI only</option>
                    </select>
                  </label>
                ))}
              </div>

              <p className="text-[11px] text-slate-400">
                Planner is active for UI flow now; seat enforcement lands with rematch lobby wiring.
              </p>
            </section>
          )}

          {mode === 'multiplayer' && multiplayerEligibility.eligible && unifiedPlayFeatureFlags.presenceDirectoryV1 && (
            <section className="mt-3 space-y-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950/50 px-2 py-1.5">
                <p className="text-[11px] text-slate-300">Presence visibility</p>
                <select
                  className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                  value={presenceVisibility}
                  onChange={(event) => {
                    void handlePresenceVisibilityChange(event.target.value as PresenceVisibility)
                  }}
                >
                  <option value="discoverable">Discoverable</option>
                  <option value="friends-only">Friends-only discoverable</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded border border-slate-700 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Players online now</p>
                  <p className="mt-0.5 text-sm font-semibold text-cyan-100">{playersOnlineNowCount}</p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Players searching</p>
                  <p className="mt-0.5 text-sm font-semibold text-cyan-100">{playersSearchingNowCount}</p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Estimated wait</p>
                  <p className="mt-0.5 text-sm font-semibold text-cyan-100">{estimatedWaitLabel}</p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Region</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-cyan-100">{matchmakingRegionLabel}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 rounded border border-slate-700 bg-slate-950/40 p-2">
                  <p className="font-semibold text-cyan-200">Available now</p>
                  {availableNowPlayers.length > 0 ? (
                    availableNowPlayers.map((seat) => (
                      <div key={`available-${seat.userId}`} className="space-y-1 rounded border border-slate-700 px-1.5 py-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{seat.displayName}</span>
                          <button
                            type="button"
                            className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50"
                            onClick={() => {
                              setPartyInviteTargetDisplayName(seat.displayName)
                              setOnlineStatusMessage(`Selected ${seat.displayName} for invite.`)
                            }}
                            disabled={!onlineSessionId}
                          >
                            Invite
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px]"
                            onClick={() => {
                              void handleModerationAction(seat.displayName, 'BLOCK')
                            }}
                          >
                            Block
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px]"
                            onClick={() => {
                              void handleModerationAction(seat.displayName, 'MUTE')
                            }}
                          >
                            Mute
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px]"
                            onClick={() => {
                              void handleModerationAction(seat.displayName, 'REPORT')
                            }}
                          >
                            Report
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400">No available players right now.</p>
                  )}
                </div>

                <div className="space-y-1 rounded border border-slate-700 bg-slate-950/40 p-2">
                  <p className="font-semibold text-cyan-200">Friends online</p>
                  {friendsOnlineEntries.map((entry) => (
                    <div key={`friend-online-${entry.userId}`} className="space-y-1 rounded border border-slate-700 px-1.5 py-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{entry.displayName}</span>
                        <button
                          type="button"
                          className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50"
                          onClick={() => {
                            setPartyInviteTargetDisplayName(entry.displayName)
                            setOnlineStatusMessage(`Selected ${entry.displayName} for invite.`)
                          }}
                          disabled={!onlineSessionId}
                        >
                          Invite
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px]"
                          onClick={() => {
                            void handleModerationAction(entry.displayName, 'BLOCK')
                          }}
                        >
                          Block
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px]"
                          onClick={() => {
                            void handleModerationAction(entry.displayName, 'MUTE')
                          }}
                        >
                          Mute
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px]"
                          onClick={() => {
                            void handleModerationAction(entry.displayName, 'REPORT')
                          }}
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  ))}
                  {friendsOnlineEntries.length === 0 && <p className="text-[11px] text-slate-400">No friends available yet.</p>}
                </div>

                <div className="space-y-1 rounded border border-slate-700 bg-slate-950/40 p-2">
                  <p className="font-semibold text-cyan-200">Join next game</p>
                  {joinNextGameEntries.map((invite) => (
                      <div key={`join-next-${invite.id}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">{invite.fromDisplayName ?? 'Unknown'} lobby</span>
                        <button
                          type="button"
                          className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold"
                          onClick={() => {
                            void handleRespondPartyInvite(invite.id, 'ACCEPT')
                          }}
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  {joinNextGameEntries.length === 0 && (
                    <p className="text-[11px] text-slate-400">No rematch lobby invites right now.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {mode === 'multiplayer' && (onlineStatusMessage || onlineError || onlineSessionId || matchStartState !== 'IDLE') && (
            <div className="mt-3 space-y-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200">
              {matchStartState !== 'IDLE' && matchStartStateCopy[matchStartState] && (
                <div className="rounded-md border border-cyan-400/40 bg-cyan-900/20 px-2 py-1.5">
                  <p className="font-semibold text-cyan-100">{matchStartStateCopy[matchStartState]?.title}</p>
                  <p className="mt-0.5 text-cyan-200/90">{matchStartStateCopy[matchStartState]?.detail}</p>
                </div>
              )}
              {quickOnlineFlowActive && matchStartState === 'WAITING_USER_DECISION' && (
                <div className="flex flex-wrap gap-2">
                  {unifiedPlayFeatureFlags.hybridRematchReplacementV1 && (
                    <button
                      type="button"
                      className="rounded-md border border-cyan-300 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                      onClick={handleStartWithAiFallback}
                    >
                      Start with AI now
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100"
                    onClick={handleKeepWaitingQuickOnline}
                  >
                    Keep waiting
                  </button>
                </div>
              )}
              {onlineSessionId && (
                <div className="flex flex-wrap items-center gap-2">
                  {debugEnabled && <p>Online session: {onlineSessionId}</p>}
                  {debugEnabled && (
                    <button
                      type="button"
                      className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100"
                      onClick={() => {
                        void handleCopySessionId()
                      }}
                    >
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void refreshOnlineSnapshot()
                    }}
                    disabled={!onlineSessionId}
                  >
                    Refresh Snapshot
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void handleCreateInviteCode()
                    }}
                    disabled={!onlineSessionId || !multiplayerEligibility.eligible}
                  >
                    Create Invite Code
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void handleCopyInviteLink()
                    }}
                    disabled={!onlineInviteCode}
                  >
                    Copy Invite Link
                  </button>
                </div>
              )}
              {onlineInviteCode && (
                <p>
                  Invite code: <span className="font-semibold text-cyan-200">{onlineInviteCode}</span>
                  {onlineInviteExpiry ? ` (expires ${new Date(onlineInviteExpiry).toLocaleTimeString()})` : ''}
                </p>
              )}
              {onlineStatusMessage && (
                <p
                  className={
                    isOnlineStatusWarning
                      ? 'rounded-md border border-amber-400/70 bg-amber-900/30 px-2 py-1 font-semibold text-amber-100'
                      : 'text-cyan-200'
                  }
                  role="status"
                  aria-live="polite"
                >
                  {onlineStatusMessage}
                </p>
              )}
              {onlineError && <p className="text-rose-300">{onlineError}</p>}
            </div>
          )}

          {mode === 'multiplayer' && multiplayerEligibility.eligible && (
            <div className="mt-3 grid gap-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-cyan-200">Friends</p>
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void refreshSocialData()
                    }}
                    disabled={socialLoading}
                  >
                    {socialLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 p-2 text-xs"
                    value={friendTargetDisplayName}
                    onChange={(event) => setFriendTargetDisplayName(event.target.value)}
                    placeholder="Friend display name"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100"
                    onClick={() => {
                      void handleSendFriendRequest()
                    }}
                  >
                    Add
                  </button>
                </div>

                <p className="text-[11px] text-slate-300">
                  Friends: {friends.length} • Incoming: {incomingFriendRequests.length} • Outgoing: {outgoingFriendRequests.length}
                </p>

                <div className="space-y-1">
                  {incomingFriendRequests.slice(0, 3).map((entry) => (
                    <div key={`incoming-${entry.userId}`} className="flex items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1">
                      <span>{entry.displayName}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold"
                          onClick={() => {
                            void handleRespondFriendRequest(entry.userId, entry.displayName, 'ACCEPT')
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold"
                          onClick={() => {
                            void handleRespondFriendRequest(entry.userId, entry.displayName, 'DECLINE')
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-cyan-200">Party Invites</p>
                <div className="flex gap-2">
                  <select
                    className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 p-2 text-xs"
                    value={partyInviteTargetDisplayName}
                    onChange={(event) => setPartyInviteTargetDisplayName(event.target.value)}
                  >
                    <option value="">Select friend…</option>
                    {friends.map((entry) => (
                      <option key={entry.userId} value={entry.displayName}>
                        {entry.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void handleSendPartyInvite()
                    }}
                    disabled={!onlineSessionId}
                  >
                    Invite
                  </button>
                </div>

                <p className="text-[11px] text-slate-300">
                  Received: {receivedPartyInvites.length} • Sent: {sentPartyInvites.length}
                </p>

                <div className="space-y-1">
                  {receivedPartyInvites
                    .filter((invite) => invite.status === 'pending')
                    .slice(0, 3)
                    .map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1">
                        <span>{invite.fromDisplayName ?? 'Unknown'} invited you</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold"
                            onClick={() => {
                              void handleRespondPartyInvite(invite.id, 'ACCEPT')
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-500 px-2 py-0.5 text-[10px] font-semibold"
                            onClick={() => {
                              void handleRespondPartyInvite(invite.id, 'DECLINE')
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-200">What</h2>
              <p className="mt-1 text-xs text-slate-300">
                Dice Odysseys is a turn-based space race. Move across planets, claim MacGuffins,
                and disrupt rivals before the galaxy collapses.
              </p>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-200">How</h2>
              <p className="mt-1 text-xs text-slate-300">
                Assign all dice to Move, Claim, or Sabotage. Any color can go anywhere.
                Matching color to slot gets +1 roll value; off-color gets -1.
              </p>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-200">Win</h2>
              <p className="mt-1 text-xs text-slate-300">
                Reach 7 MacGuffins first for race victory. If the galaxy runs out, survival winner
                is highest MacGuffins.
              </p>
            </article>
          </div>

          {mode === 'multiplayer' && SHOW_DEBUG_CONTROLS && (
            <section className="mt-4 space-y-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">Temporary Debug (remove later)</p>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex w-full items-center gap-2 lg:max-w-sm">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                    value={onlineJoinSessionId}
                    onChange={(event) => setOnlineJoinSessionId(event.target.value)}
                    placeholder="Advanced (debug): Session ID"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
                    onClick={() => {
                      void handleJoinOnlineMatch()
                    }}
                    disabled={!multiplayerEligibility.eligible}
                  >
                    Join ID (debug)
                  </button>
                </div>

                <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200 lg:w-fit">
                  <input
                    type="checkbox"
                    checked={debugEnabled}
                    onChange={(event) => setDebugEnabled(event.target.checked)}
                  />
                  Enable logging
                </label>
              </div>
            </section>
          )}
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DndProvider backend={dndBackend} options={dndBackendOptions}>
        {showHumanWinCelebration && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0">
              {!prefersReducedMotion &&
                humanWinConfetti.map((particle, index) => (
                  <span
                    key={`${particle.left}-${particle.delay}-${index}`}
                    className={`human-win-confetti ${particle.colorClass}`}
                    style={{
                      left: `${particle.left}%`,
                      animationDelay: `${particle.delay}ms`,
                      animationDuration: `${particle.duration}ms`,
                    }}
                  />
                ))}
            </div>
            <div className="absolute left-1/2 top-24 h-40 w-40 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute left-1/2 top-20 h-52 w-52 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="absolute left-1/2 top-10 -translate-x-1/2 rounded-full border border-cyan-300/60 bg-slate-900/80 px-5 py-2 text-sm font-semibold text-cyan-100 human-win-banner">
              Human Victory!
            </div>
          </div>
        )}
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/branding/dice-odyssey-logo.png"
              alt="Dice Odysseys logo"
              className="h-14 w-14 rounded-md border border-slate-700 object-cover"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-cyan-200">Dice Odysseys</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 pr-1 text-sm text-slate-300 md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap">
                <span className="shrink-0">Round {currentRound} · Turn {authoritativeState.turn} · Current:</span>
                <span className="shrink-0 rounded border border-cyan-300/70 bg-cyan-900/40 px-1.5 py-0.5 font-semibold text-cyan-100">
                  {currentPlayer?.name ?? '—'}
                </span>
                {activeOpponents.length > 0 && (
                  <>
                    <span className="mx-0.5 hidden shrink-0 text-slate-500 md:inline">·</span>
                    <span className="shrink-0 text-slate-300">Opponents:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeOpponents.map((opponent) => (
                        <Link
                          key={opponent.id}
                          to={`/opponents/${opponent.slug}`}
                          state={{ fromGame: true }}
                          className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-600 bg-slate-900/60 px-1.5 py-0.5 text-xs text-slate-100 hover:border-slate-500"
                        >
                          <span>{opponent.shortName}</span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      to="/opponents"
                      state={{ fromGame: true }}
                      className="shrink-0 text-xs text-cyan-300 hover:text-cyan-200 md:ml-1"
                    >
                      View all
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 md:self-end md:pt-0">
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
              onClick={() => setHelpOpen((value) => !value)}
            >
              {helpOpen ? 'Hide Help & Tips' : 'Show Help & Tips'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
              onClick={isOnlineMode ? handleLeaveMatch : handleNewGame}
              disabled={onlineLifecycleSubmitting}
            >
              {isOnlineMode ? 'Leave Match' : 'New Game'}
            </button>
          </div>
        </header>

        {(onlineStatusMessage || onlineError || onlineSessionId) && (
          <section className="space-y-1 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
            {onlineSessionId && debugEnabled && <p>Online session: {onlineSessionId}</p>}
            {onlineStatusMessage && (
              <p
                className={
                  isOnlineStatusWarning
                    ? 'rounded-md border border-amber-400/70 bg-amber-900/30 px-2 py-1 font-semibold text-amber-100'
                    : 'text-cyan-200'
                }
                role="status"
                aria-live="polite"
              >
                {onlineStatusMessage}
              </p>
            )}
            {onlineError && <p className="text-rose-300">{onlineError}</p>}
            {isOnlineMode && !authoritativeState.winnerId && (
              <div className="pt-1">
                <button
                  type="button"
                  className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50"
                  onClick={handleResign}
                  disabled={onlineLifecycleSubmitting || onlineSubmitting || !isOnlineActivePlayer}
                >
                  Resign
                </button>
              </div>
            )}
          </section>
        )}

        {isOnlineMode && onlineSnapshot && !authoritativeState.winnerId && (
          <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
            <p className="font-semibold text-cyan-200">Match Seats</p>
            <ul className="mt-2 space-y-2">
              {onlineSnapshot.playerSeats.map((seat) => (
                <li key={`${seat.userId}-${seat.seat}`} className="flex items-center gap-2">
                  <img
                    src={getPlayerAvatarSrc(seat.avatarKey)}
                    alt={`${seat.displayName} avatar`}
                    className="h-7 w-7 rounded border border-slate-600 object-cover"
                    onError={withAvatarFallback}
                  />
                  <span>{seat.displayName}</span>
                  <span className="text-xs text-slate-400">— {seat.connected ? 'Connected' : 'Disconnected'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {authoritativeState.winnerId && (
          <section className="space-y-3 rounded-xl border border-emerald-400 bg-emerald-900/30 p-4 text-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                Winner: {winnerName} ({authoritativeState.winnerReason === 'race' ? 'Race Victory' : 'Survival Victory'})
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-100"
                  onClick={() => setShowDebrief((value) => !value)}
                >
                  {showDebrief ? 'Hide Story' : 'Show Story'}
                </button>
                {isOnlineMode && (
                  <>
                    <button
                      type="button"
                      className="rounded border border-cyan-300 px-2 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50"
                      onClick={handlePlayAgain}
                      disabled={onlineLifecycleSubmitting || onlineSubmitting}
                    >
                      Play Again
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-100 disabled:opacity-50"
                      onClick={handleLeaveMatch}
                      disabled={onlineLifecycleSubmitting || onlineSubmitting}
                    >
                      Leave Match
                    </button>
                  </>
                )}
              </div>
            </div>

            {isOnlineMode && onlineSnapshot && (
              <div className="rounded-lg border border-emerald-500/40 bg-slate-950/30 p-3 text-xs text-emerald-50">
                <p className="font-semibold text-emerald-200">Between Games</p>
                <p className="mt-1">Choose <span className="font-semibold">Play Again</span> to start a rematch in this same match, or <span className="font-semibold">Leave Match</span> to return home.</p>
                {unifiedPlayFeatureFlags.hybridRematchReplacementV1 && (
                  <p className="mt-1 text-emerald-200/90">
                    Rematch uses the Hybrid Slot Planner. Human-only seats must be connected before rematch starts.
                  </p>
                )}
                <p className="mt-2 text-emerald-200">Seat readiness:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {onlineSnapshot.playerSeats.map((seat) => (
                    <li key={`${seat.userId}-${seat.seat}`} className="flex items-center gap-2">
                      <img
                        src={getPlayerAvatarSrc(seat.avatarKey)}
                        alt={`${seat.displayName} avatar`}
                        className="h-6 w-6 rounded border border-emerald-400/70 object-cover"
                        onError={withAvatarFallback}
                      />
                      <span>
                        {seat.displayName} — {seat.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {winnerPlayer && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-100">
                <span>Winner MacGuffins:</span>
                <img
                  src={MACGUFFIN_TOKEN_ICON}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 rounded object-cover"
                />
                <span className="font-semibold">{winnerPlayer.macGuffins}</span>
              </p>
            )}

            {showDebrief && (
              <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-slate-950/40 p-3 text-sm text-emerald-50">
                <p className="font-semibold text-emerald-200">Post-Game Debrief</p>
                <p>{postGameNarrative.headline}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-emerald-200">Key Moments</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {postGameNarrative.keyMoments.map((moment) => (
                        <li key={moment}>{moment}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-200">Stats</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {postGameNarrative.stats.map((stat) => (
                        <li key={stat}>{stat}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="font-semibold text-emerald-200">Why This Winner</p>
                <p>{postGameNarrative.whyWinner}</p>
              </div>
            )}
          </section>
        )}

        {helpOpen && (
          <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Help & Tips</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Turn Flow</p>
                <img
                  src="/assets/infographics/turn-flow-infographic.png"
                  alt="Turn flow infographic: Allocate 6 dice, Resolve Turn, Resolve Move then Claim then Sabotage"
                  className="mt-2 w-full rounded border border-slate-700 object-cover"
                />
                <p className="mt-1">1) Allocate all 6 dice. 2) Press Resolve Turn. 3) Watch Move, Claim, then Sabotage outcomes in Turn Resolution using color affinity (+1 match, -1 off-color, min 1).</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Board Reading</p>
                <p className="mt-1">Unknown icon/? means unrevealed. Landing reveals that planet’s face and state (Barren or MacGuffin-rich). Claim dice only test your landed planet: rolls at or above face count as successes. Face 3 awards +1, face 4 awards +2, face 5 awards +3, and face 6 awards +4 MacGuffins. Perfect Claim bonus: if all claim dice succeed, that planet reward is doubled (cap +8). Claimed means that reward was already harvested. If you start on the last planet and it is already claimed, Move sends you backward by your move total.</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Key Rules</p>
                <p className="mt-1">Sabotage targets nearest rival within 2 spaces. Skip turns = sabotage total minus defense (minimum 0), capped at 3. After a forced skip, that player gets temporary skip-immunity until their next playable turn.</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Pacing + UI Colors</p>
                <p className="mt-1">Galaxy shrinks every 5 turns by 2 planets. Cyan marks active captain; emerald marks winner. Dice colors are affinities: blue favors move, green favors claim, red favors sabotage.</p>
              </div>
            </div>
          </section>
        )}

        <div className={isResolving ? 'pointer-events-none opacity-95' : ''}>
          <GalaxyBoard
            galaxy={authoritativeState.galaxy}
            players={authoritativeState.players}
            currentPlayerId={currentPlayer?.id}
            resolving={isResolving}
            playbackStage={playbackStage}
            resolutionSummary={authoritativeState.latestTurnResolution}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {currentPlayer && !authoritativeState.winnerId && currentPlayer.skippedTurns === 0 && (
              <DicePool
                dicePool={currentPlayer.dicePool}
                allocation={draftAllocation}
                disabled={
                  currentPlayer.isAI || isResolving || (isOnlineMode && !isOnlineActivePlayer)
                }
                showHelpTips={helpOpen}
                onAllocationChange={setDraftAllocation}
                onAllocatePreferred={handleAllocatePreferred}
              />
            )}
            {currentPlayer && !authoritativeState.winnerId && currentPlayer.skippedTurns > 0 && !currentPlayer.isAI && (
              <section className="rounded-xl border border-amber-400 bg-amber-900/20 p-4 text-amber-100">
                <h2 className="text-lg font-semibold">Turn Skipped</h2>
                <p className="mt-1 text-sm">
                  {currentPlayer.name} must skip this turn. Click Resolve Turn to continue.
                </p>
              </section>
            )}
            <TurnControls
              canSubmit={
                Boolean(currentPlayer?.skippedTurns && currentPlayer.skippedTurns > 0) ||
                allDiceAllocated(draftAllocation)
              }
              disabled={
                Boolean(authoritativeState.winnerId) ||
                (isOnlineMode && (!isOnlineActivePlayer || onlineSubmitting))
              }
              isAI={Boolean(currentPlayer?.isAI) && !authoritativeState.winnerId}
              currentAiName={currentPlayer?.isAI ? currentPlayer.name : undefined}
              resolving={isResolving}
              resolvingLabel={resolvingMessage}
              showAiTurnGate={
                !isOnlineMode &&
                mode === 'single' &&
                Boolean(currentPlayer?.isAI) &&
                singlePlayerAiTurnGate &&
                !isResolving &&
                !authoritativeState.winnerId
              }
              showAiAutoPlayToggle={
                !isOnlineMode &&
                mode === 'single' &&
                authoritativeState.started &&
                !authoritativeState.winnerId
              }
              autoPlayAiTurns={singlePlayerAutoContinueAiTurns}
              onAutoPlayAiTurnsChange={setSinglePlayerAutoContinueAiTurns}
              onContinueAiTurn={() => setSinglePlayerAiTurnGate(false)}
              onSubmit={handleEndTurn}
              onReset={() => setDraftAllocation(emptyAllocation())}
            />
          </div>
          <PlayerStatus
            players={authoritativeState.players}
            currentPlayerId={currentPlayer?.id}
            playerAvatarKeyByPlayerId={isOnlineMode ? onlineHumanAvatarByPlayerId : undefined}
            showHelpTips={helpOpen}
          />
        </div>

        {turnResolutionRoundRecap && (
          <section className="rounded-xl border border-cyan-400/50 bg-cyan-900/20 p-4 text-cyan-50">
            <h2 className="text-lg font-semibold text-cyan-100">Round Recap</h2>
            <p className="mt-2 text-xs leading-relaxed text-cyan-50">{turnResolutionRoundRecap}</p>
          </section>
        )}

        <TurnResolution
          summary={authoritativeState.latestTurnResolution}
          humanSummary={latestHumanTurnResolution}
          resolving={isResolving}
          playbackStage={playbackStage}
        />

        <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="mb-2 flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Turn Log</h2>
            <p className="text-xs text-slate-400 lg:max-w-4xl lg:text-right">Read newest entries at top. Badges show round, turn, acting player, and event type. Each card is one resolved turn. Multiple lines in a card are outcomes from that same turn.</p>
          </div>
          <TurnLog log={authoritativeState.log} players={authoritativeState.players} />
        </section>

        {authoritativeState.debugEnabled && (
          <section className="rounded-xl border border-fuchsia-500/60 bg-fuchsia-950/10 p-4 text-fuchsia-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Debug Log</h2>
              <button
                type="button"
                className="rounded border border-fuchsia-300 px-2 py-1 text-xs font-semibold"
                onClick={handleDownloadDebugLog}
                disabled={authoritativeState.debugLog.length === 0}
              >
                Download JSON
              </button>
            </div>
            <p className="mt-1 text-xs text-fuchsia-200">
              Debug logging is enabled. Export this JSON after a game and share it for move-by-move analysis.
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold">Preview latest debug entries</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-fuchsia-500/30 bg-slate-950/80 p-3 text-xs text-fuchsia-100">
{JSON.stringify(authoritativeState.debugLog.slice(-5), null, 2)}
              </pre>
            </details>
          </section>
        )}
        </div>

        <ResolveDiceAnimation
          active={showResolveAnimation}
          playerName={currentPlayer?.name}
          variant={resolveAnimationVariant}
          prefersReducedMotion={prefersReducedMotion}
        />
      </DndProvider>
      <AppFooter />
    </div>
  )
}

export default App
