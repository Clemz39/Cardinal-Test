import { useEffect, useRef, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Dot } from '../components/Dot'
import { FieldLabel } from '../components/FieldLabel'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import {
  formatDateLong,
  formatDate,
  formatKg,
  formatKgUnit,
  formatTime,
  formatTonnes,
  formatMoney,
  getCalibrationStatus
} from '@shared/format'
import type { ProductWithStats, ScaleReading, Settings, Ticket, VehicleWithStats } from '@shared/types'
import styles from './WeighScreen.module.css'

interface WeighScreenProps {
  onPrint: (ticketId: string) => void
}

function tareForReading(reading: ScaleReading | null, vehicle: VehicleWithStats | null): number {
  if (!reading) return 0
  if (reading.pushButtonTare > 0) return reading.pushButtonTare
  return vehicle?.storedTare ?? 0
}

export function WeighScreen({ onPrint }: WeighScreenProps) {
  const [draft, setDraft] = useState<Ticket | null>(null)
  const [reading, setReading] = useState<ScaleReading | null>(null)
  const [vehicle, setVehicle] = useState<VehicleWithStats | null>(null)
  const [products, setProducts] = useState<ProductWithStats[]>([])
  const [haulers, setHaulers] = useState<string[]>([])
  const [recent, setRecent] = useState<Ticket[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadDraft = (): void => {
    window.api.draft.get().then(setDraft)
  }
  const loadRecent = (): void => {
    window.api.tickets.recentDone(3).then(setRecent)
  }
  const loadProducts = (): void => {
    window.api.products.list().then(setProducts)
  }
  const loadHaulers = (): void => {
    window.api.tickets.distinctHaulers().then(setHaulers)
  }

  useEffect(() => {
    loadDraft()
    loadRecent()
    loadProducts()
    loadHaulers()
    window.api.scale.getReading().then(setReading)
    window.api.settings.get().then(setSettings)
    return window.api.onScaleReading(setReading)
  }, [])

  useDataChanged(['draft'], loadDraft)
  useDataChanged(['tickets'], loadRecent)
  useDataChanged(['products'], loadProducts)
  useDataChanged(['settings'], () => window.api.settings.get().then(setSettings))

  useEffect(() => {
    if (!draft?.vehicleId) {
      setVehicle(null)
      return
    }
    window.api.vehicles.get(draft.vehicleId).then(setVehicle)
  }, [draft?.vehicleId])
  useDataChanged(['vehicles'], () => {
    if (draft?.vehicleId) window.api.vehicles.get(draft.vehicleId).then(setVehicle)
  })

  if (!draft) return null

  const tare = tareForReading(reading, vehicle)
  const gross = reading?.gross ?? 0
  const net = gross - tare
  const stable = reading?.stable ?? false
  const mode = reading?.mode ?? 'GROSS'
  const calibration = settings ? getCalibrationStatus(settings.lastCalibration, settings.calibrationIntervalDays) : null

  const runAction = async (action: () => Promise<{ ok: boolean; reason?: string }>): Promise<void> => {
    const result = await action()
    setActionError(result.ok ? null : result.reason ?? 'Action failed')
  }

  const handleCaptureGross = async (): Promise<void> => {
    const result = await window.api.draft.captureGross()
    if (!result.ok) {
      setActionError(result.reason ?? 'Capture failed')
    }
  }

  const handleSave = async (): Promise<void> => {
    const result = await window.api.draft.save()
    if (!result.ok) {
      setActionError(result.reason ?? 'Save failed')
      return
    }
    setActionError(null)
    if (settings?.autoPrint && result.saved) {
      void window.api.tickets.print(result.saved.id, settings.copies)
    }
  }

  return (
    <div className={styles.screen}>
      {calibration && calibration.status !== 'ok' && (
        <div className={cx(styles.calBanner, calibration.status === 'overdue' && styles.calBannerOverdue)}>
          <span className={styles.calBannerIcon}>{calibration.status === 'overdue' ? '⚠' : '◷'}</span>
          <span>
            {calibration.status === 'overdue'
              ? `Scale recalibration was due ${formatDate(calibration.dueDate)} — schedule service as soon as possible.`
              : `Scale recalibration due ${formatDate(calibration.dueDate)} (${calibration.daysRemaining} day${calibration.daysRemaining === 1 ? '' : 's'}) — schedule service soon.`}
          </span>
        </div>
      )}
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div>
            <div className={styles.netLabel}>NET · kg</div>
            <div className={styles.netValue}>{formatKg(net)}</div>
          </div>
          <div className={styles.bannerSub}>
            <div className={styles.bannerSubRow}>
              <span className={styles.bannerSubLabel}>GROSS</span>
              <span className={styles.bannerSubValueGross}>{formatKg(gross)}</span>
            </div>
            <div className={styles.bannerSubRow}>
              <span className={styles.bannerSubLabel}>TARE</span>
              <span className={styles.bannerSubValueTare}>{formatKg(tare)}</span>
            </div>
          </div>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.statusCol}>
            {stable ? (
              <Badge tone="green" variant="solid" style={{ fontSize: 10, textAlign: 'center', letterSpacing: '.1em' }}>
                ● STABLE
              </Badge>
            ) : (
              <Badge tone="dark" variant="outline" style={{ fontSize: 10, textAlign: 'center', letterSpacing: '.1em' }}>
                ○ MOTION
              </Badge>
            )}
            <Badge tone="dark" variant="outline" style={{ fontSize: 10, textAlign: 'center', letterSpacing: '.1em' }}>
              {mode} MODE
            </Badge>
          </div>
          <div className={styles.buttonCol}>
            <div className={styles.buttonRow}>
              <Button variant="dark" style={{ padding: '10px 18px', fontSize: 12 }} onClick={() => runAction(() => window.api.draft.pressZero())}>
                ZERO
              </Button>
              <Button variant="dark" style={{ padding: '10px 18px', fontSize: 12 }} onClick={() => runAction(() => window.api.draft.pressTare())}>
                TARE
              </Button>
            </div>
            <Button
              variant="primary"
              glow
              disabled={!stable}
              style={{ padding: '11px 18px', fontSize: 13, letterSpacing: '.03em', width: '100%' }}
              onClick={handleCaptureGross}
              title={stable ? undefined : 'Reading not stable'}
            >
              ⚖  CAPTURE GROSS
            </Button>
          </div>
        </div>
      </div>

      {actionError && <div className={styles.actionError}>{actionError}</div>}

      <div className={styles.body}>
        <div className={styles.formCol}>
          <div className={styles.ticketHeaderRow}>
            <div className={styles.ticketHeaderLeft}>
              <span className={styles.ticketLabel}>TICKET</span>
              <span className={styles.ticketId}>{draft.id}</span>
              <span className={styles.ticketDate}>
                {formatDateLong(draft.createdAt)} · {formatTime(draft.createdAt)}
              </span>
            </div>
            <Badge tone="amber" variant="outline" style={{ fontFamily: 'var(--font-sans)', fontSize: 11, padding: '6px 12px' }}>
              INBOUND · ONE-PASS
            </Badge>
          </div>

          <VehiclePicker draft={draft} vehicle={vehicle} />

          <div className={styles.fieldGrid}>
            <div>
              <FieldLabel>HAULER / CUSTOMER</FieldLabel>
              <SelectField
                value={draft.hauler ?? ''}
                onChange={(e) => window.api.draft.setField('hauler', e.target.value).then(setDraft)}
              >
                <option value="">—</option>
                {haulers
                  .concat(draft.hauler && !haulers.includes(draft.hauler) ? [draft.hauler] : [])
                  .map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>COMMODITY</FieldLabel>
              <SelectField
                value={draft.commodity ?? ''}
                onChange={(e) => window.api.draft.setField('commodity', e.target.value).then(setDraft)}
              >
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel>INVOICE</FieldLabel>
              <TextField
                mono
                value={draft.invoiceNumber ?? ''}
                placeholder="INV-000000"
                onChange={(e) => window.api.draft.setField('invoiceNumber', e.target.value).then(setDraft)}
              />
            </div>
            <div>
              <FieldLabel>ORIGIN BIN</FieldLabel>
              <TextField
                value={draft.originBin ?? ''}
                placeholder="Field · Bin"
                onChange={(e) => window.api.draft.setField('originBin', e.target.value).then(setDraft)}
              />
            </div>
          </div>

          <div className={styles.actionRow}>
            <Button variant="secondary" muted style={{ padding: '14px 22px', fontSize: 13 }} onClick={() => window.api.draft.reset().then(setDraft)}>
              New
            </Button>
            <Button variant="secondary" style={{ padding: '14px 22px', fontSize: 13 }} onClick={handleSave}>
              Save Ticket
            </Button>
            <div style={{ flex: 1 }} />
            <Button
              variant="primary"
              disabled={draft.gross == null}
              style={{ padding: '14px 32px', fontSize: 13, letterSpacing: '.03em' }}
              onClick={() => onPrint(draft.id)}
            >
              🖶  Print Ticket
            </Button>
          </div>
        </div>

        <div className={styles.rightRail}>
          <div className={styles.railLabel}>TICKET PREVIEW</div>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.previewFacility}>{(settings?.facilityName ?? '').toUpperCase()}</div>
              <div className={styles.previewSub}>SCALE TICKET · No. {draft.id}</div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewRow}>
                <span className={styles.previewKey}>DATE</span>
                <span>
                  {formatDate(draft.createdAt)} {formatTime(draft.createdAt)}
                </span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewKey}>VEHICLE</span>
                <span>{draft.vehicleId ?? '—'}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewKey}>COMMODITY</span>
                <span>{draft.commodity ?? '—'}</span>
              </div>
              <div className={styles.previewDivider} />
              <div className={styles.previewRow}>
                <span className={styles.previewKey}>GROSS</span>
                <span>{formatKgUnit(draft.gross)}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewKey}>TARE</span>
                <span>{formatKgUnit(draft.tare)}</span>
              </div>
              <div className={styles.previewNetRow}>
                <span>NET</span>
                <span>{formatKgUnit(draft.net)}</span>
              </div>
              <div className={cx(styles.previewRow, styles.previewFaintRow)}>
                <span>TONNES</span>
                <span>{formatTonnes(draft.net)}</span>
              </div>
              {draft.unitPrice != null && (
                <div className={cx(styles.previewRow, styles.previewFaintRow)}>
                  <span>VALUE</span>
                  <span>{formatMoney(draft.net != null ? draft.net * draft.unitPrice : null)}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.railLabel}>RECENT TICKETS</div>
          <div className={styles.recentList}>
            {recent.map((t) => (
              <div key={t.id} className={styles.recentRow}>
                <div>
                  <div className={styles.recentId}>
                    {t.id} · {t.vehicleId ?? '—'}
                  </div>
                  <div className={styles.recentMeta}>
                    {t.commodity ?? '—'} · {formatTime(t.createdAt)}
                  </div>
                </div>
                <div className={styles.recentNet}>{formatKgUnit(t.net)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function tareValidityLine(vehicle: VehicleWithStats): { dotColor: string; textColor: string; text: string } {
  if (vehicle.tareValidity === 'valid') {
    return {
      dotColor: 'var(--color-green-text-strong)',
      textColor: 'var(--color-green-text)',
      text: `Stored tare ${formatKg(vehicle.storedTare)} kg · ${formatDate(vehicle.tareCapturedAt!)}`
    }
  }
  if (vehicle.tareValidity === 'stale') {
    return { dotColor: 'var(--color-amber-text)', textColor: 'var(--color-amber-text)', text: 'Stored tare stale · re-weigh required' }
  }
  return { dotColor: 'var(--color-text-faint)', textColor: 'var(--color-text-faint)', text: 'No stored tare on file' }
}

interface VehiclePickerProps {
  draft: Ticket
  vehicle: VehicleWithStats | null
}

function VehiclePicker({ draft, vehicle }: VehiclePickerProps) {
  const [editing, setEditing] = useState(!draft.vehicleId)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<VehicleWithStats[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    window.api.vehicles.list(query || undefined).then(setMatches)
  }, [editing, query])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const select = (id: string): void => {
    window.api.draft.setVehicle(id)
    setEditing(false)
    setQuery('')
  }

  if (editing) {
    return (
      <div>
        <FieldLabel>VEHICLE — TYPE OR SCAN ID</FieldLabel>
        <div className={styles.vehicleEditWrap}>
          <input
            ref={inputRef}
            className={styles.vehicleInput}
            value={query}
            placeholder="Type or scan vehicle ID…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches.length > 0) select(matches[0].id)
              if (e.key === 'Escape' && draft.vehicleId) setEditing(false)
            }}
          />
          {matches.length > 0 && (
            <div className={styles.vehicleDropdown} onMouseDown={(e) => e.preventDefault()}>
              {matches.map((m) => (
                <div key={m.id} className={styles.vehicleOption} onClick={() => select(m.id)}>
                  <span className={styles.vehicleOptionId}>{m.id}</span>
                  <span className={styles.vehicleOptionDesc}>{m.description}</span>
                  <span className={styles.vehicleOptionHauler}>{m.hauler}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const line = vehicle ? tareValidityLine(vehicle) : null

  return (
    <div>
      <FieldLabel>VEHICLE — TYPE OR SCAN ID</FieldLabel>
      <div
        className={styles.vehicleBox}
        onClick={() => {
          setQuery(draft.vehicleId ?? '')
          setEditing(true)
        }}
      >
        <span className={styles.vehicleSelected}>
          {draft.vehicleId}
          {draft.vehicleDesc ? <>&nbsp;·&nbsp;{draft.vehicleDesc}</> : null}
        </span>
        {line && (
          <span className={styles.vehicleValidity}>
            <Dot color={line.dotColor} size={7} />
            <span style={{ color: line.textColor }}>{line.text}</span>
          </span>
        )}
      </div>
    </div>
  )
}
