import { EventEmitter } from 'events'
import type { ScaleReading } from '../../shared/types'
import type { ScaleDriver, ScaleStatusInfo } from './types'
import { ScaleLineInterpreter } from './genericParser'

const RECONNECT_DELAY_MS = 3000
const MAX_LINES = 200

export interface SerialDriverConfig {
  path: string
  baudRate: number
  dataBits: 7 | 8
  parity: 'none' | 'even' | 'odd'
  stopBits: 1 | 2
}

interface OpenPort {
  close(callback?: (err: Error | null) => void): void
}

/**
 * Real RS-232/USB-serial connection to a weight indicator. Protocol details
 * vary by brand, so line parsing is delegated to ScaleLineInterpreter (a
 * best-effort generic reader) rather than a hardcoded byte layout — see
 * genericParser.ts for the parsing rules and how to tighten them once real
 * sample lines from the indicator are available.
 *
 * The indicator is expected to stream raw GROSS weight continuously; this app
 * handles all tare math in software (vehicle stored tare / manual capture),
 * so ZERO/TARE here are intentionally not wired to remote commands — use the
 * indicator's own physical buttons.
 */
export class SerialScaleDriver extends EventEmitter implements ScaleDriver {
  private config: SerialDriverConfig
  private port: OpenPort | null = null
  private status: ScaleStatusInfo = { status: 'disconnected' }
  private lastLines: string[] = []
  private lastReading: ScaleReading = { gross: 0, stable: false, pushButtonTare: 0, mode: 'GROSS', raw: '' }
  private interpreter = new ScaleLineInterpreter()
  private reconnectTimer: NodeJS.Timeout | null = null
  private stopped = true
  private connecting = false
  private rawBytesReceived = 0
  private linesReceived = 0

  constructor(config: SerialDriverConfig) {
    super()
    this.config = config
  }

  updateConfig(config: SerialDriverConfig): void {
    this.config = config
    if (!this.stopped) {
      this.stop()
      this.start()
    }
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    void this.connect()
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.port?.close()
    this.port = null
    this.setStatus({ status: 'disconnected' })
  }

  getStatus(): ScaleStatusInfo {
    if (this.status.status !== 'connected') return this.status
    return {
      status: 'connected',
      detail: `${this.config.path} — ${this.rawBytesReceived} bytes, ${this.linesReceived} line${this.linesReceived === 1 ? '' : 's'} received`
    }
  }

  private setStatus(status: ScaleStatusInfo): void {
    this.status = status
    this.emit('status', status)
  }

  private async connect(): Promise<void> {
    if (this.stopped || this.connecting) return
    this.connecting = true
    this.rawBytesReceived = 0
    this.linesReceived = 0
    this.setStatus({ status: 'connecting', detail: this.config.path })

    try {
      const { SerialPort } = await import('serialport')
      const { RegexParser } = await import('@serialport/parser-regex')

      const port = new SerialPort({
        path: this.config.path,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        parity: this.config.parity,
        stopBits: this.config.stopBits,
        autoOpen: false
      })

      port.on('error', (err: Error) => {
        this.connecting = false
        this.setStatus({ status: 'error', detail: err.message })
        this.scheduleReconnect()
      })

      port.on('close', () => {
        this.port = null
        if (!this.stopped) {
          this.setStatus({ status: 'disconnected', detail: 'Connection closed' })
          this.scheduleReconnect()
        }
      })

      port.open((err: Error | null) => {
        this.connecting = false
        if (err) {
          this.setStatus({ status: 'error', detail: err.message })
          this.scheduleReconnect()
          return
        }
        this.setStatus({ status: 'connected', detail: this.config.path })
      })

      // Line endings vary a lot by indicator/firmware (CRLF, bare CR, bare LF) — match any of them
      // rather than assuming one, so a wrong guess here doesn't silently swallow every line.
      const parser = port.pipe(new RegexParser({ regex: /\r\n|\r|\n/ }))
      parser.on('data', (line: string) => this.handleLine(line))
      port.on('data', (chunk: Buffer) => {
        this.rawBytesReceived += chunk.length
      })

      this.port = port
    } catch (err) {
      this.connecting = false
      this.setStatus({ status: 'error', detail: err instanceof Error ? err.message : String(err) })
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, RECONNECT_DELAY_MS)
  }

  private handleLine(raw: string): void {
    this.linesReceived += 1
    this.lastLines.unshift(raw)
    if (this.lastLines.length > MAX_LINES) this.lastLines.pop()

    const reading = this.interpreter.ingest(raw)
    if (!reading) return
    this.lastReading = reading
    this.emit('reading', reading)
  }

  getReading(): ScaleReading {
    return this.lastReading
  }

  getDiagnostics(): { rawBytesReceived: number; linesReceived: number } {
    return { rawBytesReceived: this.rawBytesReceived, linesReceived: this.linesReceived }
  }

  getRecentLines(limit = 12): string[] {
    return this.lastLines.slice(0, limit)
  }

  pressZero(): { ok: boolean; reason?: string } {
    return { ok: false, reason: 'Use the indicator’s physical ZERO button' }
  }

  pressTareButton(): { ok: boolean; reason?: string } {
    return { ok: false, reason: 'Use the indicator’s physical TARE button' }
  }

  rampToRandomGross(): number {
    return this.lastReading.gross
  }

  rampToRandomEmpty(): number {
    return this.lastReading.gross
  }

  settleToZero(): void {
    // no-op — the real weight comes from whatever is physically on the scale
  }
}

export async function listSerialPorts(): Promise<{ path: string; manufacturer?: string }[]> {
  const { SerialPort } = await import('serialport')
  const ports = await SerialPort.list()
  return ports.map((p) => ({ path: p.path, manufacturer: p.manufacturer }))
}
