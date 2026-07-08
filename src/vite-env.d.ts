/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Injected by vite.config.ts `define` — real build identity.
declare const __GIT_SHA__: string
declare const __BUILD_DATE__: string
