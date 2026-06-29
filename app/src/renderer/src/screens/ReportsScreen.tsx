import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { SelectField } from '../components/SelectField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import { rangeFor } from '@shared/dateRanges'
import { formatKg, formatTonnes } from '@shared/format'
import type { DateRangeKey, ReportSummary } from '@shared/types'
import styles from './ReportsScreen.module.css'

const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' }
]

function subtitleFor(key: DateRangeKey): string {
  if (key === 'today') {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  if (key === 'week') return 'Last 7 days'
  return 'Last 30 days'
}

export function ReportsScreen() {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('today')
  const [summary, setSummary] = useState<ReportSummary | null>(null)

  const loadSummary = (): void => {
    window.api.reports.summary(rangeFor(rangeKey)).then(setSummary)
  }

  useEffect(loadSummary, [rangeKey])
  useDataChanged(['tickets'], loadSummary)

  const handleExportCsv = (): void => {
    void window.api.tickets.exportCsv({ range: rangeFor(rangeKey) })
  }
  const handleExportPdf = (): void => {
    void window.api.reports.exportPdf(rangeFor(rangeKey))
  }

  return (
    <div className={styles.screen}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.title}>Reports</div>
          <div className={styles.subtitle}>{subtitleFor(rangeKey)} · inbound summary</div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rangeSelectWrap}>
            <SelectField
              className={styles.rangeSelect}
              value={rangeKey}
              onChange={(e) => setRangeKey(e.target.value as DateRangeKey)}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </SelectField>
          </div>
          <Button variant="secondary" style={{ padding: '10px 16px', fontSize: 12 }} onClick={handleExportCsv}>
            ⭳ CSV
          </Button>
          <Button variant="secondary" style={{ padding: '10px 16px', fontSize: 12 }} onClick={handleExportPdf}>
            ⭳ PDF
          </Button>
        </div>
      </div>

      <div className={styles.statRow}>
        <div className={cx(styles.statCard, styles.statCardDark)}>
          <div className={cx(styles.statLabel, styles.statLabelDark)}>NET RECEIVED</div>
          <div className={cx(styles.statValue, styles.statValueDark)}>
            {formatKg(summary?.netReceivedKg ?? 0)}
            <span className={cx(styles.statUnit, styles.statUnitDark)}> kg</span>
          </div>
          <div className={cx(styles.statCaption, styles.statCaptionDark)}>
            {formatTonnes(summary?.netReceivedKg ?? 0)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>TICKETS</div>
          <div className={styles.statValue}>{summary?.ticketCount ?? 0}</div>
          <div className={styles.statCaption}>
            {summary?.inboundCount ?? 0} in · {summary?.outboundCount ?? 0} out
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>AVG NET / LOAD</div>
          <div className={styles.statValue}>
            {formatKg(summary?.avgNetPerLoadKg ?? 0)}
            <span className={styles.statUnit}> kg</span>
          </div>
          <div className={styles.statCaption}>{summary?.ticketCount ?? 0} loads</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>TOP COMMODITY</div>
          <div className={styles.statValueName}>{summary?.topCommodity ?? '—'}</div>
          <div className={styles.statCaption}>{summary?.topCommodityPct ?? 0}% of net volume</div>
        </div>
      </div>

      <div className={styles.panelsRow}>
        <div className={styles.barsPanel}>
          <div className={styles.panelLabel}>NET RECEIVED BY COMMODITY · kg</div>
          {!summary || summary.commodityBars.length === 0 ? (
            <div className={styles.panelEmpty}>No weighed tickets in this range</div>
          ) : (
            <div className={styles.barsList}>
              {summary.commodityBars.map((c) => (
                <div key={c.name} className={styles.barRow}>
                  <span className={styles.barName}>{c.name}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                  <span className={styles.barValue}>{formatKg(c.valueKg)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.haulersPanel}>
          <div className={styles.panelLabel}>TOP HAULERS</div>
          {!summary || summary.topHaulers.length === 0 ? (
            <div className={styles.panelEmpty}>No weighed tickets in this range</div>
          ) : (
            summary.topHaulers.map((h) => (
              <div key={h.name} className={styles.haulerRow}>
                <div>
                  <div className={styles.haulerName}>{h.name}</div>
                  <div className={styles.haulerLoads}>{h.loads} loads</div>
                </div>
                <div className={styles.haulerNet}>{formatKg(h.netKg)} kg</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
