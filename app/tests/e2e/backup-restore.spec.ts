import { readdirSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { test, expect, login, goTo } from './fixtures'

test('backup now, then restore rolls back data changed afterward', async ({ window: win }) => {
  await login(win, 'rcastillo', '4242')

  const backupDir = mkdtempSync(join(tmpdir(), 'atlas-e2e-backup-'))
  try {
    await goTo(win, 'Settings')

    // Point the app at our temp backup folder without going through the native folder
    // picker, which Playwright cannot drive — this exercises the same settings path a
    // real Browse click would.
    await win.evaluate((dir) => window.api.settings.update({ backupPath: dir }), backupDir)
    await expect(win.getByText(backupDir)).toBeVisible()

    const originalVehicle = await win.evaluate(() => window.api.vehicles.get('TRK-148'))
    expect(originalVehicle?.description).toBeTruthy()

    const backupNowButton = win.getByRole('button', { name: 'Backup Now' })
    await expect(backupNowButton).toBeEnabled()
    await backupNowButton.click()
    await expect(win.getByRole('button', { name: 'Backup Now' })).toBeEnabled({ timeout: 10_000 })

    const backupFiles = readdirSync(backupDir).filter((f) => f.endsWith('.sqlite3'))
    expect(backupFiles.length).toBe(1)
    const backupFilePath = join(backupDir, backupFiles[0])

    // Change data after the backup was taken, so restoring has something real to undo.
    await win.evaluate(
      () => window.api.vehicles.update('TRK-148', { description: 'MODIFIED FOR TEST' }),
    )
    const modifiedVehicle = await win.evaluate(() => window.api.vehicles.get('TRK-148'))
    expect(modifiedVehicle?.description).toBe('MODIFIED FOR TEST')

    // Restore directly through the API (bypassing the native file-picker + confirm()
    // dialog, which aren't part of the app's own logic) and wait for the reload the
    // restore flow triggers.
    const restoreResult = await win.evaluate((path) => window.api.backup.restore(path), backupFilePath)
    expect(restoreResult.ok).toBe(true)

    await win.getByPlaceholder('e.g. jmercer').waitFor({ timeout: 10_000 })
    await login(win, 'rcastillo', '4242')

    const restoredVehicle = await win.evaluate(() => window.api.vehicles.get('TRK-148'))
    expect(restoredVehicle?.description).toBe(originalVehicle?.description)
    expect(restoredVehicle?.description).not.toBe('MODIFIED FOR TEST')
  } finally {
    rmSync(backupDir, { recursive: true, force: true })
  }
})
