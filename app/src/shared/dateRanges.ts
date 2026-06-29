import type { DateRangeKey, ReportRange } from './types'

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function rangeFor(key: DateRangeKey, now: Date = new Date()): ReportRange {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = startOfDay(now)

  if (key === 'today') {
    return { from: start.toISOString(), to: end.toISOString() }
  }
  if (key === 'week') {
    const weekStart = new Date(start)
    weekStart.setDate(weekStart.getDate() - 6)
    return { from: weekStart.toISOString(), to: end.toISOString() }
  }
  // month
  const monthStart = new Date(start)
  monthStart.setDate(monthStart.getDate() - 29)
  return { from: monthStart.toISOString(), to: end.toISOString() }
}
