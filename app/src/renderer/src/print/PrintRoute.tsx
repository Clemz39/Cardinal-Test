import { useEffect, useState } from 'react'
import { PrintTicketLayout } from './PrintTicketLayout'
import { usePrintBackground } from './usePrintBackground'
import type { Settings, Ticket } from '@shared/types'

export interface PrintRouteProps {
  ticketId: string
}

export function PrintRoute({ ticketId }: PrintRouteProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  usePrintBackground()

  useEffect(() => {
    window.api.tickets.get(ticketId).then(setTicket)
    window.api.settings.get().then(setSettings)
  }, [ticketId])

  if (!ticket || !settings) return null

  return (
    <div style={{ width: 420, margin: '0 auto', background: '#fff' }}>
      <PrintTicketLayout ticket={ticket} settings={settings} />
    </div>
  )
}
