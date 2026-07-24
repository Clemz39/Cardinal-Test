import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { getTicket, listTickets, markPrinted } from './repos/ticketRepo'
import { loadAppRoute, PRELOAD_PATH } from './windowUrl'
import { notify } from './events'
import type { ReportRange, Ticket, TicketFilter } from '../shared/types'

type OkResult = { ok: boolean; reason?: string }

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function ticketsToCsv(tickets: Ticket[]): string {
  const headers = [
    'Ticket',
    'Created',
    'Vehicle',
    'Hauler',
    'Commodity',
    'Invoice',
    'Origin Bin',
    'Gross (kg)',
    'Tare (kg)',
    'Net (kg)',
    'Unit Price ($/kg)',
    'Value ($)',
    'Status',
    'Direction',
    'Printed At',
    'Voided At',
    'Voided By',
    'Void Reason'
  ]
  const rows = tickets.map((t) => [
    t.id,
    t.createdAt,
    t.vehicleId ?? '',
    t.hauler ?? '',
    t.commodity ?? '',
    t.invoiceNumber ?? '',
    t.originBin ?? '',
    t.gross?.toString() ?? '',
    t.tare?.toString() ?? '',
    t.net?.toString() ?? '',
    t.unitPrice?.toString() ?? '',
    t.net != null && t.unitPrice != null ? (t.net * t.unitPrice).toFixed(2) : '',
    t.status,
    t.direction,
    t.printedAt ?? '',
    t.voidedAt ?? '',
    t.voidedBy ?? '',
    t.voidReason ?? ''
  ])
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

export async function exportTicketsCsv(filter?: TicketFilter): Promise<OkResult & { path?: string }> {
  const tickets = listTickets(filter)
  const win = BrowserWindow.getFocusedWindow()
  const saveOptions = {
    title: 'Export Tickets',
    defaultPath: `tickets-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  }
  const result = win ? await dialog.showSaveDialog(win, saveOptions) : await dialog.showSaveDialog(saveOptions)
  if (result.canceled || !result.filePath) return { ok: false, reason: 'Export canceled' }
  writeFileSync(result.filePath, ticketsToCsv(tickets), 'utf-8')
  return { ok: true, path: result.filePath }
}

export async function exportReportPdf(range: ReportRange): Promise<OkResult & { path?: string }> {
  const parent = BrowserWindow.getFocusedWindow()
  const saveOptions = {
    title: 'Export Report',
    defaultPath: `report-${range.from.slice(0, 10)}-to-${range.to.slice(0, 10)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  }
  const result = parent ? await dialog.showSaveDialog(parent, saveOptions) : await dialog.showSaveDialog(saveOptions)
  if (result.canceled || !result.filePath) return { ok: false, reason: 'Export canceled' }

  // Render a dedicated print layout in a hidden window rather than screenshotting
  // whatever the dashboard happens to look like on screen — same approach as tickets.
  const win = new BrowserWindow({
    show: false,
    webPreferences: { preload: PRELOAD_PATH, contextIsolation: true, sandbox: false }
  })
  try {
    await loadAppRoute(win, { printReportFrom: range.from, printReportTo: range.to })
    await win.webContents.executeJavaScript(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    )
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    })
    writeFileSync(result.filePath, data)
    return { ok: true, path: result.filePath }
  } finally {
    win.close()
  }
}

export async function printTicket(id: string, copies = 1): Promise<OkResult> {
  const ticket = getTicket(id)
  if (!ticket) return { ok: false, reason: 'Ticket not found' }

  // Test environments have no real printer to hand off to (same reason the scale has a
  // simulator driver) — skip the OS print dialog and go straight to the success path so
  // the print-locks-the-ticket behavior can be exercised deterministically.
  if (process.env.ATLAS_E2E_FAKE_PRINT === '1') {
    markPrinted(id)
    notify('tickets', 'draft')
    return { ok: true }
  }

  const win = new BrowserWindow({
    show: false,
    webPreferences: { preload: PRELOAD_PATH, contextIsolation: true, sandbox: false }
  })
  try {
    await loadAppRoute(win, { print: id })
    await win.webContents.executeJavaScript(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    )
    const printed = await new Promise<OkResult>((resolve) => {
      win.webContents.print({ silent: false, copies, printBackground: true }, (success, reason) => {
        resolve(success ? { ok: true } : { ok: false, reason })
      })
    })
    if (printed.ok) {
      markPrinted(id)
      notify('tickets', 'draft')
    }
    return printed
  } finally {
    win.close()
  }
}
