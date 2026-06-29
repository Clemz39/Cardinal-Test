import { getDb } from '../db'
import type { Settings } from '../../shared/types'
import { notify } from '../events'

interface SettingsRow extends Omit<Settings, 'autoPrint'> {
  autoPrint: number
}

function rowToSettings(row: SettingsRow): Settings {
  return { ...row, autoPrint: !!row.autoPrint }
}

export function getSettings(): Settings {
  const row = getDb().prepare('SELECT * FROM settings WHERE id = 1').get() as SettingsRow
  return rowToSettings(row)
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const current = getSettings()
  const next: Settings = { ...current, ...patch }
  getDb()
    .prepare(
      `UPDATE settings SET
        facilityName=@facilityName, facilityAddress=@facilityAddress, ntepCert=@ntepCert,
        operatorName=@operatorName, scaleLabel=@scaleLabel,
        serialPort=@serialPort, baudRate=@baudRate, protocol=@protocol, dataBits=@dataBits,
        parity=@parity, stopBits=@stopBits,
        scaleCapacityKg=@scaleCapacityKg, scaleDivisionKg=@scaleDivisionKg,
        lastCalibration=@lastCalibration, tareValidityDays=@tareValidityDays,
        nextTicketNumber=@nextTicketNumber, printerName=@printerName,
        autoPrint=@autoPrint, copies=@copies
      WHERE id = 1`
    )
    .run({ ...next, autoPrint: next.autoPrint ? 1 : 0 })
  notify('settings')
  return getSettings()
}

// The number an unsaved draft should use. Not consumed until finalizeDraftNumber() runs.
export function peekNextTicketNumber(): number {
  const row = getDb().prepare('SELECT nextTicketNumber FROM settings WHERE id = 1').get() as {
    nextTicketNumber: number
  }
  return row.nextTicketNumber
}

// Advances the counter past a number once its draft has actually been saved.
export function advanceTicketCounterPast(n: number): void {
  getDb()
    .prepare('UPDATE settings SET nextTicketNumber = MAX(nextTicketNumber, ?) WHERE id = 1')
    .run(n + 1)
  notify('settings')
}
