import { useEffect, useState } from 'react'
import { Dot } from '../components/Dot'
import { FieldLabel } from '../components/FieldLabel'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import { formatDate, formatTicketNumber } from '@shared/format'
import type { Settings } from '@shared/types'
import styles from './SettingsScreen.module.css'

const SERIAL_PORTS = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6']
const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
const PROTOCOLS = ['Cardinal SB', 'Cardinal SI', 'Toledo 8142', 'NCI 9000']
const DATA_BITS = [7, 8]
const PARITIES = ['None', 'Even', 'Odd']
const STOP_BITS = [1, 2]

export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [streamLines, setStreamLines] = useState<string[] | null>(null)

  const loadSettings = (): void => {
    window.api.settings.get().then(setSettings)
  }

  useEffect(loadSettings, [])
  useDataChanged(['settings'], loadSettings)

  const patch = async (p: Partial<Settings>): Promise<void> => {
    const updated = await window.api.settings.update(p)
    setSettings(updated)
  }

  const readNow = (): void => {
    window.api.scale.recentLines(3).then(setStreamLines)
  }

  if (!settings) return null

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.title}>Settings</div>
        <div className={styles.subtitle}>Weigh indicator connection · scale · ticketing</div>
      </div>

      <div className={styles.body}>
        <div className={styles.connectionCard}>
          <div className={styles.connectionHeader}>
            <div>
              <div className={styles.connectionName}>Weigh Indicator</div>
              <div className={styles.connectionFw}>Cardinal 225 Navigator · FW 2.14</div>
            </div>
            <div className={styles.statusPill}>
              <Dot color="var(--color-green)" size={8} glow pulse />
              <span className={styles.statusText}>CONNECTED</span>
            </div>
          </div>

          <div className={styles.connectionGrid}>
            <div>
              <FieldLabel>SERIAL PORT</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.serialPort}
                onChange={(e) => patch({ serialPort: e.target.value })}
              >
                {SERIAL_PORTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>BAUD RATE</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.baudRate}
                onChange={(e) => patch({ baudRate: Number(e.target.value) })}
              >
                {BAUD_RATES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>PROTOCOL</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.protocol}
                onChange={(e) => patch({ protocol: e.target.value })}
              >
                {PROTOCOLS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>DATA BITS</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.dataBits}
                onChange={(e) => patch({ dataBits: Number(e.target.value) })}
              >
                {DATA_BITS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>PARITY</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.parity}
                onChange={(e) => patch({ parity: e.target.value })}
              >
                {PARITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>STOP BITS</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.stopBits}
                onChange={(e) => patch({ stopBits: Number(e.target.value) })}
              >
                {STOP_BITS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className={styles.streamPanel}>
            <div className={styles.streamHead}>
              <span className={styles.streamLabel}>LIVE STREAM TEST</span>
              <button type="button" className={styles.streamButton} onClick={readNow}>
                Read Now
              </button>
            </div>
            {streamLines && streamLines.length > 0 ? (
              <div className={styles.streamLines}>
                {streamLines.map((line, i) => (
                  <div key={i} className={line.startsWith('US') ? styles.streamLineWarn : undefined}>
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.streamEmpty}>
                {streamLines ? 'No data on the line' : 'Press Read Now to sample the serial line'}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sideCol}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>Scale Configuration</div>
            <div className={styles.rowList}>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Capacity</span>
                <span className={styles.kvValue}>{settings.scaleCapacityKg.toLocaleString('en-US')} kg</span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Division</span>
                <span className={styles.kvValue}>{settings.scaleDivisionKg} kg</span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Units</span>
                <span className={styles.kvValue}>kg / t</span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Last calibration</span>
                <span className={styles.kvValue}>{formatDate(settings.lastCalibration)}</span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Tare validity</span>
                <TextField
                  mono
                  type="number"
                  className={styles.kvInput}
                  value={settings.tareValidityDays}
                  onChange={(e) => setSettings({ ...settings, tareValidityDays: Number(e.target.value) })}
                  onBlur={(e) => patch({ tareValidityDays: Number(e.target.value) || settings.tareValidityDays })}
                />
              </div>
            </div>
          </div>

          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>Ticketing &amp; Printer</div>
            <div className={styles.rowList}>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Next ticket #</span>
                <span className={styles.kvValue}>{formatTicketNumber(settings.nextTicketNumber)}</span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Printer</span>
                <TextField
                  className={styles.kvTextInput}
                  value={settings.printerName}
                  onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
                  onBlur={(e) => patch({ printerName: e.target.value.trim() || settings.printerName })}
                />
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Auto-print</span>
                <span
                  className={cx(styles.togglePill, settings.autoPrint ? styles.toggleOn : styles.toggleOff)}
                  onClick={() => patch({ autoPrint: !settings.autoPrint })}
                >
                  {settings.autoPrint ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Copies</span>
                <TextField
                  mono
                  type="number"
                  className={styles.kvInput}
                  value={settings.copies}
                  onChange={(e) => setSettings({ ...settings, copies: Number(e.target.value) })}
                  onBlur={(e) => patch({ copies: Math.max(1, Number(e.target.value) || settings.copies) })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
