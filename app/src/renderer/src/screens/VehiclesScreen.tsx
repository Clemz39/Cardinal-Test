import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Dot } from '../components/Dot'
import { FieldLabel } from '../components/FieldLabel'
import { TextField } from '../components/TextField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import { formatDate, formatDateLong, formatKg, formatKgUnit } from '@shared/format'
import type { ScaleReading, Settings, Ticket, VehicleWithStats } from '@shared/types'
import styles from './VehiclesScreen.module.css'

type PanelMode = 'idle' | 'reweighing' | 'manual' | 'adding'

const EMPTY_FORM = { id: '', description: '', hauler: '', plate: '' }
type VehicleFormState = typeof EMPTY_FORM

export function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Ticket[]>([])
  const [mode, setMode] = useState<PanelMode>('idle')
  const [reading, setReading] = useState<ScaleReading | null>(null)
  const [manualTareKg, setManualTareKg] = useState('')
  const [addForm, setAddForm] = useState<VehicleFormState>(EMPTY_FORM)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadVehicles = (): void => {
    window.api.vehicles.list().then(setVehicles)
  }

  useEffect(() => {
    loadVehicles()
    window.api.settings.get().then(setSettings)
  }, [])
  useDataChanged(['vehicles'], loadVehicles)

  useEffect(() => {
    if (mode === 'adding') return
    if (selectedId && vehicles.some((v) => v.id === selectedId)) return
    setSelectedId(vehicles[0]?.id ?? null)
  }, [vehicles, selectedId, mode])

  const selected = vehicles.find((v) => v.id === selectedId) ?? null

  const loadHistory = (): void => {
    if (!selectedId) {
      setHistory([])
      return
    }
    window.api.vehicles.history(selectedId).then(setHistory)
  }
  useEffect(loadHistory, [selectedId])
  useDataChanged(['tickets'], loadHistory)

  useEffect(() => {
    if (mode !== 'reweighing') return
    window.api.scale.getReading().then(setReading)
    return window.api.onScaleReading(setReading)
  }, [mode])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.hauler.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    )
  }, [vehicles, search])

  const staleCount = vehicles.filter((v) => v.tareValidity === 'stale').length

  const selectVehicle = (id: string): void => {
    setSelectedId(id)
    setMode('idle')
    setActionError(null)
  }

  const startAdd = (): void => {
    setAddForm(EMPTY_FORM)
    setActionError(null)
    setMode('adding')
  }

  const submitAdd = async (): Promise<void> => {
    if (!addForm.id.trim() || !addForm.description.trim() || !addForm.hauler.trim() || !addForm.plate.trim()) {
      setActionError('All fields are required')
      return
    }
    const created = await window.api.vehicles.create(addForm)
    setMode('idle')
    setActionError(null)
    setSelectedId(created.id)
  }

  const startReweigh = async (): Promise<void> => {
    if (!selectedId) return
    const result = await window.api.vehicles.startReweigh(selectedId)
    if (!result.ok) {
      setActionError(result.reason ?? 'Could not start re-weigh')
      return
    }
    setActionError(null)
    setMode('reweighing')
  }

  const cancelReweigh = async (): Promise<void> => {
    await window.api.vehicles.cancelReweigh()
    setMode('idle')
  }

  const confirmReweigh = async (): Promise<void> => {
    if (!selectedId) return
    const result = await window.api.vehicles.confirmReweigh(selectedId)
    if (!result.ok) {
      setActionError(result.reason ?? 'Reading not stable')
      return
    }
    setActionError(null)
    setMode('idle')
  }

  const startManual = (): void => {
    setManualTareKg(selected?.storedTare != null ? String(Math.round(selected.storedTare)) : '')
    setActionError(null)
    setMode('manual')
  }

  const submitManual = async (): Promise<void> => {
    if (!selectedId) return
    const kg = Number(manualTareKg)
    if (!Number.isFinite(kg) || kg <= 0) {
      setActionError('Enter a valid weight in kg')
      return
    }
    await window.api.vehicles.setManualTare(selectedId, kg)
    setActionError(null)
    setMode('idle')
  }

  return (
    <div className={styles.screen}>
      <div className={styles.listCol}>
        <div className={styles.listHeader}>
          <div>
            <div className={styles.title}>Vehicles &amp; Stored Tares</div>
            <div className={styles.subtitle}>
              {vehicles.length} registered · {staleCount} {staleCount === 1 ? 'tare needs' : 'tares need'} re-weigh
            </div>
          </div>
          <Button variant="primary" style={{ padding: '10px 16px', fontSize: 12 }} onClick={startAdd}>
            + Add Vehicle
          </Button>
        </div>
        <TextField
          className={styles.search}
          placeholder="⌕  Search ID, plate, hauler…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.listWrap}>
          {filtered.length === 0 && <div className={styles.listEmpty}>No vehicles match this search</div>}
          {filtered.map((v) => (
            <div
              key={v.id}
              className={cx(styles.row, v.id === selectedId && styles.rowSelected)}
              onClick={() => selectVehicle(v.id)}
            >
              <div>
                <div className={styles.rowTop}>
                  <span className={styles.rowId}>{v.id}</span>
                  <span className={styles.rowDesc}>{v.description}</span>
                </div>
                <div className={styles.rowMeta}>
                  {v.hauler} · last {v.lastWeighed ? formatDate(v.lastWeighed) : '—'}
                </div>
              </div>
              <div className={styles.rowRight}>
                <div className={styles.rowTare}>{v.storedTare != null ? `${formatKg(v.storedTare)} kg` : '—'}</div>
                {v.tareValidity === 'valid' && <div className={styles.rowBadgeValid}>● valid</div>}
                {v.tareValidity === 'stale' && <div className={styles.rowBadgeStale}>⚠ re-weigh</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.detail}>
        {actionError && <div className={styles.actionError}>{actionError}</div>}

        {mode === 'adding' && (
          <AddVehicleForm form={addForm} onChange={setAddForm} onSave={submitAdd} onCancel={() => setMode('idle')} />
        )}

        {mode !== 'adding' && !selected && <div className={styles.detailEmpty}>No vehicle selected</div>}

        {mode !== 'adding' && selected && (
          <>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.detailId}>{selected.id}</div>
                <div className={styles.detailMeta}>
                  {selected.description} · {selected.hauler} · Plate {selected.plate}
                </div>
              </div>
              <ValidPill validity={selected.tareValidity} />
            </div>

            {mode === 'reweighing' ? (
              <div className={styles.tareGrid}>
                <div className={styles.tareCard}>
                  <div className={styles.tareLabel}>LIVE READING</div>
                  <div className={styles.tareValue}>
                    {formatKg(reading?.gross ?? 0)} <span className={styles.tareUnit}>kg</span>
                  </div>
                  <div className={styles.liveBadgeRow}>
                    {reading?.stable ? (
                      <Badge tone="green" variant="solid" style={{ fontSize: 10, letterSpacing: '.1em' }}>
                        ● STABLE
                      </Badge>
                    ) : (
                      <Badge tone="dark" variant="outline" style={{ fontSize: 10, letterSpacing: '.1em' }}>
                        ○ MOTION
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={styles.tareActions}>
                  <Button
                    variant="primary"
                    disabled={!reading?.stable}
                    style={{ padding: 13, fontSize: 13 }}
                    onClick={confirmReweigh}
                    title={reading?.stable ? undefined : 'Reading not stable'}
                  >
                    ⚖  Confirm Tare
                  </Button>
                  <Button variant="secondary" style={{ padding: 13, fontSize: 13 }} onClick={cancelReweigh}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : mode === 'manual' ? (
              <div className={styles.tareGrid}>
                <div className={styles.manualForm}>
                  <FieldLabel>ENTER TARE (KG)</FieldLabel>
                  <TextField
                    mono
                    type="number"
                    value={manualTareKg}
                    placeholder="14180"
                    onChange={(e) => setManualTareKg(e.target.value)}
                  />
                </div>
                <div className={styles.manualActions} style={{ alignSelf: 'end' }}>
                  <Button variant="primary" style={{ flex: 1, padding: 13, fontSize: 13 }} onClick={submitManual}>
                    Save Tare
                  </Button>
                  <Button
                    variant="secondary"
                    style={{ flex: 1, padding: 13, fontSize: 13 }}
                    onClick={() => setMode('idle')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.tareGrid}>
                <div className={styles.tareCard}>
                  <div className={styles.tareLabel}>STORED TARE</div>
                  <div className={styles.tareValue}>
                    {selected.storedTare != null ? formatKg(selected.storedTare) : '—'}{' '}
                    <span className={styles.tareUnit}>kg</span>
                  </div>
                  <div className={styles.tareCaption}>
                    {selected.tareCapturedAt
                      ? `Captured ${formatDateLong(selected.tareCapturedAt)} · valid ${settings?.tareValidityDays ?? 90} days`
                      : 'No tare on file'}
                  </div>
                </div>
                <div className={styles.tareActions}>
                  <Button variant="primary" style={{ padding: 13, fontSize: 13 }} onClick={startReweigh}>
                    ⚖  Re-weigh Tare Now
                  </Button>
                  <Button variant="secondary" style={{ padding: 13, fontSize: 13 }} onClick={startManual}>
                    Enter Tare Manually
                  </Button>
                </div>
              </div>
            )}

            <div className={styles.historyLabel}>RECENT WEIGHINGS</div>
            <div className={styles.historyWrap}>
              {history.length === 0 && <div className={styles.historyEmpty}>No completed weighings yet</div>}
              {history.map((h) => (
                <div key={h.id} className={styles.historyRow}>
                  <span className={styles.historyId}>{h.id}</span>
                  <span className={styles.historyCommodity}>{h.commodity ?? '—'}</span>
                  <span className={styles.historyNet}>{formatKgUnit(h.net)}</span>
                  <span className={styles.historyDate}>{formatDate(h.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ValidPill({ validity }: { validity: VehicleWithStats['tareValidity'] }) {
  if (validity === 'valid') {
    return (
      <span className={cx(styles.validPill, styles.validPillGreen)}>
        <Dot color="var(--color-green-text-strong)" size={7} />
        <span className={styles.validPillText} style={{ color: 'var(--color-green-text)' }}>
          Tare valid
        </span>
      </span>
    )
  }
  if (validity === 'stale') {
    return (
      <span className={cx(styles.validPill, styles.validPillAmber)}>
        <Dot color="var(--color-amber-text)" size={7} />
        <span className={styles.validPillText} style={{ color: 'var(--color-amber-text)' }}>
          Tare stale · re-weigh
        </span>
      </span>
    )
  }
  return (
    <span className={cx(styles.validPill, styles.validPillNeutral)}>
      <Dot color="var(--color-text-faint)" size={7} />
      <span className={styles.validPillText} style={{ color: 'var(--color-text-faint)' }}>
        No tare on file
      </span>
    </span>
  )
}

interface AddVehicleFormProps {
  form: VehicleFormState
  onChange: (form: VehicleFormState) => void
  onSave: () => void
  onCancel: () => void
}

function AddVehicleForm({ form, onChange, onSave, onCancel }: AddVehicleFormProps) {
  return (
    <div>
      <div className={styles.detailId} style={{ marginBottom: 18 }}>
        New Vehicle
      </div>
      <div className={styles.addGrid}>
        <div>
          <FieldLabel>VEHICLE ID</FieldLabel>
          <TextField
            mono
            value={form.id}
            placeholder="TRK-000"
            onChange={(e) => onChange({ ...form, id: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <FieldLabel>HAULER</FieldLabel>
          <TextField value={form.hauler} onChange={(e) => onChange({ ...form, hauler: e.target.value })} />
        </div>
        <div>
          <FieldLabel>DESCRIPTION</FieldLabel>
          <TextField
            value={form.description}
            placeholder="Make / model"
            onChange={(e) => onChange({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>PLATE</FieldLabel>
          <TextField mono value={form.plate} onChange={(e) => onChange({ ...form, plate: e.target.value })} />
        </div>
      </div>
      <div className={styles.formActions}>
        <Button variant="secondary" style={{ padding: '13px 22px', fontSize: 13 }} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" style={{ padding: '13px 22px', fontSize: 13 }} onClick={onSave}>
          Add Vehicle
        </Button>
      </div>
    </div>
  )
}
