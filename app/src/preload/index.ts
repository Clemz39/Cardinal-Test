import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { AtlasApi } from '../shared/ipc'
import type { DataEntity, ScaleReading, ScaleStatusInfo } from '../shared/types'

const api: AtlasApi = {
  auth: {
    login: (username, pin) => ipcRenderer.invoke('auth:login', username, pin),
    logout: () => ipcRenderer.invoke('auth:logout'),
    current: () => ipcRenderer.invoke('auth:current')
  },
  draft: {
    get: () => ipcRenderer.invoke('draft:get'),
    reset: () => ipcRenderer.invoke('draft:reset'),
    setVehicle: (vehicleId) => ipcRenderer.invoke('draft:setVehicle', vehicleId),
    setField: (field, value) => ipcRenderer.invoke('draft:setField', field, value),
    pressZero: () => ipcRenderer.invoke('draft:pressZero'),
    pressTare: () => ipcRenderer.invoke('draft:pressTare'),
    captureGross: () => ipcRenderer.invoke('draft:captureGross'),
    save: () => ipcRenderer.invoke('draft:save')
  },
  tickets: {
    list: (filter) => ipcRenderer.invoke('tickets:list', filter),
    get: (id) => ipcRenderer.invoke('tickets:get', id),
    recentDone: (limit) => ipcRenderer.invoke('tickets:recentDone', limit),
    distinctCommodities: () => ipcRenderer.invoke('tickets:distinctCommodities'),
    distinctHaulers: () => ipcRenderer.invoke('tickets:distinctHaulers'),
    exportCsv: (filter) => ipcRenderer.invoke('tickets:exportCsv', filter),
    print: (id, copies) => ipcRenderer.invoke('tickets:print', id, copies)
  },
  vehicles: {
    list: (query) => ipcRenderer.invoke('vehicles:list', query),
    get: (id) => ipcRenderer.invoke('vehicles:get', id),
    create: (input) => ipcRenderer.invoke('vehicles:create', input),
    update: (id, patch) => ipcRenderer.invoke('vehicles:update', id, patch),
    delete: (id) => ipcRenderer.invoke('vehicles:delete', id),
    history: (id, limit) => ipcRenderer.invoke('vehicles:history', id, limit),
    startReweigh: (id) => ipcRenderer.invoke('vehicles:startReweigh', id),
    cancelReweigh: () => ipcRenderer.invoke('vehicles:cancelReweigh'),
    confirmReweigh: (id) => ipcRenderer.invoke('vehicles:confirmReweigh', id),
    setManualTare: (id, kg) => ipcRenderer.invoke('vehicles:setManualTare', id, kg)
  },
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    get: (id) => ipcRenderer.invoke('products:get', id),
    create: (input) => ipcRenderer.invoke('products:create', input),
    update: (id, patch) => ipcRenderer.invoke('products:update', id, patch),
    delete: (id) => ipcRenderer.invoke('products:delete', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch)
  },
  reports: {
    summary: (range) => ipcRenderer.invoke('reports:summary', range),
    exportPdf: (range) => ipcRenderer.invoke('reports:exportPdf', range)
  },
  scale: {
    getReading: () => ipcRenderer.invoke('scale:getReading'),
    recentLines: (limit) => ipcRenderer.invoke('scale:recentLines', limit),
    getStatus: () => ipcRenderer.invoke('scale:getStatus'),
    listPorts: () => ipcRenderer.invoke('scale:listPorts')
  },
  backup: {
    now: () => ipcRenderer.invoke('backup:now'),
    browse: () => ipcRenderer.invoke('backup:browse'),
    restore: (filePath) => ipcRenderer.invoke('backup:restore', filePath),
    browseRestoreFile: () => ipcRenderer.invoke('backup:browseRestoreFile')
  },
  onScaleReading: (callback) => {
    const listener = (_event: IpcRendererEvent, reading: ScaleReading): void => callback(reading)
    ipcRenderer.on('scale:reading', listener)
    return () => ipcRenderer.removeListener('scale:reading', listener)
  },
  onScaleStatus: (callback) => {
    const listener = (_event: IpcRendererEvent, status: ScaleStatusInfo): void => callback(status)
    ipcRenderer.on('scale:status', listener)
    return () => ipcRenderer.removeListener('scale:status', listener)
  },
  onDataChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, entities: DataEntity[]): void => callback(entities)
    ipcRenderer.on('data:changed', listener)
    return () => ipcRenderer.removeListener('data:changed', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
