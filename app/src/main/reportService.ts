import { getDb } from './db'
import type { ReportRange, ReportSummary } from '../shared/types'
import { listProducts } from './repos/productRepo'

export function getReportSummary(range: ReportRange): ReportSummary {
  const db = getDb()

  const totals = db
    .prepare(
      `SELECT
        COUNT(*) as ticketCount,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inboundCount,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outboundCount,
        COALESCE(SUM(CASE WHEN net IS NOT NULL THEN net ELSE 0 END), 0) as netReceivedKg,
        SUM(CASE WHEN net IS NOT NULL THEN 1 ELSE 0 END) as weighedCount
      FROM tickets WHERE createdAt BETWEEN @from AND @to`
    )
    .get(range) as {
    ticketCount: number
    inboundCount: number
    outboundCount: number
    netReceivedKg: number
    weighedCount: number
  }

  const byCommodity = db
    .prepare(
      `SELECT commodity as name, SUM(net) as valueKg
       FROM tickets
       WHERE createdAt BETWEEN @from AND @to AND net IS NOT NULL AND commodity IS NOT NULL
       GROUP BY commodity
       ORDER BY valueKg DESC`
    )
    .all(range) as { name: string; valueKg: number }[]

  const colorByName = new Map(listProducts().map((p) => [p.name, p.color]))
  const maxCommodityKg = byCommodity.length ? byCommodity[0].valueKg : 0
  const commodityBars = byCommodity.map((c) => ({
    name: c.name,
    color: colorByName.get(c.name) ?? '#8a897f',
    valueKg: c.valueKg,
    pct: maxCommodityKg > 0 ? Math.round((c.valueKg / maxCommodityKg) * 100) : 0
  }))

  const byHauler = db
    .prepare(
      `SELECT hauler as name, COUNT(*) as loads, SUM(net) as netKg
       FROM tickets
       WHERE createdAt BETWEEN @from AND @to AND net IS NOT NULL AND hauler IS NOT NULL
       GROUP BY hauler
       ORDER BY netKg DESC
       LIMIT 5`
    )
    .all(range) as { name: string; loads: number; netKg: number }[]

  const topCommodity = byCommodity[0]?.name ?? null
  const topCommodityPct =
    topCommodity && totals.netReceivedKg > 0 ? Math.round((byCommodity[0].valueKg / totals.netReceivedKg) * 100) : 0

  return {
    netReceivedKg: totals.netReceivedKg,
    ticketCount: totals.ticketCount,
    inboundCount: totals.inboundCount,
    outboundCount: totals.outboundCount,
    avgNetPerLoadKg: totals.weighedCount > 0 ? Math.round(totals.netReceivedKg / totals.weighedCount) : 0,
    topCommodity,
    topCommodityPct,
    commodityBars,
    topHaulers: byHauler
  }
}
