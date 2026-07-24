import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { test, expect, login, goTo } from './fixtures'

test('exporting a report renders the dedicated print layout, not a screenshot of the dashboard', async ({
  window: win,
  electronApp
}) => {
  await login(win, 'rcastillo', '4242')

  const outDir = mkdtempSync(join(tmpdir(), 'atlas-e2e-report-'))
  const outPath = join(outDir, 'report.pdf')
  try {
    // The native save dialog can't be driven by Playwright — stub it to return a fixed
    // path, same as a user picking a location, and let the real export logic run.
    await electronApp.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath: path })) as typeof dialog.showSaveDialog
    }, outPath)

    await goTo(win, 'Reports')
    await win.getByRole('button', { name: /PDF/ }).click()

    await expect
      .poll(
        () => {
          try {
            return readFileSync(outPath).length
          } catch {
            return 0
          }
        },
        { timeout: 10_000 }
      )
      .toBeGreaterThan(0)

    const bytes = readFileSync(outPath)
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    // A screenshot of the on-screen dashboard would be a fraction of this size; the
    // dedicated report layout (header, stat grid, two tables) reliably exceeds it.
    expect(bytes.length).toBeGreaterThan(10_000)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})
