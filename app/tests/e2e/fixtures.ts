import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

interface Fixtures {
  userDataDir: string
  electronApp: ElectronApplication
  window: Page
}

export const test = base.extend<Fixtures>({
  // Each test gets its own Electron user-data directory, so its SQLite database is
  // freshly reseeded and no test can see another test's (or a developer's) data.
  userDataDir: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-e2e-'))
    await use(dir)
    rmSync(dir, { recursive: true, force: true })
  },

  electronApp: async ({ userDataDir }, use) => {
    const app = await electron.launch({
      args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
      env: { ...process.env, ATLAS_E2E_FAKE_PRINT: '1' }
    })
    await use(app)
    await app.close()
  },

  window: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    await use(win)
  }
})

export const expect = test.expect

export async function login(win: Page, username: string, pin: string): Promise<void> {
  await win.fill('input[placeholder="e.g. jmercer"]', username)
  await win.fill('input[type="password"]', pin)
  await win.click('button[type="submit"]')
  await win.getByRole('button', { name: 'Weigh', exact: true }).waitFor()
}

export async function goTo(win: Page, tab: 'Weigh' | 'Tickets' | 'Vehicles' | 'Products' | 'Reports' | 'Settings'): Promise<void> {
  await win.getByRole('button', { name: tab, exact: true }).click()
}

/** Waits for the weigh indicator to report a settled reading, the way an operator would. */
export async function waitForStableReading(win: Page): Promise<void> {
  await win.getByText('STABLE', { exact: false }).waitFor({ timeout: 15_000 })
}
