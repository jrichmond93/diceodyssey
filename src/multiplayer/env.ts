export interface MultiplayerEnvConfig {
  auth0: {
    domain: string
    clientId: string
    audience?: string
    redirectUri: string
    logoutUri: string
  }
  supabase: {
    projectRef: string
    url: string
    anonKey: string
  }
}

export interface UnifiedPlayFeatureFlags {
  unifiedPlayV1: boolean
  presenceDirectoryV1: boolean
  hybridRematchReplacementV1: boolean
}

export type Auth0EnvConfig = MultiplayerEnvConfig['auth0']
export type SupabaseEnvConfig = MultiplayerEnvConfig['supabase']

const readRequiredEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

const readOptionalEnv = (key: keyof ImportMetaEnv): string | undefined => {
  const value = import.meta.env[key]
  return value || undefined
}

const readBooleanEnv = (key: keyof ImportMetaEnv, fallback: boolean): boolean => {
  const value = readOptionalEnv(key)
  if (!value) {
    return fallback
  }

  if (/^(1|true|yes|on)$/i.test(value)) {
    return true
  }

  if (/^(0|false|no|off)$/i.test(value)) {
    return false
  }

  return fallback
}

export const getAuth0EnvConfig = (): Auth0EnvConfig => ({
  domain: readRequiredEnv('VITE_AUTH0_DOMAIN'),
  clientId: readRequiredEnv('VITE_AUTH0_CLIENT_ID'),
  audience: readOptionalEnv('VITE_AUTH0_AUDIENCE'),
  redirectUri: readRequiredEnv('VITE_AUTH0_REDIRECT_URI'),
  logoutUri: readRequiredEnv('VITE_AUTH0_LOGOUT_URI'),
})

export const getSupabaseEnvConfig = (): SupabaseEnvConfig => ({
  projectRef: readRequiredEnv('VITE_SUPABASE_PROJECT_REF'),
  url: readRequiredEnv('VITE_SUPABASE_URL'),
  anonKey: readRequiredEnv('VITE_SUPABASE_ANON_KEY'),
})

export const getMultiplayerEnvConfig = (): MultiplayerEnvConfig => ({
  auth0: getAuth0EnvConfig(),
  supabase: getSupabaseEnvConfig(),
})

export const getUnifiedPlayFeatureFlags = (): UnifiedPlayFeatureFlags => ({
  unifiedPlayV1: readBooleanEnv('VITE_UNIFIED_PLAY_V1', true),
  presenceDirectoryV1: readBooleanEnv('VITE_PRESENCE_DIRECTORY_V1', true),
  hybridRematchReplacementV1: readBooleanEnv('VITE_HYBRID_REMATCH_REPLACEMENT_V1', true),
})
