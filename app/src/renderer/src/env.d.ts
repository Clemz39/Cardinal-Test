/// <reference types="vite/client" />

import type { CardinalApi } from '@shared/ipc'

declare global {
  interface Window {
    api: CardinalApi
  }
}

export {}
