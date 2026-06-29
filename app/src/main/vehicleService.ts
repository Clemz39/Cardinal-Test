import { scaleSimulator } from './scaleSimulator'
import { getVehicle, setStoredTare } from './repos/vehicleRepo'
import type { VehicleWithStats } from '../shared/types'

export function startReweigh(vehicleId: string): { ok: boolean; reason?: string } {
  const vehicle = getVehicle(vehicleId)
  if (!vehicle) return { ok: false, reason: 'Vehicle not found' }
  scaleSimulator.rampToRandomEmpty(vehicle.storedTare)
  return { ok: true }
}

export function cancelReweigh(): void {
  scaleSimulator.settleToZero()
}

export function confirmReweigh(vehicleId: string): { ok: boolean; reason?: string; vehicle?: VehicleWithStats } {
  const reading = scaleSimulator.getReading()
  if (!reading.stable) return { ok: false, reason: 'Reading not stable' }
  const vehicle = setStoredTare(vehicleId, reading.gross)
  scaleSimulator.settleToZero()
  return { ok: true, vehicle }
}

export function setManualTare(vehicleId: string, kg: number): VehicleWithStats {
  return setStoredTare(vehicleId, kg)
}
