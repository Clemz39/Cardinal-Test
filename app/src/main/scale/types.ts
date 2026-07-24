import type { EventEmitter } from 'events'
import type { ScaleReading, ScaleStatusInfo } from '../../shared/types'

export type { ScaleStatusInfo }

/**
 * Common contract for anything that can produce ScaleReading events — the
 * demo simulator and a real serial-connected indicator both implement this,
 * so the rest of the app (ticketService, vehicleService, IPC) never needs to
 * know which one is active.
 */
export interface ScaleDriver extends EventEmitter {
  start(): void
  stop(): void
  getReading(): ScaleReading
  getRecentLines(limit?: number): string[]
  getStatus(): ScaleStatusInfo
  pressZero(): { ok: boolean; reason?: string }
  pressTareButton(): { ok: boolean; reason?: string }
  /** Simulator-only concept — real hardware just reports whatever is physically on the scale. */
  rampToRandomGross(tareKg: number): number
  rampToRandomEmpty(previousTareKg?: number | null): number
  settleToZero(): void
}
