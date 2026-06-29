import { app, BrowserWindow, shell } from 'electron'
import { getDb } from './db'
import { scaleSimulator } from './scaleSimulator'
import { registerIpcHandlers } from './ipc'
import { loadAppRoute, PRELOAD_PATH } from './windowUrl'

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    backgroundColor: '#e6e4dd',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  loadAppRoute(win)
  return win
}

app.whenReady().then(() => {
  getDb()
  scaleSimulator.start()
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
