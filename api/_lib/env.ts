import { config as loadDotenv } from 'dotenv'

let dotenvLoaded = false

const ensureDotenvLoaded = () => {
  if (dotenvLoaded) {
    return
  }

  loadDotenv({ path: '.env.local' })
  loadDotenv()
  dotenvLoaded = true
}

const readRequired = (keys: string[]): string => {
  ensureDotenvLoaded()

  for (const key of keys) {
    const value = process.env[key]
    if (value) {
      return value
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${keys.join(', ')}`)
}

const readOptional = (keys: string[]): string | undefined => {
  ensureDotenvLoaded()

  for (const key of keys) {
    const value = process.env[key]
    if (value) {
      return value
    }
  }

  return undefined
}

const readOptionalInt = (keys: string[], fallback: number): number => {
  const value = readOptional(keys)
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export interface ServerEnv {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  auth0Domain: string
  auth0Audience?: string
  queueRateLimitPerMinute: number
  turnIntentRateLimitPerMinute: number
}

export const getServerEnv = (): ServerEnv => ({
  supabaseUrl: readRequired(['SUPABASE_URL', 'VITE_SUPABASE_URL']),
  supabaseServiceRoleKey: readRequired(['SUPABASE_SERVICE_ROLE_KEY']),
  auth0Domain: readRequired(['AUTH0_DOMAIN', 'VITE_AUTH0_DOMAIN']),
  auth0Audience: readOptional(['AUTH0_AUDIENCE', 'VITE_AUTH0_AUDIENCE']),
  queueRateLimitPerMinute: readOptionalInt(['QUEUE_RATE_LIMIT_PER_MINUTE'], 20),
  turnIntentRateLimitPerMinute: readOptionalInt(['TURN_INTENT_RATE_LIMIT_PER_MINUTE'], 120),
})
