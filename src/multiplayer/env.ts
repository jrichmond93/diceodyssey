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
