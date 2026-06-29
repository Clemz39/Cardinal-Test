import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
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

  const netTotal = tickets.reduce((sum, t) => sum + (t.net ?? 0), 0)

  const handleExportCsv = (): void => {
    void window.api.tickets.exportCsv(filter)
  }
  const handleExportPdf = (): void => {
    void window.api.reports.exportPdf(rangeFor(rangeKey))
  }

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
          <div key={t.id} className={styles.row}>
            <span className={styles.ticketCell}>{t.id}</span>
            <span className={styles.timeCell}>{formatDateTime(t.createdAt)}</span>
            <span>{t.vehicleId ?? '—'}</span>
            <span className={styles.haulerCell}>{t.hauler ?? '—'}</span>
            <span className={styles.commodityCell}>{t.commodity ?? '—'}</span>
            <span className={styles.right}>{formatKg(t.gross)}</span>
            <span className={styles.right}>{formatKg(t.tare)}</span>
            <span className={cx(styles.right, styles.netCell)}>{formatKg(t.net)}</span>
            <span className={styles.right}>
              {t.status === 'live' ? (
                <Badge tone="amber" variant="text" style={{ fontSize: 10 }}>
                  ◷ live
                </Badge>
              ) : (
                <Badge tone="green" variant="text" style={{ fontSize: 10, color: 'var(--color-green-text)' }}>
                  ✓ done
                </Badge>
              )}
            </span>
            <span className={styles.right}>
              <span className={styles.reprintLink} onClick={() => onPrint(t.id)}>
                Reprint
              </span>
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
    </div>
  )
}
