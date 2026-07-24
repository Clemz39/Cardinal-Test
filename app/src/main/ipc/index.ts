import { ipcMain, BrowserWindow, dialog } from 'electron'
import { scaleManager } from '../scale/manager'
import { listSerialPorts } from '../scale/serialDriver'
import { dataBus } from '../events'
import { login, logout, getCurrentUser } from '../authSession'
import {
  getDraft,
  newDraft,
  setDraftVehicle,
  setDraftField,
  pressZero,
  pressTareButton,
  captureGross,
  saveDraft,
  type DraftField
} from '../ticketService'
import { listTickets, getTicket, getRecentDoneTickets, distinctCommodities, distinctHaulers } from '../repos/ticketRepo'
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleHistory
} from '../repos/vehicleRepo'
import { startReweigh, cancelReweigh, confirmReweigh, setManualTare } from '../vehicleService'
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../repos/productRepo'
import { getSettings, updateSettings } from '../repos/settingsRepo'
import { performBackup, restoreBackup } from '../backupService'
import { getReportSummary } from '../reportService'
import { exportTicketsCsv, exportReportPdf, printTicket } from '../printing'
import type {
  DataEntity,
  Product,
  ReportRange,
  ScaleReading,
  ScaleStatusInfo,
  Settings,
  TicketFilter,
  Vehicle
} from '../../shared/types'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('auth:login', (_e, username: string, pin: string) => login(username, pin))
  ipcMain.handle('auth:logout', () => logout())
  ipcMain.handle('auth:current', () => getCurrentUser())

  ipcMain.handle('draft:get', () => getDraft())
  ipcMain.handle('draft:reset', () => newDraft())
  ipcMain.handle('draft:setVehicle', (_e, vehicleId: string | null) => setDraftVehicle(vehicleId))
  ipcMain.handle('draft:setField', (_e, field: DraftField, value: string) => setDraftField(field, value))
  ipcMain.handle('draft:pressZero', () => pressZero())
  ipcMain.handle('draft:pressTare', () => pressTareButton())
  ipcMain.handle('draft:captureGross', () => captureGross())
  ipcMain.handle('draft:save', () => saveDraft())

  ipcMain.handle('tickets:list', (_e, filter?: TicketFilter) => listTickets(filter))
  ipcMain.handle('tickets:get', (_e, id: string) => getTicket(id))
  ipcMain.handle('tickets:recentDone', (_e, limit?: number) => getRecentDoneTickets(limit))
  ipcMain.handle('tickets:distinctCommodities', () => distinctCommodities())
  ipcMain.handle('tickets:distinctHaulers', () => distinctHaulers())
  ipcMain.handle('tickets:exportCsv', (_e, filter?: TicketFilter) => exportTicketsCsv(filter))
  ipcMain.handle('tickets:print', (_e, id: string, copies?: number) => printTicket(id, copies))

  ipcMain.handle('vehicles:list', (_e, query?: string) => listVehicles(query))
  ipcMain.handle('vehicles:get', (_e, id: string) => getVehicle(id))
  ipcMain.handle(
    'vehicles:create',
    (_e, input: Omit<Vehicle, 'storedTare' | 'tareCapturedAt'> & Partial<Pick<Vehicle, 'storedTare' | 'tareCapturedAt'>>) =>
      createVehicle(input)
  )
  ipcMain.handle('vehicles:update', (_e, id: string, patch: Partial<Omit<Vehicle, 'id'>>) => updateVehicle(id, patch))
  ipcMain.handle('vehicles:delete', (_e, id: string) => deleteVehicle(id))
  ipcMain.handle('vehicles:history', (_e, id: string, limit?: number) => getVehicleHistory(id, limit))
  ipcMain.handle('vehicles:startReweigh', (_e, id: string) => startReweigh(id))
  ipcMain.handle('vehicles:cancelReweigh', () => cancelReweigh())
  ipcMain.handle('vehicles:confirmReweigh', (_e, id: string) => confirmReweigh(id))
  ipcMain.handle('vehicles:setManualTare', (_e, id: string, kg: number) => setManualTare(id, kg))

  ipcMain.handle('products:list', () => listProducts())
  ipcMain.handle('products:get', (_e, id: string) => getProduct(id))
  ipcMain.handle('products:create', (_e, input: Product) => createProduct(input))
  ipcMain.handle('products:update', (_e, id: string, patch: Partial<Omit<Product, 'id'>>) => updateProduct(id, patch))
  ipcMain.handle('products:delete', (_e, id: string) => deleteProduct(id))

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:update', (_e, patch: Partial<Settings>) => updateSettings(patch))

  ipcMain.handle('backup:now', () => performBackup())
  ipcMain.handle('backup:browse', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return canceled ? null : filePaths[0]
  })
  ipcMain.handle('backup:restore', async (_e, filePath: string) => {
    const result = await restoreBackup(filePath)
    if (result.ok) {
      // Give the renderer a moment to receive this response before its window reloads out from under it
      setTimeout(() => {
        for (const win of BrowserWindow.getAllWindows()) win.webContents.reload()
      }, 400)
    }
    return result
  })
  ipcMain.handle('backup:browseRestoreFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      defaultPath: getSettings().backupPath || undefined,
      filters: [{ name: 'Atlas Weigh Backup', extensions: ['sqlite3'] }]
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('reports:summary', (_e, range: ReportRange) => getReportSummary(range))
  ipcMain.handle('reports:exportPdf', (_e, range: ReportRange) => exportReportPdf(range))

  ipcMain.handle('scale:getReading', () => scaleManager.getReading())
  ipcMain.handle('scale:recentLines', (_e, limit?: number) => scaleManager.getRecentLines(limit))
  ipcMain.handle('scale:getStatus', () => scaleManager.getStatus())
  ipcMain.handle('scale:listPorts', async () => {
    try {
      return await listSerialPorts()
    } catch {
      return []
    }
  })

  scaleManager.on('reading', (reading: ScaleReading) => broadcast('scale:reading', reading))
  scaleManager.on('status', (status: ScaleStatusInfo) => broadcast('scale:status', status))
  dataBus.on('changed', (entities: DataEntity[]) => broadcast('data:changed', entities))
}
