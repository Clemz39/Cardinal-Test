import { cx } from '../lib/cx'
import { formatDateTimeLong, formatKgUnit, formatTonnes, formatMoney, formatPricePerKg } from '@shared/format'
import type { Settings, TareSource, Ticket } from '@shared/types'
import styles from './PrintTicketLayout.module.css'

function tareLabel(source: TareSource): string {
  if (source === 'stored') return 'TARE (STORED)'
  if (source === 'manual') return 'TARE (MANUAL)'
  return 'TARE'
}

function scaleNumber(label: string): string {
  return label.split(' · ')[0]
}

export interface PrintTicketLayoutProps {
  ticket: Ticket
  settings: Settings
}

export function PrintTicketLayout({ ticket, settings }: PrintTicketLayoutProps) {
  return (
    <div className={styles.layout}>
      {settings.companyLogo && <img className={styles.watermark} src={settings.companyLogo} alt="" />}
      <div className={styles.header}>
        <div className={styles.facility}>{settings.facilityName.toUpperCase()}</div>
        <div className={styles.address}>{settings.facilityAddress}</div>
        {settings.companyDetails && <div className={styles.details}>{settings.companyDetails}</div>}
        <div className={styles.ticketNo}>SCALE TICKET No. {ticket.id}</div>
      </div>
      <div className={styles.fields}>
        <div className={styles.row}>
          <span className={styles.key}>DATE / TIME</span>
          <span>{formatDateTimeLong(ticket.createdAt)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>VEHICLE</span>
          <span>
            {ticket.vehicleId ?? '—'}
            {ticket.vehicleDesc ? ` · ${ticket.vehicleDesc}` : ''}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>HAULER</span>
          <span>{ticket.hauler ?? '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>COMMODITY</span>
          <span>{ticket.commodity ?? '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>INVOICE</span>
          <span>{ticket.invoiceNumber ?? '—'}</span>
        </div>
        <div className={styles.divider} />
        <div className={cx(styles.row, styles.weightRow)}>
          <span className={styles.key}>GROSS</span>
          <span>{formatKgUnit(ticket.gross)}</span>
        </div>
        <div className={cx(styles.row, styles.weightRow)}>
          <span className={styles.key}>{tareLabel(ticket.tareSource)}</span>
          <span>{formatKgUnit(ticket.tare)}</span>
        </div>
        <div className={cx(styles.row, styles.netRow)}>
          <span>NET</span>
          <span>{formatKgUnit(ticket.net)}</span>
        </div>
        <div className={cx(styles.row, styles.tonnesRow)}>
          <span>TONNES</span>
          <span>{formatTonnes(ticket.net)}</span>
        </div>
        {ticket.unitPrice != null && (
          <>
            <div className={styles.divider} />
            <div className={styles.row}>
              <span className={styles.key}>PRICE</span>
              <span>{formatPricePerKg(ticket.unitPrice)}</span>
            </div>
            <div className={cx(styles.row, styles.valueRow)}>
              <span>VALUE</span>
              <span>{formatMoney(ticket.net != null ? ticket.net * ticket.unitPrice : null)}</span>
            </div>
          </>
        )}
      </div>
      <div className={styles.footer}>
        {`OPERATOR ${settings.operatorName} · SCALE ${scaleNumber(settings.scaleLabel)} · NTEP ${settings.ntepCert}`.toUpperCase()}
      </div>
    </div>
  )
}
