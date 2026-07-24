import { EventEmitter } from 'events'
import type { ScaleReading, Settings } from '../../shared/types'
import type { ScaleDriver, ScaleStatusInfo } from './types'
import { ScaleSimulatorDriver } from './simulatorDriver'
import { SerialScaleDriver, type SerialDriverConfig } from './serialDriver'
import { getSettings } from '../repos/settingsRepo'
import { dataBus } from '../events'

function toParity(p: string): 'none' | 'even' | 'odd' {
  const lower = p.toLowerCase()
  return lower === 'even' || lower === 'odd' ? lower : 'none'
}

function toSerialConfig(settings: Settings): SerialDriverConfig {
  return {
    path: settings.serialPort,
    baudRate: settings.baudRate,
    dataBits: settings.dataBits === 7 ? 7 : 8,
    parity: toParity(settings.parity),
    stopBits: settings.stopBits === 2 ? 2 : 1
  }
}

/**
 * Picks between the demo simulator and a real serial-connected indicator
 * based on Settings.dataSource, and reacts live when that setting (or the
 * serial connection params) changes — no app restart needed to switch modes.
 */
class ScaleManager extends EventEmitter {
  private simulator = new ScaleSimulatorDriver()
  private serial: SerialScaleDriver | null = null
  private active: ScaleDriver

  constructor() {
    super()
    this.active = this.simulator
    this.wireDriverEvents(this.simulator)
    dataBus.on('changed', (entities: string[]) => {
      if (entities.includes('settings')) this.applySettings(getSettings())
    })
  }

  start(): void {
    this.applySettings(getSettings())
  }

  stop(): void {
    this.simulator.stop()
    this.serial?.stop()
  }

  private applySettings(settings: Settings): void {
    if (settings.dataSource === 'serial') {
      const config = toSerialConfig(settings)
      if (!this.serial) {
        this.serial = new SerialScaleDriver(config)
        this.wireDriverEvents(this.serial)
      } else {
        this.serial.updateConfig(config)
      }
      if (this.active !== this.serial) {
        this.simulator.stop()
        this.active = this.serial
      }
      this.serial.start()
    } else {
      if (this.active !== this.simulator) {
        this.serial?.stop()
        this.active = this.simulator
      }
      this.simulator.start()
    }
    this.emit('status', this.active.getStatus())
  }

  private wireDriverEvents(driver: ScaleDriver): void {
    driver.on('reading', (reading: ScaleReading) => {
      if (this.active === driver) this.emit('reading', reading)
    })
    driver.on('status', (status: ScaleStatusInfo) => {
      if (this.active === driver) this.emit('status', status)
    })
  }

  getReading(): ScaleReading {
    return this.active.getReading()
  }

  getRecentLines(limit?: number): string[] {
    return this.active.getRecentLines(limit)
  }

  getStatus(): ScaleStatusInfo {
    return this.active.getStatus()
  }

  pressZero(): { ok: boolean; reason?: string } {
    return this.active.pressZero()
  }

  pressTareButton(): { ok: boolean; reason?: string } {
    return this.active.pressTareButton()
  }

  rampToRandomGross(tareKg: number): number {
    return this.active.rampToRandomGross(tareKg)
  }

  rampToRandomEmpty(previousTareKg?: number | null): number {
    return this.active.rampToRandomEmpty(previousTareKg)
  }

  settleToZero(): void {
    this.active.settleToZero()
  }
}

export const scaleManager = new ScaleManager()
