import { scaleManager } from './scale/manager'
import { createTicket, getOpenTicket, updateTicket } from './repos/ticketRepo'
import { getVehicle } from './repos/vehicleRepo'
import { getProductByName } from './repos/productRepo'
import {
  advanceTicketCounterPast,
  peekNextTicketNumber,
  advanceInvoiceCounter,
  peekNextInvoiceNumber
} from './repos/settingsRepo'
import { formatTicketNumber, formatInvoiceNumber } from '../shared/format'
import { notify } from './events'
import type { Ticket } from '../shared/types'

function blankDraft(ticketNumber: number, invoiceNumber: number): Ticket {
  const now = new Date().toISOString()
  return {
    id: formatTicketNumber(ticketNumber),
    createdAt: now,
    capturedAt: null,
    vehicleId: null,
    vehicleDesc: null,
    hauler: null,
    commodity: null,
    invoiceNumber: formatInvoiceNumber(invoiceNumber),
    originBin: null,
    gross: null,
    tare: null,
    net: null,
    unitPrice: null,
    tareSource: 'none',
    status: 'live',
    direction: 'inbound'
  }
}

export function ensureOpenTicket(): Ticket {
  const existing = getOpenTicket()
  if (existing) return existing
  const draft = blankDraft(peekNextTicketNumber(), peekNextInvoiceNumber())
  return createTicket(draft)
}

export function getDraft(): Ticket {
  return ensureOpenTicket()
}

export function newDraft(): Ticket {
  const current = ensureOpenTicket()
  scaleManager.settleToZero()
  const draft = updateTicket(current.id, {
    vehicleId: null,
    vehicleDesc: null,
    hauler: null,
    commodity: null,
    invoiceNumber: formatInvoiceNumber(peekNextInvoiceNumber()),
    originBin: null,
    gross: null,
    tare: null,
    net: null,
    unitPrice: null,
    tareSource: 'none',
    capturedAt: null,
    createdAt: new Date().toISOString()
  })
  notify('draft')
  return draft
}

export function setDraftVehicle(vehicleId: string | null): Ticket {
  const draft = ensureOpenTicket()
  if (!vehicleId) {
    const updated = updateTicket(draft.id, { vehicleId: null, vehicleDesc: null, tareSource: 'none' })
    notify('draft')
    return updated
  }
  const vehicle = getVehicle(vehicleId)
  if (!vehicle) {
    const updated = updateTicket(draft.id, { vehicleId, vehicleDesc: null, tareSource: 'none' })
    notify('draft')
    return updated
  }
  if (draft.gross == null) {
    scaleManager.rampToRandomGross(vehicle.storedTare ?? 13000)
  }
  const updated = updateTicket(draft.id, {
    vehicleId: vehicle.id,
    vehicleDesc: vehicle.description,
    hauler: draft.hauler ?? vehicle.hauler,
    tareSource: vehicle.storedTare != null ? 'stored' : 'none'
  })
  notify('draft')
  return updated
}

export type DraftField = 'hauler' | 'commodity' | 'invoiceNumber' | 'originBin'

export function setDraftField(field: DraftField, value: string): Ticket {
  const draft = ensureOpenTicket()
  const patch: Partial<Ticket> = { [field]: value }
  if (field === 'commodity') {
    const product = value ? getProductByName(value) : null
    patch.unitPrice = product ? product.pricePerKg : null
  }
  const updated = updateTicket(draft.id, patch)
  notify('draft')
  return updated
}

export function pressZero(): { ok: boolean; reason?: string } {
  return scaleManager.pressZero()
}

export function pressTareButton(): { ok: boolean; reason?: string } {
  const result = scaleManager.pressTareButton()
  if (!result.ok) return result
  const draft = ensureOpenTicket()
  const reading = scaleManager.getReading()
  updateTicket(draft.id, { tareSource: reading.pushButtonTare > 0 ? 'manual' : draft.vehicleId ? 'stored' : 'none' })
  notify('draft')
  return result
}

export function captureGross(): { ok: boolean; reason?: string; ticket?: Ticket } {
  const reading = scaleManager.getReading()
  if (!reading.stable) return { ok: false, reason: 'Reading not stable' }

  const draft = ensureOpenTicket()
  const vehicle = draft.vehicleId ? getVehicle(draft.vehicleId) : null
  const tare = reading.pushButtonTare > 0 ? reading.pushButtonTare : vehicle?.storedTare ?? 0
  const tareSource = reading.pushButtonTare > 0 ? 'manual' : vehicle?.storedTare != null ? 'stored' : 'none'

  const ticket = updateTicket(draft.id, {
    gross: reading.gross,
    tare,
    net: reading.gross - tare,
    tareSource,
    capturedAt: new Date().toISOString()
  })
  notify('draft')
  return { ok: true, ticket }
}

export function saveDraft(): { ok: boolean; reason?: string; saved?: Ticket; nextDraft?: Ticket } {
  const draft = ensureOpenTicket()
  if (draft.gross == null) return { ok: false, reason: 'Capture gross before saving' }

  const saved = updateTicket(draft.id, { status: 'done' })
  advanceTicketCounterPast(parseInt(draft.id, 10))
  advanceInvoiceCounter()
  scaleManager.settleToZero()
  const nextDraft = createTicket(blankDraft(peekNextTicketNumber(), peekNextInvoiceNumber()))
  notify('tickets', 'draft')
  return { ok: true, saved, nextDraft }
}
