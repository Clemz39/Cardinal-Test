export type TicketStatus = 'live' | 'done'
export type TareSource = 'stored' | 'manual' | 'none'
export type TareValidity = 'valid' | 'stale' | 'none'

export interface Ticket {
  id: string // zero-padded ticket number, e.g. "0048213"
  createdAt: string // ISO timestamp
  capturedAt: string | null
  vehicleId: string | null
  vehicleDesc: string | null
  hauler: string | null
  commodity: string | null
  invoiceNumber: string | null
  originBin: string | null
  gross: number | null // kg
  tare: number | null // kg
  net: number | null // kg
  unitPrice: number | null // price per kg, snapshotted when commodity is selected
  tareSource: TareSource
  status: TicketStatus
  direction: 'inbound' | 'outbound'
}

export interface Vehicle {
  id: string // e.g. "TRK-148"
  description: string // e.g. "Peterbilt 579"
  hauler: string
  plate: string
  storedTare: number | null // kg
  tareCapturedAt: string | null // ISO date
}

export interface VehicleWithStats extends Vehicle {
  lastWeighed: string | null // ISO timestamp of most recent ticket, derived
  tareValidity: TareValidity
}

export interface Product {
  id: string
  name: string
  color: string
  pricePerKg: number
}

export interface ProductWithStats extends Product {
  loadsToday: number // derived
}

export interface Settings {
  // facility
  facilityName: string
  facilityAddress: string
  ntepCert: string
  operatorName: string
  scaleLabel: string
  // connection
  dataSource: 'simulator' | 'serial'
  serialPort: string
  baudRate: number
  protocol: string
  dataBits: number
  parity: string
  stopBits: number
  // scale configuration
  scaleCapacityKg: number
  scaleDivisionKg: number
  lastCalibration: string // ISO date
  tareValidityDays: number
  // ticketing & printer
  nextTicketNumber: number
  nextInvoiceNumber: number
  printerName: string
  autoPrint: boolean
  copies: number
  // company branding (printed on tickets)
  companyDetails: string
  companyLogo: string | null // data URL
  // backup
  backupPath: string
  backupIntervalHours: number
  lastBackupAt: string | null
}

export interface ScaleReading {
  gross: number // live raw scale weight, kg
  stable: boolean
  pushButtonTare: number // kg, 0 if not engaged
  mode: 'GROSS' | 'NET'
  raw: string // protocol line, e.g. "ST,GS,+035570 kg"
}

export type ScaleConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface ScaleStatusInfo {
  status: ScaleConnectionStatus
  detail?: string
}

export interface SerialPortInfo {
  path: string
  manufacturer?: string
}

export interface ReportRange {
  from: string // ISO
  to: string // ISO
}

export type DateRangeKey = 'today' | 'week' | 'month'

export interface ReportSummary {
  netReceivedKg: number
  ticketCount: number
  inboundCount: number
  outboundCount: number
  avgNetPerLoadKg: number
  topCommodity: string | null
  topCommodityPct: number
  commodityBars: { name: string; color: string; valueKg: number; pct: number }[]
  topHaulers: { name: string; loads: number; netKg: number }[]
}

export interface TicketFilter {
  range?: ReportRange
  search?: string
  commodity?: string
  hauler?: string
}

export type DataEntity = 'tickets' | 'vehicles' | 'products' | 'settings' | 'draft'

export type UserRole = 'operator' | 'technician'

export interface AuthUser {
  id: string
  name: string
  username: string
  role: UserRole
}
