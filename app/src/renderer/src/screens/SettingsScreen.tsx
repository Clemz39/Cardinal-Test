import { useEffect, useRef, useState } from 'react'
import { Dot } from '../components/Dot'
import { FieldLabel } from '../components/FieldLabel'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import { formatDate, formatDateTime, formatTicketNumber } from '@shared/format'
import type { ScaleStatusInfo, SerialPortInfo, Settings } from '@shared/types'
import styles from './SettingsScreen.module.css'

const SERIAL_PORTS = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6']
const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
const PROTOCOLS = ['Cardinal SB', 'Cardinal SI', 'Toledo 8142', 'NCI 9000']
const DATA_BITS = [7, 8]
const PARITIES = ['None', 'Even', 'Odd']
const STOP_BITS = [1, 2]

const STATUS_LABEL: Record<ScaleStatusInfo['status'], string> = {
  connected: 'CONNECTED',
  connecting: 'CONNECTING…',
  disconnected: 'DISCONNECTED',
  error: 'CONNECTION ERROR'
}

const STATUS_COLOR: Record<ScaleStatusInfo['status'], string> = {
  connected: 'var(--color-green)',
  connecting: 'var(--color-amber-text)',
  disconnected: 'var(--color-text-faint)',
  error: '#e05555'
}

export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [streamLines, setStreamLines] = useState<string[] | null>(null)
  const [liveStream, setLiveStream] = useState(false)
  const [scaleStatus, setScaleStatus] = useState<ScaleStatusInfo | null>(null)
  const [detectedPorts, setDetectedPorts] = useState<SerialPortInfo[]>([])
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle')
  const [backupError, setBackupError] = useState<string | null>(null)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'running' | 'error'>('idle')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [calRecorded, setCalRecorded] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const loadSettings = (): void => {
    window.api.settings.get().then(setSettings)
  }

  useEffect(loadSettings, [])
  useDataChanged(['settings'], loadSettings)

  useEffect(() => {
    window.api.scale.getStatus().then(setScaleStatus)
    return window.api.onScaleStatus(setScaleStatus)
  }, [])

  useEffect(() => {
    if (settings?.dataSource !== 'serial') return
    const refresh = (): void => {
      window.api.scale.listPorts().then(setDetectedPorts)
      window.api.scale.getStatus().then(setScaleStatus)
    }
    refresh()
    const timer = setInterval(refresh, 2000)
    return () => clearInterval(timer)
  }, [settings?.dataSource])

  useEffect(() => {
    if (!liveStream) return
    return window.api.onScaleReading((reading) => {
      setStreamLines((prev) => [reading.raw, ...(prev ?? [])].slice(0, 30))
    })
  }, [liveStream])

  const patch = async (p: Partial<Settings>): Promise<void> => {
    const updated = await window.api.settings.update(p)
    setSettings(updated)
  }

  const handleBrowse = async (): Promise<void> => {
    const dir = await window.api.backup.browse()
    if (dir) patch({ backupPath: dir })
  }

  const handleBackupNow = async (): Promise<void> => {
    setBackupStatus('running')
    setBackupError(null)
    const result = await window.api.backup.now()
    if (result.ok) {
      setBackupStatus('ok')
    } else {
      setBackupStatus('error')
      setBackupError(result.error)
    }
  }

  const handleRestore = async (): Promise<void> => {
    const filePath = await window.api.backup.browseRestoreFile()
    if (!filePath) return
    const fileName = filePath.split(/[/\\]/).pop()
    const confirmed = window.confirm(
      `Restore "${fileName}"?\n\nThis will overwrite all current data with this backup and reload the app. This cannot be undone.`
    )
    if (!confirmed) return

    setRestoreStatus('running')
    setRestoreError(null)
    const result = await window.api.backup.restore(filePath)
    if (!result.ok) {
      setRestoreStatus('error')
      setRestoreError(result.error)
    }
    // on success the window reloads itself shortly after — stay in the running state until then
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('Logo must be an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be under 2MB')
      return
    }
    setLogoError(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') patch({ companyLogo: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleRecordCalibration = async (): Promise<void> => {
    await patch({ lastCalibration: new Date().toISOString() })
    setCalRecorded(true)
    setTimeout(() => setCalRecorded(false), 3000)
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
              <div className={styles.connectionFw}>Atlas Weigh Navigator · FW 2.14</div>
            </div>
            <div
              className={styles.statusPill}
              title={scaleStatus?.detail}
            >
              <Dot
                color={scaleStatus ? STATUS_COLOR[scaleStatus.status] : 'var(--color-text-faint)'}
                size={8}
                glow={scaleStatus?.status === 'connected'}
                pulse={scaleStatus?.status === 'connected' || scaleStatus?.status === 'connecting'}
              />
              <span className={styles.statusText}>{scaleStatus ? STATUS_LABEL[scaleStatus.status] : '—'}</span>
            </div>
          </div>

          <div className={styles.connectionGrid}>
            <div>
              <FieldLabel>DATA SOURCE</FieldLabel>
              <SelectField
                className={styles.connectionSelect}
                value={settings.dataSource}
                onChange={(e) => patch({ dataSource: e.target.value as Settings['dataSource'] })}
              >
                <option value="simulator">Simulator (demo)</option>
                <option value="serial">Real Serial Port</option>
              </SelectField>
            </div>
            <div>
              <FieldLabel>SERIAL PORT</FieldLabel>
              {settings.dataSource === 'serial' ? (
                <>
                  <TextField
                    mono
                    className={styles.connectionSelect}
                    value={settings.serialPort}
                    placeholder="e.g. COM5"
                    onChange={(e) => setSettings({ ...settings, serialPort: e.target.value })}
                    onBlur={(e) => patch({ serialPort: e.target.value.trim() || settings.serialPort })}
                  />
                  {detectedPorts.length > 0 && (
                    <div className={styles.portChips}>
                      {detectedPorts.map((p) => (
                        <span
                          key={p.path}
                          className={styles.portChip}
                          title={p.manufacturer}
                          onClick={() => patch({ serialPort: p.path })}
                        >
                          {p.path}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
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
              )}
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
              <div className={styles.streamButtons}>
                <button
                  type="button"
                  className={cx(styles.streamButton, liveStream && styles.streamButtonActive)}
                  onClick={() => {
                    if (!liveStream) setStreamLines([])
                    setLiveStream((v) => !v)
                  }}
                >
                  {liveStream ? '● Live' : 'Go Live'}
                </button>
                <button type="button" className={styles.streamButton} onClick={readNow} disabled={liveStream}>
                  Read Now
                </button>
              </div>
            </div>
            {streamLines && streamLines.length > 0 ? (
              <div className={styles.streamLines}>
                {streamLines.map((line, i) => (
                  <div key={i} className={line.toUpperCase().startsWith('US') ? styles.streamLineWarn : undefined}>
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.streamEmpty}>
                {streamLines ? 'No data on the line' : 'Press Go Live to watch the raw serial feed, or Read Now to sample it'}
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
                <span className={styles.kvLabel}>Last recertification</span>
                <span className={styles.kvValue}>{formatDate(settings.lastCalibration)}</span>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Recertification interval</span>
                <div className={styles.calIntervalWrap}>
                  <TextField
                    mono
                    type="number"
                    className={styles.kvInput}
                    value={settings.calibrationIntervalDays}
                    onChange={(e) => setSettings({ ...settings, calibrationIntervalDays: Number(e.target.value) })}
                    onBlur={(e) =>
                      patch({ calibrationIntervalDays: Number(e.target.value) || settings.calibrationIntervalDays })
                    }
                  />
                  <span className={styles.calIntervalUnit}>days</span>
                </div>
              </div>
              <div className={styles.calRecordRow}>
                <button type="button" className={styles.calRecordButton} onClick={handleRecordCalibration}>
                  Record Recertification Today
                </button>
                {calRecorded && <span className={styles.calRecordedNote}>Recorded</span>}
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
            <div className={styles.sideCardTitle}>Data Backup</div>
            <div className={styles.rowList}>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Backup folder</span>
                <div className={styles.backupPath}>
                  <span className={styles.backupPathText} title={settings.backupPath || undefined}>
                    {settings.backupPath || 'Not set'}
                  </span>
                  <button type="button" className={styles.backupBrowse} onClick={handleBrowse}>
                    Browse
                  </button>
                </div>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Auto-backup</span>
                <SelectField
                  className={styles.backupIntervalSelect}
                  value={settings.backupIntervalHours}
                  onChange={(e) => patch({ backupIntervalHours: Number(e.target.value) })}
                >
                  <option value={0}>Off</option>
                  <option value={6}>Every 6 h</option>
                  <option value={12}>Every 12 h</option>
                  <option value={24}>Daily</option>
                </SelectField>
              </div>
              <div className={styles.kvRow}>
                <span className={styles.kvLabel}>Last backup</span>
                <span className={styles.kvValue}>
                  {settings.lastBackupAt ? formatDateTime(settings.lastBackupAt) : '—'}
                </span>
              </div>
              <div className={styles.backupNowRow}>
                <button
                  type="button"
                  className={styles.backupNow}
                  disabled={!settings.backupPath || backupStatus === 'running'}
                  onClick={handleBackupNow}
                >
                  {backupStatus === 'running' ? 'Backing up…' : 'Backup Now'}
                </button>
                {backupStatus === 'ok' && (
                  <span className={cx(styles.backupFeedback, styles.backupFeedbackOk)}>Saved successfully</span>
                )}
                {backupStatus === 'error' && (
                  <span className={cx(styles.backupFeedback, styles.backupFeedbackError)}>
                    {backupError ?? 'Failed'}
                  </span>
                )}
              </div>
              <div className={styles.backupNowRow}>
                <button
                  type="button"
                  className={styles.backupRestore}
                  disabled={restoreStatus === 'running'}
                  onClick={handleRestore}
                >
                  {restoreStatus === 'running' ? 'Restoring…' : 'Restore from Backup'}
                </button>
                {restoreStatus === 'error' && (
                  <span className={cx(styles.backupFeedback, styles.backupFeedbackError)}>
                    {restoreError ?? 'Failed'}
                  </span>
                )}
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

          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>Company Branding</div>
            <div className={styles.rowList}>
              <div>
                <FieldLabel>COMPANY NAME</FieldLabel>
                <TextField
                  value={settings.facilityName}
                  onChange={(e) => setSettings({ ...settings, facilityName: e.target.value })}
                  onBlur={(e) => patch({ facilityName: e.target.value.trim() || settings.facilityName })}
                />
              </div>
              <div>
                <FieldLabel>ADDRESS</FieldLabel>
                <TextField
                  value={settings.facilityAddress}
                  onChange={(e) => setSettings({ ...settings, facilityAddress: e.target.value })}
                  onBlur={(e) => patch({ facilityAddress: e.target.value.trim() || settings.facilityAddress })}
                />
              </div>
              <div>
                <FieldLabel>OTHER DETAILS</FieldLabel>
                <textarea
                  className={styles.brandingTextarea}
                  rows={2}
                  placeholder="Phone · Email · License #"
                  value={settings.companyDetails}
                  onChange={(e) => setSettings({ ...settings, companyDetails: e.target.value })}
                  onBlur={(e) => patch({ companyDetails: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>LOGO — WATERMARK ON TICKET</FieldLabel>
                <div className={styles.logoRow}>
                  {settings.companyLogo ? (
                    <img className={styles.logoPreview} src={settings.companyLogo} alt="" />
                  ) : (
                    <div className={styles.logoPlaceholder}>No logo</div>
                  )}
                  <div className={styles.logoButtons}>
                    <button type="button" className={styles.backupBrowse} onClick={() => logoInputRef.current?.click()}>
                      Upload
                    </button>
                    {settings.companyLogo && (
                      <button type="button" className={styles.backupRestore} onClick={() => patch({ companyLogo: null })}>
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoChange}
                  />
                </div>
                {logoError && <div className={cx(styles.backupFeedback, styles.backupFeedbackError)}>{logoError}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
