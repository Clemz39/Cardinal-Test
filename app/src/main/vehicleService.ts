import { scaleManager } from './scale/manager'
import { getVehicle, setStoredTare } from './repos/vehicleRepo'
import type { VehicleWithStats } from '../shared/types'

export function startReweigh(vehicleId: string): { ok: boolean; reason?: string } {
  const vehicle = getVehicle(vehicleId)
  if (!vehicle) return { ok: false, reason: 'Vehicle not found' }
  scaleManager.rampToRandomEmpty(vehicle.storedTare)
  return { ok: true }
}

export function cancelReweigh(): void {
  scaleManager.settleToZero()
}

export function confirmReweigh(vehicleId: string): { ok: boolean; reason?: string; vehicle?: VehicleWithStats } {
  const reading = scaleManager.getReading()
  if (!reading.stable) return { ok: false, reason: 'Reading not stable' }
  const vehicle = setStoredTare(vehicleId, reading.gross)
  scaleManager.settleToZero()
  return { ok: true, vehicle }
}

export function setManualTare(vehicleId: string, kg: number): VehicleWithStats {
  return setStoredTare(vehicleId, kg)
}
