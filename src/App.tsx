import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type SyntheticEvent } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { Link, Navigate, useLocation } from 'react-router-dom'
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
import { FAQ_ITEMS, FaqPage } from './pages/FaqPage'
import { LegalPage } from './pages/LegalPage'
import { OpponentBioPage } from './pages/OpponentBioPage'
import { OpponentsPage } from './pages/OpponentsPage'
import { ProfilePage } from './pages/ProfilePage'
import { emptyAllocation, gameReducer, initialGameState } from './reducers/gameReducer'
import type { Allocation, Difficulty, GameMode, GameState, TurnResolutionPlaybackStage } from './types'
import { AI_CHARACTERS, findAICharacterBySlug, OPPONENT_THUMBNAIL_FALLBACK_SRC } from './data/aiCharacters'
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
const AI_THINK_DELAY_MS = 600
const RESOLVE_STAGE_DELAY_MS = 240
const REDUCED_MOTION_STAGE_DELAY_MS = 80
const REDUCED_MOTION_AI_DELAY_MS = 200
const RESOLVE_ANIMATION_MS = 2000
const MACGUFFIN_TOKEN_ICON = '/assets/ui/icon-macguffin-token.png'

const HUMAN_WIN_CELEBRATION_MS = 4200
const HUMAN_WIN_REDUCED_MOTION_MS = 2400
const HUMAN_WIN_SCROLL_LEAD_MS = 260
const ONLINE_PRIMARY_WAIT_TIMEOUT_MS = 60000
const ONLINE_DECISION_WAIT_TIMEOUT_MS = 60000
const SHOW_DEBUG_CONTROLS = /^(1|true)$/i.test(import.meta.env.VITE_SHOW_DEBUG_CONTROLS ?? '')
const SITE_ORIGIN = 'https://diceodysseys.com'
const DEFAULT_SOCIAL_IMAGE_PATH = '/assets/branding/dice-odyssey-logo.png'

interface SeoMeta {
  title: string
  description: string
  path: string
  robots?: string
  imagePath?: string
}

const upsertMetaTag = (attribute: 'name' | 'property', key: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

const upsertCanonicalLink = (href: string) => {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }

  canonical.setAttribute('href', href)
}

const upsertJsonLdScript = (id: string, payload: Record<string, unknown> | null) => {
  const selector = `script[type="application/ld+json"][data-seo-id="${id}"]`
  let script = document.head.querySelector<HTMLScriptElement>(selector)

  if (!payload) {
    script?.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.seoId = id
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify(payload)
}

const buildAbsoluteUrl = (path: string): string => `${SITE_ORIGIN}${path === '/' ? '' : path}`

const buildAbsoluteImageUrl = (path?: string): string => {
  const imagePath = path ?? DEFAULT_SOCIAL_IMAGE_PATH
  return imagePath.startsWith('http') ? imagePath : `${SITE_ORIGIN}${imagePath}`
}

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

const homeTestimonials = [
  {
    quote: 'Fast turns, meaningful choices, and just enough chaos to stay exciting.',
    author: 'William H.',
  },
  {
    quote: 'The mix of movement, claims, and sabotage makes every match feel different.',
    author: 'Alexa R.',
  },
  {
    quote: 'Easy to learn, hard to master. Great for quick solo sessions and rematches.',
    author: 'Beany S.',
  },
]

type ResolveAnimationVariant = 'rolling' | 'skip'
type HomeStartMode = 'INSTANT' | 'HOTSEAT' | 'ONLINE'
type OnlineWaitState = 'IDLE' | 'WAITING_PRIMARY' | 'WAITING_DECISION'
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

interface PresenceDirectoryEntry {
  userId: string
  displayName: string
  avatarKey?: string
  status?: 'Available' | 'In Lobby' | 'In Match'
  sessionId?: string
}

interface PresenceSnapshotPayload {
  availableNow?: PresenceDirectoryEntry[]
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

const withOpponentThumbnailFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget
  if (image.src.endsWith(OPPONENT_THUMBNAIL_FALLBACK_SRC)) {
    return
  }

  image.src = OPPONENT_THUMBNAIL_FALLBACK_SRC
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
    getAccessTokenSilently,
  } = useAuth0()
  const location = useLocation()
  const pathname = getNormalizedPathname(location.pathname)
  const opponentBioSlug = getOpponentBioSlug(pathname)
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [mode, setMode] = useState<GameMode>(() => getStoredHomeMode())
  const [homeStartMode, setHomeStartMode] = useState<HomeStartMode>('INSTANT')
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
  const [homeModeHint, setHomeModeHint] = useState<string | null>(null)
  const [matchStartState, setMatchStartState] = useState<MatchStartState>('IDLE')
  const [quickOnlineFlowActive, setQuickOnlineFlowActive] = useState(false)
  const [onlineWaitState, setOnlineWaitState] = useState<OnlineWaitState>('IDLE')
  const [onlinePrimaryTimerExpiresAt, setOnlinePrimaryTimerExpiresAt] = useState<number | null>(null)
  const [onlineDecisionTimerExpiresAt, setOnlineDecisionTimerExpiresAt] = useState<number | null>(null)
  const [onlineSubmitting, setOnlineSubmitting] = useState(false)
  const [onlineLifecycleSubmitting, setOnlineLifecycleSubmitting] = useState(false)
  const [hybridSlotPlan] = useState<HybridSeatMode[]>(['auto', 'auto', 'auto'])
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
  const onlineLobbyBootstrappingRef = useRef(false)
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
    const opponentCharacter = opponentBioSlug ? findAICharacterBySlug(opponentBioSlug) : undefined

    const seo: SeoMeta = (() => {
      if (pathname === '/about') {
        return {
          title: 'About Dice Odysseys | Rules, Strategy, and Game Overview',
          description:
            'Learn how Dice Odysseys works, explore core mechanics, and discover strategy tips for move, claim, and sabotage gameplay.',
          path: '/about',
        }
      }

      if (pathname === '/opponents') {
        return {
          title: 'Opponents | Dice Odysseys',
          description:
            'Meet the legendary rival captains in Dice Odysseys and learn their play styles, strengths, and tactical pressure patterns.',
          path: '/opponents',
        }
      }

      if (pathname === '/contact') {
        return {
          title: 'Contact | Dice Odysseys',
          description:
            'Contact the Dice Odysseys team for questions, support, feedback, and partnership inquiries.',
          path: '/contact',
        }
      }

      if (pathname === '/faq') {
        return {
          title: 'FAQ | Dice Odysseys',
          description:
            'Get quick answers to common Dice Odysseys questions, including gameplay, online matches, and tech stack details.',
          path: '/faq',
        }
      }

      if (pathname === '/legal') {
        return {
          title: 'Legal | Dice Odysseys',
          description:
            'Read the Dice Odysseys legal policies including Privacy Policy, Terms of Service, Cookie Policy, and DMCA information.',
          path: '/legal',
        }
      }

      if (pathname === '/profile') {
        return {
          title: 'Profile | Dice Odysseys',
          description: 'Manage your Dice Odysseys player profile settings and preferences.',
          path: '/profile',
          robots: 'noindex,nofollow',
        }
      }

      if (opponentBioSlug) {
        if (!opponentCharacter) {
          return {
            title: 'Opponent Not Found | Dice Odysseys',
            description: 'The requested opponent profile could not be found in Dice Odysseys.',
            path: '/opponents',
            robots: 'noindex,nofollow',
          }
        }

        return {
          title: `${opponentCharacter.fullName} | Opponent Bio | Dice Odysseys`,
          description: opponentCharacter.longDescription,
          path: `/opponents/${opponentCharacter.slug}`,
          imagePath: opponentCharacter.thumbnailSrc,
        }
      }

      return {
        title: 'Dice Odysseys | Turn-Based Strategy Dice Game',
        description:
          'Dice Odysseys is a turn-based strategy game where you allocate dice to move, claim rewards, and sabotage rivals in solo and online multiplayer matches.',
        path: '/',
      }
    })()

    const canonicalUrl = buildAbsoluteUrl(seo.path)
    const socialImage = buildAbsoluteImageUrl(seo.imagePath)
    const robots = seo.robots ?? 'index,follow'

    document.title = seo.title

    upsertMetaTag('name', 'description', seo.description)
    upsertMetaTag('name', 'robots', robots)
    upsertCanonicalLink(canonicalUrl)

    upsertMetaTag('property', 'og:type', 'website')
    upsertMetaTag('property', 'og:site_name', 'Dice Odysseys')
    upsertMetaTag('property', 'og:title', seo.title)
    upsertMetaTag('property', 'og:description', seo.description)
    upsertMetaTag('property', 'og:url', canonicalUrl)
    upsertMetaTag('property', 'og:image', socialImage)

    upsertMetaTag('name', 'twitter:card', 'summary_large_image')
    upsertMetaTag('name', 'twitter:title', seo.title)
    upsertMetaTag('name', 'twitter:description', seo.description)
    upsertMetaTag('name', 'twitter:image', socialImage)

    upsertJsonLdScript('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Dice Odysseys',
      url: SITE_ORIGIN,
      description:
        'Dice Odysseys is a turn-based strategy game where you allocate dice to move, claim rewards, and sabotage rivals in solo and online multiplayer matches.',
      publisher: {
        '@type': 'Organization',
        name: 'AI Sure Tech',
        url: 'https://aisuretech.com/',
      },
      inLanguage: 'en',
    })

    upsertJsonLdScript(
      'videogame',
      pathname === '/'
        ? {
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: 'Dice Odysseys',
            url: SITE_ORIGIN,
            image: socialImage,
            description: seo.description,
            genre: ['Strategy', 'Turn-based Strategy'],
            gamePlatform: ['Web Browser'],
            operatingSystem: 'Any',
            applicationCategory: 'Game',
            publisher: {
              '@type': 'Organization',
              name: 'AI Sure Tech',
              url: 'https://aisuretech.com/',
            },
            inLanguage: 'en',
          }
        : null,
    )

    upsertJsonLdScript(
      'faqpage',
      pathname === '/faq'
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }
        : null,
    )

    const breadcrumbEntries: Array<{ name: string; path: string }> = (() => {
      if (pathname === '/about') {
        return [
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]
      }

      if (pathname === '/opponents') {
        return [
          { name: 'Home', path: '/' },
          { name: 'Opponents', path: '/opponents' },
        ]
      }

      if (pathname === '/contact') {
        return [
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]
      }

      if (pathname === '/faq') {
        return [
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]
      }

      if (pathname === '/legal') {
        return [
          { name: 'Home', path: '/' },
          { name: 'Legal', path: '/legal' },
        ]
      }

      if (opponentBioSlug && opponentCharacter) {
        return [
          { name: 'Home', path: '/' },
          { name: 'Opponents', path: '/opponents' },
          { name: opponentCharacter.fullName, path: `/opponents/${opponentCharacter.slug}` },
        ]
      }

      if (pathname === '/') {
        return [{ name: 'Home', path: '/' }]
      }

      return []
    })()

    upsertJsonLdScript(
      'breadcrumbs',
      breadcrumbEntries.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbEntries.map((entry, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: entry.name,
              item: buildAbsoluteUrl(entry.path),
            })),
          }
        : null,
    )
  }, [pathname, opponentBioSlug])

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
    setMode('single')
  }, [])

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
  const isWaitingForPlayersMessage = Boolean(
    onlineStatusMessage && onlineStatusMessage.toLowerCase().includes('waiting for players'),
  )

  const availableNowPlayers = useMemo(
    () => {
      if (presenceSnapshot?.availableNow?.length) {
        const uniquePlayers = new Map<string, (typeof presenceSnapshot.availableNow)[number]>()

        for (const entry of presenceSnapshot.availableNow) {
          if (!entry.userId) {
            continue
          }

          if (entry.status === 'In Match' || !entry.sessionId) {
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
        avatarKey?: string
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
              avatarKey: seat.avatarKey ?? undefined,
              status: seat.connected ? 'Available' : 'In Match',
              sessionId: onlineSessionId ?? undefined,
            })
          }
        })

      return Array.from(uniqueByUserId.values()).slice(0, 3)
    },
    [multiplayerIdentity?.userId, onlineSessionId, onlineSnapshot, presenceSnapshot],
  )


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
    setOnlineSubmitting(false)
    setOnlineLifecycleSubmitting(false)
    setQuickOnlineFlowActive(false)
    setOnlineWaitState('IDLE')
    setOnlinePrimaryTimerExpiresAt(null)
    setOnlineDecisionTimerExpiresAt(null)
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
    setOnlineSubmitting(false)
    setOnlineLifecycleSubmitting(false)
    setOnlineWaitState('IDLE')
    setOnlinePrimaryTimerExpiresAt(null)
    setOnlineDecisionTimerExpiresAt(null)
  }, [])

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

  const refreshPresenceData = useCallback(async () => {
    if (!multiplayerEligibility.eligible) {
      return
    }

    try {
      const token = await getApiAccessToken()

      const presenceResponse = await fetch('/api/matchmaking/presence', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })

      if (presenceResponse.ok) {
        const presenceBody = (await presenceResponse.json()) as {
          presence?: PresenceSnapshotPayload
        }
        setPresenceSnapshot(presenceBody.presence ?? null)
      } else {
        setPresenceSnapshot(null)
      }
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : 'Failed to refresh online presence.')
    }
  }, [getApiAccessToken, multiplayerEligibility.eligible])


  useEffect(() => {
    if (!multiplayerEligibility.eligible) {
      setPresenceSnapshot(null)
      return
    }

    void refreshPresenceData()
  }, [multiplayerEligibility.eligible, refreshPresenceData])

  useEffect(() => {
    if (homeStartMode !== 'ONLINE' || !multiplayerEligibility.eligible) {
      return
    }

    void refreshPresenceData()

    const interval = window.setInterval(() => {
      void refreshPresenceData()
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [homeStartMode, multiplayerEligibility.eligible, refreshPresenceData])

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

  const featuredHomeOpponent = useMemo(() => {
    if (AI_CHARACTERS.length === 0) {
      return undefined
    }

    const randomIndex = Math.floor(Math.random() * AI_CHARACTERS.length)
    return AI_CHARACTERS[randomIndex]
  }, [])

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

  const handleStartInstantAdventure = useCallback((options?: { aiCount?: number; selectedAiSlug?: string }) => {
    const localAiCount = options?.aiCount ?? 2
    const instantName = (profileDisplayName?.trim() || humanName.trim() || 'Captain')

    trackUnifiedPlayEvent('play_start_clicked', {
      entryPoint: 'INSTANT_ADVENTURE',
      aiCount: localAiCount,
      difficulty: 'medium',
    })

    setQuickOnlineFlowActive(false)
    setHomeStartMode('INSTANT')
    clearOnlineContextForOfflineStart()
    setMode('single')
    setDifficulty('medium')
    setAiCount(localAiCount)
    setOnlineError(null)
    setOnlineStatusMessage('Launching Instant Adventure...')
    setMatchStartStateTracked('ENTERED_MATCH', { entryPoint: 'INSTANT_ADVENTURE' })

    dispatch({
      type: 'INIT_GAME',
      payload: {
        mode: 'single',
        humanNames: [instantName],
        aiCount: localAiCount,
        selectedAiSlugs: options?.selectedAiSlug ? [options.selectedAiSlug] : undefined,
        difficulty: 'medium',
        debugEnabled,
        animationEnabled,
      },
    })
    trackUnifiedPlayEvent('match_entered', {
      entryPoint: 'INSTANT_ADVENTURE',
      humanCount: 1,
      aiCount: localAiCount,
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

  const leaveCurrentLobbySessionIfNeeded = useCallback(async () => {
    if (!onlineSessionId) {
      return
    }

    if (onlineSnapshot?.gameState.started) {
      return
    }

    try {
      const token = await getApiAccessToken()
      await fetch('/api/sessions/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: onlineSessionId,
          clientRequestId: crypto.randomUUID(),
        }),
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('[online] best-effort lobby leave failed', error)
      }
    } finally {
      await detachOnlineSession()
      void refreshPresenceData()
    }
  }, [detachOnlineSession, getApiAccessToken, onlineSessionId, onlineSnapshot?.gameState.started, refreshPresenceData])

  const handleStartOnlineAiMatch = useCallback(
    async (aiSlug: string) => {
      const aiCharacter = findAICharacterBySlug(aiSlug)
      const aiLabel = aiCharacter?.shortName ?? 'AI Rival'

      trackUnifiedPlayEvent('online_target_selected', {
        targetType: 'ai',
        targetId: aiSlug,
      })

      setOnlineError(null)
      setOnlineStatusMessage(`Starting ${aiLabel} adventure...`)
      setHomeStartMode('INSTANT')
      setMatchStartStateTracked('STARTING', {
        entryPoint: 'FAST_ONLINE',
        targetType: 'ai',
      })

      await leaveCurrentLobbySessionIfNeeded()
      handleStartInstantAdventure({
        aiCount: 1,
        selectedAiSlug: aiSlug,
      })
    },
    [handleStartInstantAdventure, leaveCurrentLobbySessionIfNeeded, setMatchStartStateTracked, trackUnifiedPlayEvent],
  )

  const handleSelectHomeStartMode = useCallback(
    (nextMode: HomeStartMode) => {
      if (nextMode === 'ONLINE' && !multiplayerEligibility.eligible) {
        setHomeModeHint('Log in to play Online Match against other users.')
        return
      }

      setHomeModeHint(null)

      if (nextMode !== 'ONLINE') {
        clearOnlineContextForOfflineStart()
      }

      setHomeStartMode(nextMode)
      setOnlineError(null)

      if (nextMode === 'INSTANT') {
        setMode('single')
        setQuickOnlineFlowActive(false)
        setMatchStartStateTracked('IDLE')
        setOnlineStatusMessage('Configure your AI adventure, then click Start Game.')
        return
      }

      if (nextMode === 'HOTSEAT') {
        setMode('hotseat')
        setQuickOnlineFlowActive(false)
        setMatchStartStateTracked('IDLE')
        setOnlineStatusMessage('Set local players, then click Start Game.')
        return
      }

      setMode('multiplayer')
      setQuickOnlineFlowActive(false)
      setMatchStartStateTracked('IDLE')
      setOnlineStatusMessage('Choose from waiting humans or AI opponents, then start matchmaking.')
    },
    [clearOnlineContextForOfflineStart, multiplayerEligibility.eligible, setMatchStartStateTracked],
  )

  const handleKeepWaitingQuickOnline = useCallback(() => {
    trackUnifiedPlayEvent('online_wait_keep_waiting_clicked')
    setOnlineError(null)
    setOnlineStatusMessage('Continuing to wait for a player...')
    setOnlineWaitState('WAITING_PRIMARY')
    setOnlinePrimaryTimerExpiresAt(Date.now() + ONLINE_PRIMARY_WAIT_TIMEOUT_MS)
    setOnlineDecisionTimerExpiresAt(null)
    setMatchStartStateTracked('SEARCHING_PLAYERS', {
      entryPoint: 'FAST_ONLINE',
      reason: 'KEEP_WAITING',
    })
  }, [setMatchStartStateTracked, trackUnifiedPlayEvent])

  const handleStartWithAiFallback = useCallback(() => {
    trackUnifiedPlayEvent('online_wait_instant_adventure_clicked')

    setOnlineWaitState('IDLE')
    setOnlinePrimaryTimerExpiresAt(null)
    setOnlineDecisionTimerExpiresAt(null)
    setOnlineStatusMessage('Switching to Instant Adventure setup...')

    void (async () => {
      await leaveCurrentLobbySessionIfNeeded()
      handleSelectHomeStartMode('INSTANT')
    })()
  }, [handleSelectHomeStartMode, leaveCurrentLobbySessionIfNeeded, trackUnifiedPlayEvent])

  const handleSelectWaitingHuman = useCallback(
    async (seat: PresenceDirectoryEntry) => {
      if (!seat.sessionId) {
        setOnlineError(`Could not join ${seat.displayName}: session unavailable.`)
        return
      }

      setOnlineJoinSessionId(seat.sessionId)
      trackUnifiedPlayEvent('online_target_selected', {
        targetType: 'human',
        targetId: seat.userId,
        sessionId: seat.sessionId,
      })
      setOnlineWaitState('IDLE')
      setOnlinePrimaryTimerExpiresAt(null)
      setOnlineDecisionTimerExpiresAt(null)
      setOnlineStatusMessage(`Joining ${seat.displayName}...`)

      if (!multiplayerEligibility.eligible) {
        setOnlineError('Login is required before joining an online match.')
        return
      }

      try {
        setOnlineError(null)

        if (onlineSessionId && onlineSessionId !== seat.sessionId) {
          await leaveCurrentLobbySessionIfNeeded()
        }

        const token = await getApiAccessToken()
        const response = await fetch('/api/sessions/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: seat.sessionId,
          }),
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Join failed'))
        }

        setOnlineSessionId(seat.sessionId)
        await connectOnlineSession(seat.sessionId)
        setMatchStartStateTracked('ENTERED_MATCH', {
          entryPoint: 'FAST_ONLINE',
          targetType: 'human',
          sessionId: seat.sessionId,
        })
        trackUnifiedPlayEvent('online_match_started', {
          targetType: 'human',
          sessionId: seat.sessionId,
        })
      } catch (error) {
        setOnlineError(error instanceof Error ? error.message : 'Failed to join selected player.')
        setOnlineStatusMessage(null)
      }
    },
    [
      connectOnlineSession,
      getApiAccessToken,
      leaveCurrentLobbySessionIfNeeded,
      multiplayerEligibility.eligible,
      onlineSessionId,
      setMatchStartStateTracked,
      trackUnifiedPlayEvent,
    ],
  )

  useEffect(() => {
    if (homeStartMode !== 'ONLINE' || !multiplayerEligibility.eligible) {
      return
    }

    if (isOnlineMode || onlineLobbyBootstrappingRef.current) {
      return
    }

    let cancelled = false
    onlineLobbyBootstrappingRef.current = true

    void (async () => {
      try {
        const token = await getApiAccessToken()
        const response = await fetch('/api/matchmaking/queue', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(await buildApiErrorMessage(response, 'Failed to enter waiting lobby'))
        }

        const body = (await response.json()) as { sessionId: string }
        if (cancelled) {
          return
        }

        setOnlineSessionId(body.sessionId)
        await connectOnlineSession(body.sessionId)

        if (!cancelled) {
          setOnlineError(null)
          setOnlineStatusMessage('You are now visible in Waiting humans.')
          void refreshPresenceData()
        }
      } catch (error) {
        if (!cancelled) {
          setOnlineError(error instanceof Error ? error.message : 'Failed to enter waiting lobby.')
        }
      } finally {
        onlineLobbyBootstrappingRef.current = false
      }
    })()

    return () => {
      cancelled = true
      onlineLobbyBootstrappingRef.current = false
    }
  }, [
    connectOnlineSession,
    getApiAccessToken,
    homeStartMode,
    isOnlineMode,
    multiplayerEligibility.eligible,
    refreshPresenceData,
  ])

  useEffect(() => {
    if (homeStartMode !== 'ONLINE' || !multiplayerEligibility.eligible) {
      if (onlineWaitState !== 'IDLE' || onlinePrimaryTimerExpiresAt !== null || onlineDecisionTimerExpiresAt !== null) {
        setOnlineWaitState('IDLE')
        setOnlinePrimaryTimerExpiresAt(null)
        setOnlineDecisionTimerExpiresAt(null)
      }
      return
    }

    if (onlineSnapshot?.gameState.started) {
      if (onlineWaitState !== 'IDLE' || onlinePrimaryTimerExpiresAt !== null || onlineDecisionTimerExpiresAt !== null) {
        setOnlineWaitState('IDLE')
        setOnlinePrimaryTimerExpiresAt(null)
        setOnlineDecisionTimerExpiresAt(null)
      }
      return
    }

    if (onlineWaitState !== 'IDLE') {
      return
    }

    const expiresAt = Date.now() + ONLINE_PRIMARY_WAIT_TIMEOUT_MS
    setOnlineWaitState('WAITING_PRIMARY')
    setOnlinePrimaryTimerExpiresAt(expiresAt)
    setOnlineDecisionTimerExpiresAt(null)
    setOnlineStatusMessage('Online Match is active. Pick a human or AI, or keep waiting up to 60 seconds.')
    setMatchStartStateTracked('SEARCHING_PLAYERS', {
      entryPoint: 'FAST_ONLINE',
      waitPhase: 'primary',
    })
    trackUnifiedPlayEvent('online_wait_timer_started', {
      phase: 'primary',
      timeoutMs: ONLINE_PRIMARY_WAIT_TIMEOUT_MS,
    })
  }, [
    homeStartMode,
    multiplayerEligibility.eligible,
    onlineDecisionTimerExpiresAt,
    onlinePrimaryTimerExpiresAt,
    onlineSnapshot?.gameState.started,
    onlineWaitState,
    setMatchStartStateTracked,
    trackUnifiedPlayEvent,
  ])

  useEffect(() => {
    if (onlineWaitState !== 'WAITING_PRIMARY' || onlinePrimaryTimerExpiresAt === null) {
      return
    }

    const remainingMs = Math.max(0, onlinePrimaryTimerExpiresAt - Date.now())
    const timer = window.setTimeout(() => {
      trackUnifiedPlayEvent('online_wait_timer_expired', {
        phase: 'primary',
      })
      const decisionExpiresAt = Date.now() + ONLINE_DECISION_WAIT_TIMEOUT_MS
      setOnlineWaitState('WAITING_DECISION')
      setOnlineDecisionTimerExpiresAt(decisionExpiresAt)
      setOnlineStatusMessage('No selection yet. Keep waiting or return to Instant Adventure within 60 seconds.')
      setMatchStartStateTracked('WAITING_USER_DECISION', {
        entryPoint: 'FAST_ONLINE',
        timeoutMs: ONLINE_DECISION_WAIT_TIMEOUT_MS,
      })
      trackUnifiedPlayEvent('online_wait_timer_started', {
        phase: 'decision',
        timeoutMs: ONLINE_DECISION_WAIT_TIMEOUT_MS,
      })
    }, remainingMs)

    return () => window.clearTimeout(timer)
  }, [onlinePrimaryTimerExpiresAt, onlineWaitState, setMatchStartStateTracked, trackUnifiedPlayEvent])

  useEffect(() => {
    if (onlineWaitState !== 'WAITING_DECISION' || onlineDecisionTimerExpiresAt === null) {
      return
    }

    const remainingMs = Math.max(0, onlineDecisionTimerExpiresAt - Date.now())
    const timer = window.setTimeout(() => {
      trackUnifiedPlayEvent('online_wait_timer_expired', {
        phase: 'decision',
      })

      if (onlineSessionId) {
        const expiresAt = Date.now() + ONLINE_PRIMARY_WAIT_TIMEOUT_MS
        setOnlineStatusMessage('Still waiting for match confirmation...')
        setOnlineWaitState('WAITING_PRIMARY')
        setOnlinePrimaryTimerExpiresAt(expiresAt)
        setOnlineDecisionTimerExpiresAt(null)
        return
      }

      setOnlineStatusMessage('No selection made in time. Returning to Instant Adventure.')
      handleSelectHomeStartMode('INSTANT')
    }, remainingMs)

    return () => window.clearTimeout(timer)
  }, [handleSelectHomeStartMode, onlineDecisionTimerExpiresAt, onlineSessionId, onlineWaitState, trackUnifiedPlayEvent])

  useEffect(() => {
    if (
      homeStartMode !== 'ONLINE' ||
      !onlineSessionId ||
      onlineSnapshot?.gameState.started ||
      (onlineWaitState !== 'WAITING_PRIMARY' && onlineWaitState !== 'WAITING_DECISION')
    ) {
      return
    }

    const interval = window.setInterval(() => {
      if (!onlineRealtimeRef.current) {
        return
      }

      void onlineRealtimeRef.current.refreshSnapshot().catch(() => undefined)
    }, 2000)

    return () => {
      window.clearInterval(interval)
    }
  }, [homeStartMode, onlineSessionId, onlineSnapshot?.gameState.started, onlineWaitState])

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
    setOnlineSubmitting(false)
    setOnlineLifecycleSubmitting(false)
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

  if (pathname === '/faq') {
    return (
      <div className="flex min-h-screen flex-col">
        <FaqPage />
        <AppFooter />
      </div>
    )
  }

  if (pathname === '/legal') {
    return (
      <div className="flex min-h-screen flex-col">
        <LegalPage />
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
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center p-6">
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
                to="/profile"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                {isAuthenticated ? 'Your Profile' : 'Log In'}
              </Link>
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
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
          <div className="relative">
            <img
              src="/assets/branding/hero-banner.png"
              alt="Dice Odysseys hero banner"
              className="h-auto w-full rounded-xl border border-slate-700 object-cover"
            />
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-slate-950/70 px-3 py-1 text-center text-base text-slate-100 backdrop-blur-sm">
              A dice-powered race for cosmic MacGuffins.
            </p>
          </div>

          <section className="rounded-xl border border-cyan-500/50 bg-cyan-950/20 p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-semibold text-cyan-100">Choose your next mission</h2>
              <p className="text-sm text-cyan-50/90">Pick one mode, configure it, and start playing...</p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left ${
                  homeStartMode === 'INSTANT'
                    ? 'border-cyan-300/90 bg-cyan-900/40 text-cyan-50'
                    : 'border-slate-400/70 bg-slate-900/60 text-slate-100'
                }`}
                onClick={() => handleSelectHomeStartMode('INSTANT')}
              >
                <p className="text-sm font-semibold">Instant Adventure</p>
                <p className="mt-1 text-xs">Single player vs AI opponents.</p>
              </button>

              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left ${
                  homeStartMode === 'HOTSEAT'
                    ? 'border-cyan-300/90 bg-cyan-900/40 text-cyan-50'
                    : 'border-slate-400/70 bg-slate-900/60 text-slate-100'
                }`}
                onClick={() => handleSelectHomeStartMode('HOTSEAT')}
              >
                <p className="text-sm font-semibold">Hotseat Multiplayer</p>
                <p className="mt-1 text-xs">Local turn-by-turn multiplayer.</p>
              </button>

              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left ${
                  homeStartMode === 'ONLINE'
                    ? 'border-cyan-300/90 bg-cyan-900/40 text-cyan-50'
                    : 'border-slate-400/70 bg-slate-900/60 text-slate-100'
                }`}
                onClick={() => handleSelectHomeStartMode('ONLINE')}
              >
                <p className="text-sm font-semibold">Online Match</p>
                <p className="mt-1 text-xs">Find others for online play.</p>
              </button>
            </div>

            {!multiplayerEligibility.eligible && (
              <p className="mt-2 text-xs text-slate-300">Log in to enable Online Match. (It's Free!)</p>
            )}
            {homeModeHint && (
              <p className="mt-2 rounded-md border border-amber-400/50 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-100">
                {homeModeHint}
              </p>
            )}
          </section>
          {homeStartMode === 'INSTANT' && (
            <section className="grid gap-3 lg:grid-cols-4">
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
            </section>
          )}

          {homeStartMode === 'HOTSEAT' && (
            <section className="grid gap-3 lg:grid-cols-4">
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
            </section>
          )}

          {homeStartMode === 'ONLINE' && (
            <section className="space-y-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded border border-slate-700 bg-slate-950/40 p-2">
                  <p className="font-semibold text-cyan-200">Waiting humans</p>
                  {availableNowPlayers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {availableNowPlayers.map((seat) => (
                        <button
                          key={`waiting-human-${seat.userId}`}
                          type="button"
                          className="flex w-full items-center gap-2 rounded border border-slate-700 px-2 py-1 text-left transition hover:border-cyan-400/70 disabled:opacity-50"
                          onClick={() => {
                            void handleSelectWaitingHuman(seat)
                          }}
                          disabled={!multiplayerEligibility.eligible || onlineLifecycleSubmitting || onlineSubmitting}
                        >
                          <img
                            src={getPlayerAvatarSrc(seat.avatarKey)}
                            alt={`${seat.displayName} avatar`}
                            className="h-7 w-7 rounded border border-slate-600 object-cover"
                            onError={withAvatarFallback}
                          />
                          <span className="truncate text-sm">{seat.displayName}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">No waiting players right now.</p>
                  )}
                </div>

                <div className="space-y-2 rounded border border-slate-700 bg-slate-950/40 p-2">
                  <p className="font-semibold text-cyan-200">AI opponents</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {AI_CHARACTERS.slice(0, 6).map((aiCharacter) => (
                      <button
                        key={`online-ai-${aiCharacter.slug}`}
                        type="button"
                        className="flex w-full items-center gap-2 rounded border border-slate-700 px-2 py-1 text-left transition hover:border-cyan-400/70 disabled:opacity-50"
                        onClick={() => {
                          void handleStartOnlineAiMatch(aiCharacter.slug)
                        }}
                        disabled={!multiplayerEligibility.eligible || onlineLifecycleSubmitting || onlineSubmitting}
                      >
                        <img
                          src={aiCharacter.thumbnailSrc}
                          alt={`${aiCharacter.shortName} thumbnail`}
                          className="h-7 w-7 rounded border border-slate-600 object-cover"
                          onError={withOpponentThumbnailFallback}
                        />
                        <span className="truncate text-sm">{aiCharacter.shortName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
                {!isAuthenticated && (
                  <Link
                    to="/profile"
                    className="rounded-md border border-cyan-400 bg-cyan-900/30 px-4 py-2 text-sm font-semibold text-cyan-100"
                  >
                    Log In for Online Match
                  </Link>
                )}
              </div>
            </section>
          )}

          {(homeStartMode === 'INSTANT' || homeStartMode === 'HOTSEAT') && (
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
              <button
                type="button"
                className="rounded-md bg-cyan-500 px-5 py-2 font-semibold text-slate-950 lg:whitespace-nowrap"
                onClick={handleStart}
                disabled={isOnlineMode}
              >
                Start Game
              </button>
            </div>
          )}


          {homeStartMode === 'ONLINE' && mode === 'multiplayer' && (onlineStatusMessage || onlineError || onlineSessionId || matchStartState !== 'IDLE') && (
            <div className="mt-3 space-y-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200">
              {matchStartState !== 'IDLE' && matchStartStateCopy[matchStartState] && (
                <div className="rounded-md border border-cyan-400/40 bg-cyan-900/20 px-2 py-1.5">
                  <p className="font-semibold text-cyan-100">{matchStartStateCopy[matchStartState]?.title}</p>
                  <p className="mt-0.5 text-cyan-200/90">{matchStartStateCopy[matchStartState]?.detail}</p>
                </div>
              )}
              {onlineWaitState === 'WAITING_DECISION' && isWaitingForPlayersMessage && (
                <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
                  <button
                    type="button"
                    className="rounded-md border border-cyan-300 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                    onClick={handleStartWithAiFallback}
                  >
                    Instant Adventure
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100"
                    onClick={handleKeepWaitingQuickOnline}
                  >
                    Keep waiting
                  </button>
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
                  <p className="text-cyan-200 xl:ml-1" role="status" aria-live="polite">
                    {onlineStatusMessage}
                  </p>
                </div>
              )}
              {onlineWaitState === 'WAITING_DECISION' && !isWaitingForPlayersMessage && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-cyan-300 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                    onClick={handleStartWithAiFallback}
                  >
                    Instant Adventure
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100"
                    onClick={handleKeepWaitingQuickOnline}
                  >
                    Keep waiting
                  </button>
                </div>
              )}
              {onlineSessionId && (debugEnabled || !(onlineWaitState === 'WAITING_DECISION' && isWaitingForPlayersMessage)) && (
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
                  {!(onlineWaitState === 'WAITING_DECISION' && isWaitingForPlayersMessage) && (
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
                  )}
                </div>
              )}
              {onlineStatusMessage && !isWaitingForPlayersMessage && (
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


          {homeStartMode === 'ONLINE' && mode === 'multiplayer' && SHOW_DEBUG_CONTROLS && (
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

            <aside className="grid gap-3 xl:content-start">
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

              {featuredHomeOpponent && (
                <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                  <h2 className="text-sm font-semibold text-cyan-200">Featured Opponent</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={featuredHomeOpponent.thumbnailSrc}
                      alt={`${featuredHomeOpponent.fullName} thumbnail`}
                      className="h-14 w-14 rounded border border-slate-600 object-cover"
                      onError={withOpponentThumbnailFallback}
                    />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100">{featuredHomeOpponent.fullName}</p>
                        <p className="text-[11px] text-slate-400">{featuredHomeOpponent.phraseDescription}</p>
                      </div>
                      <Link
                        to={`/opponents/${featuredHomeOpponent.slug}`}
                        className="inline-flex shrink-0 rounded border border-slate-600 px-2 py-1 text-[11px] font-semibold text-cyan-200 hover:border-slate-500"
                      >
                        Full bio
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{featuredHomeOpponent.longDescription}</p>
                </article>
              )}

              <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <ul className="space-y-2">
                  {homeTestimonials.map((item) => (
                    <li key={item.author} className="rounded border border-slate-700 bg-slate-950/40 p-2">
                      <p className="text-xs text-cyan-200">“{item.quote}”</p>
                      <p className="mt-1 text-[11px] font-semibold text-cyan-200">— {item.author}</p>
                    </li>
                  ))}
                </ul>
              </article>
            </aside>
          </div>
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

        {(onlineStatusMessage || onlineError || onlineSessionId || (isOnlineMode && onlineSnapshot && !authoritativeState.winnerId)) && (
          <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
            {(onlineStatusMessage || onlineError || onlineSessionId) && (
              <section className="space-y-1 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 xl:h-full">
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
              <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 xl:h-full">
                <p className="font-semibold text-cyan-200">Match Seats</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {onlineSnapshot.playerSeats.map((seat) => (
                    <li
                      key={`${seat.userId}-${seat.seat}`}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1"
                    >
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
          </div>
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
