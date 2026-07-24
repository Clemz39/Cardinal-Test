import { formatDateLong, formatDateTimeLong, formatKg, formatKgUnit, formatTonnes } from '@shared/format'
import type { ReportRange, ReportSummary, Settings } from '@shared/types'
import styles from './PrintReportLayout.module.css'

function pctOfTotal(valueKg: number, totalKg: number): string {
  if (totalKg <= 0) return '0.0%'
  return `${((valueKg / totalKg) * 100).toFixed(1)}%`
}

function scaleNumber(label: string): string {
  return label.split(' · ')[0]
}

export interface PrintReportLayoutProps {
  summary: ReportSummary
  settings: Settings
  range: ReportRange
  generatedAt: string
}

export function PrintReportLayout({ summary, settings, range, generatedAt }: PrintReportLayoutProps) {
  const hasCommodities = summary.commodityBars.length > 0
  const hasHaulers = summary.topHaulers.length > 0

  return (
    <div className={styles.layout}>
      {settings.companyLogo && <img className={styles.watermark} src={settings.companyLogo} alt="" />}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.facility}>{settings.facilityName.toUpperCase()}</div>
          <div className={styles.address}>{settings.facilityAddress}</div>
          {settings.companyDetails && <div className={styles.details}>{settings.companyDetails}</div>}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.reportTitle}>Operations Report</div>
          <div className={styles.reportPeriod}>
            {formatDateLong(range.from)} &ndash; {formatDateLong(range.to)}
          </div>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span>
          Generated {formatDateTimeLong(generatedAt)} by {settings.operatorName}
        </span>
        <span>
          NTEP {settings.ntepCert} &middot; {scaleNumber(settings.scaleLabel)}
        </span>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Net Received</div>
          <div className={styles.statValue}>{formatKgUnit(summary.netReceivedKg)}</div>
          <div className={styles.statSub}>{formatTonnes(summary.netReceivedKg)}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Tickets</div>
          <div className={styles.statValue}>{summary.ticketCount}</div>
          <div className={styles.statSub}>
            {summary.inboundCount} in &middot; {summary.outboundCount} out
          </div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Avg Net / Load</div>
          <div className={styles.statValue}>{formatKgUnit(summary.avgNetPerLoadKg)}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Top Commodity</div>
          <div className={styles.statValueName}>{summary.topCommodity ?? '—'}</div>
          <div className={styles.statSub}>{summary.topCommodityPct}% of net volume</div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Net Received by Commodity</div>
      {!hasCommodities ? (
        <div className={styles.empty}>No weighed tickets in this range</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.swatchCol} />
              <th>Commodity</th>
              <th className={styles.right}>Net (kg)</th>
              <th className={styles.right}>Tonnes</th>
              <th className={styles.right}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.commodityBars.map((c) => (
              <tr key={c.name}>
                <td className={styles.swatchCol}>
                  <span className={styles.swatch} style={{ background: c.color }} />
                </td>
                <td>{c.name}</td>
                <td className={styles.right}>{formatKg(c.valueKg)}</td>
                <td className={styles.right}>{formatTonnes(c.valueKg)}</td>
                <td className={styles.right}>{pctOfTotal(c.valueKg, summary.netReceivedKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.sectionTitle}>Top Haulers</div>
      {!hasHaulers ? (
        <div className={styles.empty}>No weighed tickets in this range</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCol}>#</th>
              <th>Hauler</th>
              <th className={styles.right}>Loads</th>
              <th className={styles.right}>Net (kg)</th>
              <th className={styles.right}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.topHaulers.map((h, i) => (
              <tr key={h.name}>
                <td className={styles.rankCol}>{i + 1}</td>
                <td>{h.name}</td>
                <td className={styles.right}>{h.loads}</td>
                <td className={styles.right}>{formatKg(h.netKg)}</td>
                <td className={styles.right}>{pctOfTotal(h.netKg, summary.netReceivedKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.footer}>
        {`Atlas Weigh Navigator · ${settings.facilityName} · Generated ${formatDateTimeLong(generatedAt)}`}
      </div>
    </div>
  )
}
