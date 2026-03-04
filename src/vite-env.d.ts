/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string
  readonly VITE_AUTH0_CLIENT_ID: string
  readonly VITE_AUTH0_AUDIENCE?: string
  readonly VITE_AUTH0_REDIRECT_URI: string
  readonly VITE_AUTH0_LOGOUT_URI: string
  readonly VITE_SUPABASE_PROJECT_REF: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_UNIFIED_PLAY_V1?: string
  readonly VITE_PRESENCE_DIRECTORY_V1?: string
  readonly VITE_HYBRID_REMATCH_REPLACEMENT_V1?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
