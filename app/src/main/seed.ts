import type { AuthUser, Product, Settings, Ticket, Vehicle } from '../shared/types'
import { createRng, pick, randInt } from './rng'
import { formatTicketNumber } from '../shared/format'

function isoDaysAgo(now: Date, days: number, hour: number, minute: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export interface SeedData {
  settings: Settings
  vehicles: Vehicle[]
  products: Product[]
  tickets: Ticket[]
  users: (AuthUser & { pin: string })[]
}

export function buildSeed(now: Date = new Date()): SeedData {
  const rng = createRng(225)

  const products: Product[] = [
    { id: 'corn-2y', name: 'Corn #2 Yellow', color: '#e0951f', pricePerTonne: 165 },
    { id: 'soybeans', name: 'Soybeans', color: '#6b8f3a', pricePerTonne: 420 },
    { id: 'hrw-wheat', name: 'HRW Wheat', color: '#b8862e', pricePerTonne: 219 },
    { id: 'sorghum', name: 'Grain Sorghum (Milo)', color: '#a6452e', pricePerTonne: 151 },
    { id: 'oats', name: 'Oats', color: '#c9a24a', pricePerTonne: 213 }
  ]

  const vehicles: Vehicle[] = [
    {
      id: 'TRK-148',
      description: 'Peterbilt 579',
      hauler: 'Prairie Gold Co-op',
      plate: 'KS 84-217',
      storedTare: 14180,
      tareCapturedAt: isoDaysAgo(now, 14, 9, 10)
    },
    {
      id: 'TRK-203',
      description: 'Kenworth T680',
      hauler: 'Heartland Farms',
      plate: 'KS 91-345',
      storedTare: 14180,
      tareCapturedAt: isoDaysAgo(now, 21, 8, 40)
    },
    {
      id: 'TRK-077',
      description: 'Freightliner Cascadia',
      hauler: 'Prairie Gold Co-op',
      plate: 'KS 22-908',
      storedTare: 13540,
      tareCapturedAt: isoDaysAgo(now, 30, 11, 5)
    },
    {
      id: 'TRK-512',
      description: 'Mack Anthem',
      hauler: 'Heartland Farms',
      plate: 'KS 67-114',
      storedTare: 12950,
      tareCapturedAt: isoDaysAgo(now, 110, 7, 55)
    },
    {
      id: 'TRK-091',
      description: 'Volvo VNL',
      hauler: 'Prairie Gold Co-op',
      plate: 'KS 38-562',
      storedTare: 13670,
      tareCapturedAt: isoDaysAgo(now, 45, 10, 20)
    },
    {
      id: 'TRK-440',
      description: 'International LT',
      hauler: 'Tallgrass Ag',
      plate: 'KS 50-771',
      storedTare: 12660,
      tareCapturedAt: isoDaysAgo(now, 130, 13, 30)
    }
  ]

  const haulers = ['Prairie Gold Co-op', 'Heartland Farms', 'Schmidt Grain LLC', 'Tallgrass Ag', 'Independent']

  // The 9 tickets exactly as captured in the original design mock, anchored to "today".
  type MockTodaySeed = Omit<Ticket, 'createdAt' | 'capturedAt' | 'direction'> & { time: [number, number] }
  const mockToday: MockTodaySeed[] = [
    { id: '0048213', time: [14, 32], vehicleId: 'TRK-148', vehicleDesc: 'Peterbilt 579', hauler: 'Prairie Gold Co-op', commodity: 'Corn #2 Yellow', contractPo: 'CN-22841', originBin: 'Field 7 · Bin 3', gross: 35570, tare: 14180, net: 21390, tareSource: 'stored', status: 'live' },
    { id: '0048212', time: [14, 18], vehicleId: 'TRK-203', vehicleDesc: 'Kenworth T680', hauler: 'Heartland Farms', commodity: 'Soybeans', contractPo: null, originBin: null, gross: 35490, tare: 14180, net: 21310, tareSource: 'stored', status: 'done' },
    { id: '0048211', time: [14, 2], vehicleId: 'TRK-077', vehicleDesc: 'Freightliner Cascadia', hauler: 'Prairie Gold Co-op', commodity: 'Corn #2 Yellow', contractPo: null, originBin: null, gross: 34010, tare: 13540, net: 20470, tareSource: 'stored', status: 'done' },
    { id: '0048210', time: [13, 51], vehicleId: 'TRK-148', vehicleDesc: 'Peterbilt 579', hauler: 'Schmidt Grain LLC', commodity: 'HRW Wheat', contractPo: null, originBin: null, gross: 36240, tare: 14180, net: 22060, tareSource: 'stored', status: 'done' },
    { id: '0048209', time: [13, 37], vehicleId: 'TRK-512', vehicleDesc: 'Mack Anthem', hauler: 'Heartland Farms', commodity: 'Grain Sorghum (Milo)', contractPo: null, originBin: null, gross: 32700, tare: 12950, net: 19750, tareSource: 'stored', status: 'done' },
    { id: '0048208', time: [13, 20], vehicleId: 'TRK-203', vehicleDesc: 'Kenworth T680', hauler: 'Tallgrass Ag', commodity: 'Soybeans', contractPo: null, originBin: null, gross: 35170, tare: 14180, net: 20990, tareSource: 'stored', status: 'done' },
    { id: '0048207', time: [13, 4], vehicleId: 'TRK-091', vehicleDesc: 'Volvo VNL', hauler: 'Prairie Gold Co-op', commodity: 'Corn #2 Yellow', contractPo: null, originBin: null, gross: 34620, tare: 13670, net: 20950, tareSource: 'stored', status: 'done' },
    { id: '0048206', time: [12, 48], vehicleId: 'TRK-148', vehicleDesc: 'Peterbilt 579', hauler: 'Schmidt Grain LLC', commodity: 'HRW Wheat', contractPo: null, originBin: null, gross: 36130, tare: 14180, net: 21950, tareSource: 'stored', status: 'done' },
    { id: '0048205', time: [12, 31], vehicleId: 'TRK-440', vehicleDesc: 'International LT', hauler: 'Tallgrass Ag', commodity: 'Oats', contractPo: null, originBin: null, gross: 30940, tare: 12660, net: 18280, tareSource: 'stored', status: 'done' }
  ]

  const tickets: Ticket[] = mockToday.map((t) => ({
    ...t,
    createdAt: isoDaysAgo(now, 0, t.time[0], t.time[1]),
    capturedAt: t.status === 'done' ? isoDaysAgo(now, 0, t.time[0], t.time[1]) : null,
    direction: 'inbound'
  }))

  // 15 filler tickets earlier today to bring the day's total to 24 (22 in / 2 out),
  // matching the Reports/Tickets header counts in the design.
  let cursorNumber = 48189
  const fillerToday = 15
  for (let i = 0; i < fillerToday; i++) {
    const vehicle = pick(rng, vehicles)
    const product = pick(rng, products)
    const hauler = rng() < 0.2 ? pick(rng, haulers) : vehicle.hauler
    const payload = randInt(rng, 16500, 23500)
    const gross = (vehicle.storedTare ?? 13000) + payload
    const hour = randInt(rng, 6, 12)
    const minute = randInt(rng, 0, 59)
    tickets.push({
      id: formatTicketNumber(cursorNumber),
      createdAt: isoDaysAgo(now, 0, hour, minute),
      capturedAt: isoDaysAgo(now, 0, hour, minute),
      vehicleId: vehicle.id,
      vehicleDesc: vehicle.description,
      hauler,
      commodity: product.name,
      contractPo: `CN-${randInt(rng, 20000, 29999)}`,
      originBin: `Field ${randInt(rng, 1, 12)} · Bin ${randInt(rng, 1, 6)}`,
      gross,
      tare: vehicle.storedTare,
      net: gross - (vehicle.storedTare ?? 0),
      tareSource: 'stored',
      status: 'done',
      direction: i < 2 ? 'outbound' : 'inbound'
    })
    cursorNumber--
  }

  // Roughly a month of prior history so Week/Month ranges and Reports have real volume.
  for (let day = 1; day <= 29; day++) {
    const count = randInt(rng, 10, 22)
    for (let i = 0; i < count; i++) {
      const vehicle = pick(rng, vehicles)
      const product = pick(rng, products)
      const hauler = rng() < 0.2 ? pick(rng, haulers) : vehicle.hauler
      const payload = randInt(rng, 16500, 23500)
      const gross = (vehicle.storedTare ?? 13000) + payload
      const hour = randInt(rng, 6, 18)
      const minute = randInt(rng, 0, 59)
      tickets.push({
        id: formatTicketNumber(cursorNumber),
        createdAt: isoDaysAgo(now, day, hour, minute),
        capturedAt: isoDaysAgo(now, day, hour, minute),
        vehicleId: vehicle.id,
        vehicleDesc: vehicle.description,
        hauler,
        commodity: product.name,
        contractPo: `CN-${randInt(rng, 20000, 29999)}`,
        originBin: `Field ${randInt(rng, 1, 12)} · Bin ${randInt(rng, 1, 6)}`,
        gross,
        tare: vehicle.storedTare,
        net: gross - (vehicle.storedTare ?? 0),
        tareSource: 'stored',
        status: 'done',
        direction: rng() < 0.08 ? 'outbound' : 'inbound'
      })
      cursorNumber--
    }
  }

  const settings: Settings = {
    facilityName: 'Prairie Gold Co-op',
    facilityAddress: '1487 COUNTY RD 12 · HAYS, KS 67601',
    ntepCert: 'CC 09-068',
    operatorName: 'J. Mercer',
    scaleLabel: 'Scale 1 · Inbound',
    serialPort: 'COM3',
    baudRate: 9600,
    protocol: 'Cardinal SB',
    dataBits: 8,
    parity: 'None',
    stopBits: 1,
    scaleCapacityKg: 36000,
    scaleDivisionKg: 10,
    lastCalibration: isoDaysAgo(now, 164, 9, 0),
    tareValidityDays: 90,
    nextTicketNumber: 48213,
    printerName: 'Zebra ZD421',
    autoPrint: true,
    copies: 2
  }

  const users: (AuthUser & { pin: string })[] = [
    { id: 'jmercer', name: 'J. Mercer', username: 'jmercer', pin: '1234', role: 'operator' },
    { id: 'rcastillo', name: 'R. Castillo', username: 'rcastillo', pin: '4242', role: 'technician' }
  ]

  return { settings, vehicles, products, tickets, users }
}
