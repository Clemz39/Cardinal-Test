export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Math.round(value).toLocaleString('en-US')
}

export function formatKgUnit(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${formatKg(value)} kg`
}

export function formatTonnes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${(value / 1000).toFixed(1)} t`
}

export function formatTicketNumber(n: number): string {
  return String(n).padStart(7, '0')
}

export function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(6, '0')}`
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPricePerKg(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `$${value.toFixed(3)} / kg`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`
}

export function formatDateTimeLong(iso: string): string {
  return `${formatDateLong(iso)} ${formatTime(iso)}`
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime()
  const b = new Date(isoB).getTime()
  return Math.abs(a - b) / (1000 * 60 * 60 * 24)
}

export type CalibrationStatus = 'ok' | 'dueSoon' | 'overdue'

const CALIBRATION_DUE_SOON_DAYS = 30

export function nextCalibrationDate(lastCalibration: string, intervalDays: number): string {
  const due = new Date(lastCalibration)
  due.setDate(due.getDate() + intervalDays)
  return due.toISOString()
}

export function getCalibrationStatus(
  lastCalibration: string,
  intervalDays: number,
  now: Date = new Date()
): { status: CalibrationStatus; dueDate: string; daysRemaining: number } {
  const dueDate = nextCalibrationDate(lastCalibration, intervalDays)
  const daysRemaining = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const status: CalibrationStatus = daysRemaining < 0 ? 'overdue' : daysRemaining <= CALIBRATION_DUE_SOON_DAYS ? 'dueSoon' : 'ok'
  return { status, dueDate, daysRemaining }
}
