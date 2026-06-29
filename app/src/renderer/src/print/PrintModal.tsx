import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { PrintTicketLayout } from './PrintTicketLayout'
import type { Settings, Ticket } from '@shared/types'
import styles from './PrintModal.module.css'

export interface PrintModalProps {
  ticketId: string
  onClose: () => void
}

export function PrintModal({ ticketId, onClose }: PrintModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.tickets.get(ticketId).then(setTicket)
    window.api.settings.get().then(setSettings)
  }, [ticketId])

  const copies = settings?.copies ?? 1

  const handlePrint = async (): Promise<void> => {
    setPrinting(true)
    setError(null)
    const result = await window.api.tickets.print(ticketId, copies)
    setPrinting(false)
    if (!result.ok) {
      setError(result.reason ?? 'Print failed')
      return
    }
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <span className={styles.title}>PRINT PREVIEW · 4×6 LABEL</span>
          <span className={styles.close} onClick={onClose}>
            ✕
          </span>
        </div>
        {ticket && settings ? (
          <PrintTicketLayout ticket={ticket} settings={settings} />
        ) : (
          <div className={styles.loading}>Loading…</div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.footer}>
          <Button variant="secondary" muted style={{ flex: 1, padding: 12, fontSize: 13 }} onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1, padding: 12, fontSize: 13 }}
            onClick={handlePrint}
            disabled={!ticket || printing}
          >
            🖶 {printing ? 'Printing…' : `Print ${copies} ${copies === 1 ? 'Copy' : 'Copies'}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
