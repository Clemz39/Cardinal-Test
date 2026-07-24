import { getDb } from '../db'
import type { Ticket, TicketFilter } from '../../shared/types'

export function listTickets(filter: TicketFilter = {}): Ticket[] {
  const clauses: string[] = []
  const params: Record<string, unknown> = {}

  if (filter.range) {
    clauses.push('createdAt BETWEEN @from AND @to')
    params.from = filter.range.from
    params.to = filter.range.to
  }
  if (filter.commodity) {
    clauses.push('commodity = @commodity')
    params.commodity = filter.commodity
  }
  if (filter.hauler) {
    clauses.push('hauler = @hauler')
    params.hauler = filter.hauler
  }
  if (filter.search && filter.search.trim()) {
    clauses.push('(lower(id) LIKE @search OR lower(vehicleId) LIKE @search OR lower(hauler) LIKE @search)')
    params.search = `%${filter.search.trim().toLowerCase()}%`
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return getDb()
    .prepare(`SELECT * FROM tickets ${where} ORDER BY createdAt DESC`)
    .all(params) as Ticket[]
}

export function getTicket(id: string): Ticket | null {
  const row = getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket | undefined
  return row ?? null
}

export function getOpenTicket(): Ticket | null {
  const row = getDb().prepare("SELECT * FROM tickets WHERE status = 'live' ORDER BY createdAt DESC LIMIT 1").get() as
    | Ticket
    | undefined
  return row ?? null
}

export function getRecentDoneTickets(limit = 3): Ticket[] {
  return getDb()
    .prepare("SELECT * FROM tickets WHERE status = 'done' ORDER BY createdAt DESC LIMIT ?")
    .all(limit) as Ticket[]
}

export function createTicket(ticket: Ticket): Ticket {
  getDb()
    .prepare(
      `INSERT INTO tickets (
        id, createdAt, capturedAt, vehicleId, vehicleDesc, hauler, commodity,
        invoiceNumber, originBin, gross, tare, net, unitPrice, tareSource, status, direction
      ) VALUES (
        @id, @createdAt, @capturedAt, @vehicleId, @vehicleDesc, @hauler, @commodity,
        @invoiceNumber, @originBin, @gross, @tare, @net, @unitPrice, @tareSource, @status, @direction
      )`
    )
    .run(ticket)
  return getTicket(ticket.id)!
}

export function updateTicket(id: string, patch: Partial<Omit<Ticket, 'id'>>): Ticket {
  const current = getTicket(id)
  if (!current) throw new Error(`Ticket ${id} not found`)
  const next: Ticket = { ...current, ...patch, id }
  getDb()
    .prepare(
      `UPDATE tickets SET
        createdAt=@createdAt, capturedAt=@capturedAt, vehicleId=@vehicleId, vehicleDesc=@vehicleDesc,
        hauler=@hauler, commodity=@commodity, invoiceNumber=@invoiceNumber, originBin=@originBin,
        gross=@gross, tare=@tare, net=@net, unitPrice=@unitPrice, tareSource=@tareSource, status=@status, direction=@direction
      WHERE id=@id`
    )
    .run(next)
  return next
}

export function deleteTicket(id: string): void {
  getDb().prepare('DELETE FROM tickets WHERE id = ?').run(id)
}

export function distinctCommodities(): string[] {
  const rows = getDb().prepare('SELECT DISTINCT commodity FROM tickets WHERE commodity IS NOT NULL ORDER BY commodity').all() as {
    commodity: string
  }[]
  return rows.map((r) => r.commodity)
}

export function distinctHaulers(): string[] {
  const rows = getDb().prepare('SELECT DISTINCT hauler FROM tickets WHERE hauler IS NOT NULL ORDER BY hauler').all() as {
    hauler: string
  }[]
  return rows.map((r) => r.hauler)
}
