import { existsSync, mkdirSync, readdirSync, unlinkSync, copyFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getDb, getDbPath, closeDb } from './db'
import { getSettings, updateSettings } from './repos/settingsRepo'

const MAX_BACKUPS = 10
const BACKUP_PREFIX = 'atlasweigh-backup-'

export async function performBackup(): Promise<
  { ok: true; filePath: string } | { ok: false; error: string }
> {
  const settings = getSettings()
  if (!settings.backupPath) return { ok: false, error: 'No backup path configured' }

  try {
    const dir = settings.backupPath
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const now = new Date()
    const stamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')
    const destPath = join(dir, `${BACKUP_PREFIX}${stamp}.sqlite3`)

    await getDb().backup(destPath)

    pruneOldBackups(dir)
    updateSettings({ lastBackupAt: now.toISOString() })

    return { ok: true, filePath: destPath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function restoreBackup(
  filePath: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!existsSync(filePath)) return { ok: false, error: 'Backup file not found' }

  try {
    const dbPath = getDbPath()
    closeDb()
    copyFileSync(filePath, dbPath)
    for (const ext of ['-wal', '-shm']) {
      const sidecar = dbPath + ext
      if (existsSync(sidecar)) unlinkSync(sidecar)
    }
    // Relaunch so every screen, the auth session, and the db handle start fresh against the restored data
    setTimeout(() => {
      app.relaunch()
      app.exit(0)
    }, 300)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function pruneOldBackups(dir: string): void {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.sqlite3'))
      .sort()
    const excess = files.length - MAX_BACKUPS
    if (excess > 0) files.slice(0, excess).forEach((f) => unlinkSync(join(dir, f)))
  } catch {
    // prune errors are non-fatal
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null

export function startBackupScheduler(): void {
  // Check every 30 minutes whether a scheduled backup is due
  schedulerTimer = setInterval(() => void checkAndBackup(), 30 * 60 * 1000)
  // Also run an initial check shortly after startup
  setTimeout(() => void checkAndBackup(), 10_000)
}

export function stopBackupScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}

async function checkAndBackup(): Promise<void> {
  const settings = getSettings()
  if (!settings.backupPath || settings.backupIntervalHours === 0) return

  const now = new Date()
  if (settings.lastBackupAt) {
    const hoursSince = (now.getTime() - new Date(settings.lastBackupAt).getTime()) / 3_600_000
    if (hoursSince < settings.backupIntervalHours) return
  }

  await performBackup()
}
