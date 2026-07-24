import type { ScaleReading } from '../../shared/types'

const STABLE_TOKENS = new Set(['ST', 'STABLE', 'S', 'OK'])
const UNSTABLE_TOKENS = new Set(['US', 'UNSTABLE', 'MOTION', 'M'])
const NUMBER_RE = /([+-]?\d+(?:\.\d+)?)/
const LB_RE = /\blbs?\b/i
const KG_TO_LB = 1 / 0.45359237

export interface ParsedLine {
  /** Always normalized to kilograms. */
  weightKg: number
  /** null when the line carried no recognizable stability token — caller should fall back to a variance heuristic. */
  reportedStable: boolean | null
}

/**
 * Best-effort parser for whatever ASCII a weight indicator streams over serial.
 * Exact formats vary a lot by brand/firmware, so this looks for the two things
 * that are near-universal — a signed number (the weight) and, if present, a
 * stability token (most indicators prefix lines with something like ST/US) —
 * rather than assuming one vendor's exact byte layout.
 */
export function parseWeightLine(raw: string): ParsedLine | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const numberMatch = trimmed.match(NUMBER_RE)
  if (!numberMatch) return null
  let weightKg = parseFloat(numberMatch[1])
  if (Number.isNaN(weightKg)) return null
  if (LB_RE.test(trimmed)) weightKg = weightKg / KG_TO_LB

  const tokens = trimmed.toUpperCase().split(/[,\s]+/).filter(Boolean)
  let reportedStable: boolean | null = null
  for (const token of tokens) {
    if (STABLE_TOKENS.has(token)) {
      reportedStable = true
      break
    }
    if (UNSTABLE_TOKENS.has(token)) {
      reportedStable = false
      break
    }
  }

  return { weightKg, reportedStable }
}

const STABLE_WINDOW_MS = 1200
const STABLE_EPSILON_KG = 15

/**
 * Stateful line-by-line interpreter: turns raw indicator text into ScaleReading
 * objects, tracking stability over time for indicators that don't explicitly
 * flag it. Kept independent of the transport (serial, TCP, test harness) so it
 * can be exercised with plain strings in tests.
 */
export class ScaleLineInterpreter {
  private stableSince: number | null = null
  private lastWeightForStability = 0

  ingest(raw: string, now: number = Date.now()): ScaleReading | null {
    const parsed = parseWeightLine(raw)
    if (!parsed) return null

    const gross = Math.round(parsed.weightKg)
    let stable: boolean

    if (parsed.reportedStable !== null) {
      stable = parsed.reportedStable
      this.stableSince = stable ? (this.stableSince ?? now) : null
      this.lastWeightForStability = gross
    } else {
      if (Math.abs(gross - this.lastWeightForStability) > STABLE_EPSILON_KG || this.stableSince === null) {
        this.stableSince = now
      }
      this.lastWeightForStability = gross
      stable = now - this.stableSince >= STABLE_WINDOW_MS
    }

    return {
      gross,
      stable,
      pushButtonTare: 0,
      mode: 'GROSS',
      raw
    }
  }
}
