import { EventEmitter } from 'events'
import type { ScaleReading } from '../shared/types'

const TICK_MS = 200
const STABLE_WINDOW_MS = 1200
const STABLE_EPSILON_KG = 15
const REST_JITTER_KG = 4
const MOVING_JITTER_KG = 35
const RAMP_KG_PER_TICK = 900

function fmtRaw(weight: number, stable: boolean): string {
  const sign = weight >= 0 ? '+' : '-'
  const mag = String(Math.round(Math.abs(weight))).padStart(6, '0')
  return `${stable ? 'ST' : 'US'},GS,${sign}${mag} kg`
}

export class ScaleSimulator extends EventEmitter {
  private current = 0
  private target = 0
  private pushButtonTare = 0
  private stableMs = 0
  private timer: NodeJS.Timeout | null = null
  private lastLines: string[] = []

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private tick(): void {
    const moving = Math.abs(this.target - this.current) > 2
    if (moving) {
      const step = Math.sign(this.target - this.current) * Math.min(RAMP_KG_PER_TICK, Math.abs(this.target - this.current))
      this.current += step + (Math.random() - 0.5) * MOVING_JITTER_KG
      this.stableMs = 0
    } else {
      this.current = this.target + (Math.random() - 0.5) * REST_JITTER_KG
      this.stableMs += TICK_MS
    }

    const stable = this.stableMs >= STABLE_WINDOW_MS
    const reading = this.snapshot(stable)
    this.lastLines.unshift(reading.raw)
    if (this.lastLines.length > 50) this.lastLines.pop()
    this.emit('reading', reading)
  }

  private snapshot(stable: boolean): ScaleReading {
    const gross = Math.max(0, Math.round(this.current))
    return {
      gross,
      stable,
      pushButtonTare: this.pushButtonTare,
      mode: this.pushButtonTare > 0 ? 'NET' : 'GROSS',
      raw: fmtRaw(gross, stable)
    }
  }

  getReading(): ScaleReading {
    return this.snapshot(this.stableMs >= STABLE_WINDOW_MS)
  }

  getRecentLines(limit = 12): string[] {
    return this.lastLines.slice(0, limit)
  }

  /** Truck with a known/assumed tare pulls onto the scale, loaded. */
  rampToRandomGross(tareKg: number): number {
    const payload = 16500 + Math.random() * 7000
    const target = Math.round(tareKg + payload)
    this.target = target
    this.pushButtonTare = 0
    this.stableMs = 0
    return target
  }

  /** Empty truck pulls on for a tare re-weigh. */
  rampToRandomEmpty(previousTareKg?: number | null): number {
    const target = previousTareKg
      ? Math.round(previousTareKg + (Math.random() - 0.5) * 300)
      : Math.round(11000 + Math.random() * 4500)
    this.target = Math.max(0, target)
    this.pushButtonTare = 0
    this.stableMs = 0
    return this.target
  }

  /** Truck pulls off; scale returns to empty. */
  settleToZero(): void {
    this.target = 0
    this.pushButtonTare = 0
    this.stableMs = 0
  }

  pressZero(): { ok: boolean; reason?: string } {
    if (Math.abs(this.current) > 60) {
      return { ok: false, reason: 'Cannot zero — load on scale' }
    }
    this.current = 0
    this.target = 0
    this.stableMs = 0
    return { ok: true }
  }

  pressTareButton(): { ok: boolean; reason?: string } {
    if (this.pushButtonTare > 0) {
      this.pushButtonTare = 0
      return { ok: true }
    }
    if (this.stableMs < STABLE_WINDOW_MS) {
      return { ok: false, reason: 'Reading not stable' }
    }
    this.pushButtonTare = Math.max(0, Math.round(this.current))
    return { ok: true }
  }
}

export const scaleSimulator = new ScaleSimulator()
