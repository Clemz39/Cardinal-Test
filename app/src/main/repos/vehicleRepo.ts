import { getDb } from '../db'
import type { Ticket, TareValidity, Vehicle, VehicleWithStats } from '../../shared/types'
import { daysBetween } from '../../shared/format'
import { getSettings } from './settingsRepo'
import { notify } from '../events'

function computeValidity(tareCapturedAt: string | null, validityDays: number): TareValidity {
  if (!tareCapturedAt) return 'none'
  const days = daysBetween(tareCapturedAt, new Date().toISOString())
  return days <= validityDays ? 'valid' : 'stale'
}

function withStats(v: Vehicle): VehicleWithStats {
  const db = getDb()
  const last = db
    .prepare('SELECT createdAt FROM tickets WHERE vehicleId = ? ORDER BY createdAt DESC LIMIT 1')
    .get(v.id) as { createdAt: string } | undefined
  const { tareValidityDays } = getSettings()
  return {
    ...v,
    lastWeighed: last?.createdAt ?? null,
    tareValidity: computeValidity(v.tareCapturedAt, tareValidityDays)
  }
}

export function listVehicles(query?: string): VehicleWithStats[] {
  const db = getDb()
  let rows: Vehicle[]
  if (query && query.trim()) {
    const q = `%${query.trim().toLowerCase()}%`
    rows = db
      .prepare(
        `SELECT * FROM vehicles WHERE lower(id) LIKE ? OR lower(plate) LIKE ? OR lower(hauler) LIKE ? OR lower(description) LIKE ? ORDER BY id`
      )
      .all(q, q, q, q) as Vehicle[]
  } else {
    rows = db.prepare('SELECT * FROM vehicles ORDER BY id').all() as Vehicle[]
  }
  return rows.map(withStats)
}

export function getVehicle(id: string): VehicleWithStats | null {
  const row = getDb().prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as Vehicle | undefined
  return row ? withStats(row) : null
}

export function createVehicle(input: Omit<Vehicle, 'storedTare' | 'tareCapturedAt'> & Partial<Pick<Vehicle, 'storedTare' | 'tareCapturedAt'>>): VehicleWithStats {
  getDb()
    .prepare(
      'INSERT INTO vehicles (id, description, hauler, plate, storedTare, tareCapturedAt) VALUES (@id, @description, @hauler, @plate, @storedTare, @tareCapturedAt)'
    )
    .run({
      id: input.id,
      description: input.description,
      hauler: input.hauler,
      plate: input.plate,
      storedTare: input.storedTare ?? null,
      tareCapturedAt: input.tareCapturedAt ?? null
    })
  notify('vehicles')
  return getVehicle(input.id)!
}

export function updateVehicle(id: string, patch: Partial<Omit<Vehicle, 'id'>>): VehicleWithStats {
  const current = getVehicle(id)
  if (!current) throw new Error(`Vehicle ${id} not found`)
  const next = { ...current, ...patch }
  getDb()
    .prepare(
      'UPDATE vehicles SET description=@description, hauler=@hauler, plate=@plate, storedTare=@storedTare, tareCapturedAt=@tareCapturedAt WHERE id=@id'
    )
    .run({
      id,
      description: next.description,
      hauler: next.hauler,
      plate: next.plate,
      storedTare: next.storedTare,
      tareCapturedAt: next.tareCapturedAt
    })
  notify('vehicles')
  return getVehicle(id)!
}

export function deleteVehicle(id: string): void {
  getDb().prepare('DELETE FROM vehicles WHERE id = ?').run(id)
  notify('vehicles')
}

export function setStoredTare(id: string, kg: number): VehicleWithStats {
  return updateVehicle(id, { storedTare: kg, tareCapturedAt: new Date().toISOString() })
}

export function getVehicleHistory(id: string, limit = 8): Ticket[] {
  return getDb()
    .prepare('SELECT * FROM tickets WHERE vehicleId = ? AND status = ? ORDER BY createdAt DESC LIMIT ?')
    .all(id, 'done', limit) as Ticket[]
}
