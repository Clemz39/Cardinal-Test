import { useEffect, useState } from 'react'
import { PrintReportLayout } from './PrintReportLayout'
import { usePrintBackground } from './usePrintBackground'
import type { ReportRange, ReportSummary, Settings } from '@shared/types'

export interface ReportPrintRouteProps {
  range: ReportRange
}

export function ReportPrintRoute({ range }: ReportPrintRouteProps) {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [generatedAt] = useState(() => new Date().toISOString())
  usePrintBackground()

  useEffect(() => {
    window.api.reports.summary(range).then(setSummary)
    window.api.settings.get().then(setSettings)
  }, [range.from, range.to])

  if (!summary || !settings) return null

  return (
    <div style={{ background: '#fff' }}>
      <PrintReportLayout summary={summary} settings={settings} range={range} generatedAt={generatedAt} />
    </div>
  )
}
