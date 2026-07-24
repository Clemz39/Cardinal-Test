import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { FieldLabel } from '../components/FieldLabel'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import { rangeFor } from '@shared/dateRanges'
import { formatDateTime, formatKg, formatKgUnit, formatTonnes } from '@shared/format'
import type { DateRangeKey, Ticket, TicketFilter } from '@shared/types'
import styles from './TicketsScreen.module.css'

interface TicketsScreenProps {
  onPrint: (ticketId: string) => void
}

const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' }
]

export function TicketsScreen({ onPrint }: TicketsScreenProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [commodities, setCommodities] = useState<string[]>([])
  const [haulers, setHaulers] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('today')
  const [commodity, setCommodity] = useState('')
  const [hauler, setHauler] = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [monthCount, setMonthCount] = useState(0)

  const filter: TicketFilter = useMemo(
    () => ({
      range: rangeFor(rangeKey),
      search: search.trim() || undefined,
      commodity: commodity || undefined,
      hauler: hauler || undefined
    }),
    [rangeKey, search, commodity, hauler]
  )

  const loadTickets = (): void => {
    window.api.tickets.list(filter).then(setTickets)
  }
  const loadCounts = (): void => {
    window.api.tickets.list({ range: rangeFor('today') }).then((rows) => setTodayCount(rows.length))
    window.api.tickets.list({ range: rangeFor('month') }).then((rows) => setMonthCount(rows.length))
  }
  const loadFilters = (): void => {
    window.api.tickets.distinctCommodities().then(setCommodities)
    window.api.tickets.distinctHaulers().then(setHaulers)
  }

  useEffect(loadTickets, [filter])
  useEffect(() => {
    loadCounts()
    loadFilters()
  }, [])
  useDataChanged(['tickets'], () => {
    loadTickets()
    loadCounts()
    loadFilters()
  })

  const netTotal = tickets.filter((t) => t.status !== 'void').reduce((sum, t) => sum + (t.net ?? 0), 0)

  const handleExportCsv = (): void => {
    void window.api.tickets.exportCsv(filter)
  }
  const handleExportPdf = (): void => {
    void window.api.reports.exportPdf(rangeFor(rangeKey))
  }

  const canVoid = (t: Ticket): boolean => t.status === 'done' || (t.status === 'live' && t.printedAt != null)

  const [voidTarget, setVoidTarget] = useState<Ticket | null>(null)

  return (
    <div className={styles.screen}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.title}>Ticket History</div>
          <div className={styles.subtitle}>
            {todayCount} tickets today · {monthCount} this month
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" style={{ padding: '10px 16px', fontSize: 12 }} onClick={handleExportCsv}>
            ⭳ Export CSV
          </Button>
          <Button variant="secondary" style={{ padding: '10px 16px', fontSize: 12 }} onClick={handleExportPdf}>
            ⭳ Export PDF
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <TextField
          className={styles.search}
          placeholder="⌕  Search ticket #, vehicle, hauler…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.segmented}>
          {RANGE_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className={cx(styles.segment, rangeKey === opt.key && styles.segmentActive)}
              onClick={() => setRangeKey(opt.key)}
            >
              {opt.label}
            </div>
          ))}
        </div>
        <div className={styles.filterSelectWrap}>
          <SelectField className={styles.filterSelect} value={commodity} onChange={(e) => setCommodity(e.target.value)}>
            <option value="">All Commodities</option>
            {commodities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={styles.filterSelectWrap}>
          <SelectField className={styles.filterSelect} value={hauler} onChange={(e) => setHauler(e.target.value)}>
            <option value="">All Haulers</option>
            {haulers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>TICKET</span>
          <span>DATE/TIME</span>
          <span>VEHICLE</span>
          <span>HAULER</span>
          <span>COMMODITY</span>
          <span className={styles.right}>GROSS</span>
          <span className={styles.right}>TARE</span>
          <span className={styles.right}>NET</span>
          <span className={styles.right}>STATUS</span>
          <span className={styles.right}>ACTION</span>
        </div>

        {tickets.length === 0 && <div className={styles.empty}>No tickets match these filters</div>}

        {tickets.map((t) => (
          <div key={t.id} className={cx(styles.row, t.status === 'void' && styles.rowVoid)}>
            <span className={styles.ticketCell}>{t.id}</span>
            <span className={styles.timeCell}>{formatDateTime(t.createdAt)}</span>
            <span>{t.vehicleId ?? '—'}</span>
            <span className={styles.haulerCell}>{t.hauler ?? '—'}</span>
            <span className={styles.commodityCell}>{t.commodity ?? '—'}</span>
            <span className={styles.right}>{formatKg(t.gross)}</span>
            <span className={styles.right}>{formatKg(t.tare)}</span>
            <span className={cx(styles.right, styles.netCell)}>{formatKg(t.net)}</span>
            <span className={styles.right}>
              {t.status === 'live' && (
                <Badge tone="amber" variant="text" style={{ fontSize: 10 }}>
                  ◷ live
                </Badge>
              )}
              {t.status === 'done' && (
                <Badge tone="green" variant="text" style={{ fontSize: 10, color: 'var(--color-green-text)' }}>
                  ✓ done
                </Badge>
              )}
              {t.status === 'void' && (
                <Badge tone="red" variant="text" style={{ fontSize: 10 }} title={t.voidReason ?? undefined}>
                  ✕ void
                </Badge>
              )}
            </span>
            <span className={cx(styles.right, styles.actionCell)}>
              <span className={styles.reprintLink} onClick={() => onPrint(t.id)}>
                Reprint
              </span>
              {canVoid(t) && (
                <span className={styles.voidLink} onClick={() => setVoidTarget(t)}>
                  Void
                </span>
              )}
            </span>
          </div>
        ))}

        <div className={styles.footer}>
          <span>
            NET TOTAL · {tickets.length} TICKET{tickets.length === 1 ? '' : 'S'}
          </span>
          <span>
            {formatKgUnit(netTotal)} &nbsp;·&nbsp; {formatTonnes(netTotal)}
          </span>
        </div>
      </div>

      {voidTarget && <VoidDialog ticket={voidTarget} onClose={() => setVoidTarget(null)} />}
    </div>
  )
}

interface VoidDialogProps {
  ticket: Ticket
  onClose: () => void
}

function VoidDialog({ ticket, onClose }: VoidDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleVoid = async (): Promise<void> => {
    if (!reason.trim()) {
      setError('A reason is required to void a ticket.')
      return
    }
    setSubmitting(true)
    const result = await window.api.tickets.void(ticket.id, reason)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.reason ?? 'Void failed')
      return
    }
    onClose()
  }

  return (
    <div className={styles.voidOverlay} onClick={onClose}>
      <div className={styles.voidPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.voidTitleBar}>
          <span className={styles.voidTitle}>VOID TICKET {ticket.id}</span>
          <span className={styles.voidClose} onClick={onClose}>
            ✕
          </span>
        </div>
        <div className={styles.voidBody}>
          <p className={styles.voidWarning}>
            This permanently marks ticket {ticket.id} as void and excludes it from report totals. This cannot be
            undone.
          </p>
          <FieldLabel>REASON</FieldLabel>
          <TextField
            autoFocus
            value={reason}
            placeholder="e.g. Data entry error, duplicate weigh…"
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleVoid()}
          />
          {error && <div className={styles.voidError}>{error}</div>}
        </div>
        <div className={styles.voidFooter}>
          <Button variant="secondary" muted style={{ flex: 1, padding: 12, fontSize: 13 }} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1, padding: 12, fontSize: 13, background: 'var(--color-red)' }}
            onClick={handleVoid}
            disabled={submitting}
          >
            {submitting ? 'Voiding…' : 'Void Ticket'}
          </Button>
        </div>
      </div>
    </div>
  )
}
