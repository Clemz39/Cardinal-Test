import { test, expect, login, goTo, waitForStableReading } from './fixtures'

test('weigh, print, and save a ticket — printing locks it, saving finalizes it', async ({ window: win }) => {
  await login(win, 'rcastillo', '4242')

  // The seeded draft ticket already has a vehicle/weights attached (it mirrors the design
  // mock); start from a clean draft so this test exercises the actual vehicle-picking UI
  // rather than relying on incidental seed data.
  await win.getByRole('button', { name: 'New', exact: true }).click()

  // Pick a vehicle with a stored tare so a gross capture is meaningful. The picker shows
  // a read-only box once a vehicle has ever been set (even to none); click it to edit.
  await win.locator('[class*="vehicleBox"]').click()
  await win.getByPlaceholder('Type or scan vehicle ID…').fill('TRK-148')
  await win.getByText('Peterbilt 579').click()

  await waitForStableReading(win)

  const captureButton = win.getByRole('button', { name: /CAPTURE GROSS/ })
  await expect(captureButton).toBeEnabled()
  await captureButton.click()

  // Gross/net now come from the simulator, not zero.
  const netValue = win.locator('[class*="netValue"]').first()
  await expect(netValue).not.toHaveText('0')
  const capturedNet = (await netValue.textContent())?.trim()
  expect(capturedNet).toBeTruthy()

  const ticketId = (await win.locator('[class*="ticketId"]').first().textContent())?.trim()
  expect(ticketId).toBeTruthy()

  // Print before saving — this is a supported flow in the UI and is exactly the moment
  // the ticket should lock, since a physical copy now exists.
  const printButton = win.getByRole('button', { name: 'Print Ticket' })
  await expect(printButton).toBeEnabled()
  await printButton.click()
  await win.getByRole('button', { name: /Print \d Cop(y|ies)/ }).click()
  // The print IPC round-trip (faked in tests) resolves the modal away.
  await expect(win.getByText('PRINT PREVIEW')).toHaveCount(0)

  // Locked: capture/zero/tare controls and every editable field are disabled, and the
  // lock notice is shown, so nothing about the printed ticket can silently change.
  await expect(captureButton).toBeDisabled()
  await expect(win.getByRole('button', { name: 'ZERO' })).toBeDisabled()
  await expect(win.getByRole('button', { name: 'TARE' })).toBeDisabled()
  await expect(win.getByText(/has been printed and is locked/)).toBeVisible()

  // A locked draft can't be mutated even via a direct API call, not just the disabled UI.
  const fieldAttempt = await win.evaluate(() => window.api.draft.setField('originBin', 'SHOULD NOT APPLY'))
  expect(fieldAttempt.originBin).not.toBe('SHOULD NOT APPLY')

  // Saving is still allowed — printing locks edits, not the ability to finish the ticket.
  await win.getByRole('button', { name: 'Save Ticket', exact: true }).click()
  await expect(win.getByText(/has been printed and is locked/)).toHaveCount(0)

  // The saved ticket shows up in history as done, still carrying its printedAt audit stamp.
  await goTo(win, 'Tickets')
  await win.getByText('Month', { exact: true }).click()
  const savedRow = win.locator('[class*="row"]', { hasText: ticketId! })
  await expect(savedRow).toBeVisible()
  await expect(savedRow.getByText('done')).toBeVisible()

  const savedTicket = await win.evaluate((id) => window.api.tickets.get(id), ticketId!)
  expect(savedTicket?.status).toBe('done')
  expect(savedTicket?.printedAt).not.toBeNull()
  expect(savedTicket?.gross).not.toBeNull()
  expect(savedTicket?.net).toBe(savedTicket!.gross! - savedTicket!.tare!)
})
