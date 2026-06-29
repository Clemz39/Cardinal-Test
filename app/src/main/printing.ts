import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { getTicket, listTickets } from './repos/ticketRepo'
import { loadAppRoute, PRELOAD_PATH } from './windowUrl'
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
    'Contract/PO',
    'Origin Bin',
    'Gross (kg)',
    'Tare (kg)',
    'Net (kg)',
    'Status',
    'Direction'
  ]
  const rows = tickets.map((t) => [
    t.id,
    t.createdAt,
    t.vehicleId ?? '',
    t.hauler ?? '',
    t.commodity ?? '',
    t.contractPo ?? '',
    t.originBin ?? '',
    t.gross?.toString() ?? '',
    t.tare?.toString() ?? '',
    t.net?.toString() ?? '',
    t.status,
    t.direction
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
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { ok: false, reason: 'No window to export' }
  const result = await dialog.showSaveDialog(win, {
    title: 'Export Report',
    defaultPath: `report-${range.from.slice(0, 10)}-to-${range.to.slice(0, 10)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) return { ok: false, reason: 'Export canceled' }
  const data = await win.webContents.printToPDF({})
  writeFileSync(result.filePath, data)
  return { ok: true, path: result.filePath }
}

export async function printTicket(id: string, copies = 1): Promise<OkResult> {
  const ticket = getTicket(id)
  if (!ticket) return { ok: false, reason: 'Ticket not found' }

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
    return printed
  } finally {
    win.close()
  }
}
