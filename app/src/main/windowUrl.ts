import { join } from 'path'
import type { BrowserWindow } from 'electron'

export const PRELOAD_PATH = join(__dirname, '../preload/index.js')

export function loadAppRoute(win: BrowserWindow, query?: Record<string, string>): Promise<void> {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    const url = new URL(devUrl)
    if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    return win.loadURL(url.toString())
  }
  return win.loadFile(join(__dirname, '../renderer/index.html'), { query })
}
