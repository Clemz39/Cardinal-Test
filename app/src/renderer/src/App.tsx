import { useEffect, useState } from 'react'
import { TopChrome, ROLE_SCREENS, type AppScreen } from './shell/TopChrome'
import { LoginScreen } from './screens/LoginScreen'
import { WeighScreen } from './screens/WeighScreen'
import { TicketsScreen } from './screens/TicketsScreen'
import { VehiclesScreen } from './screens/VehiclesScreen'
import { ProductsScreen } from './screens/ProductsScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PrintModal } from './print/PrintModal'
import { PrintRoute } from './print/PrintRoute'
import { ReportPrintRoute } from './print/ReportPrintRoute'
import type { AuthUser, ReportRange } from '@shared/types'
import styles from './App.module.css'

function printIdFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get('print')
}

function printReportRangeFromLocation(): ReportRange | null {
  const params = new URLSearchParams(window.location.search)
  const from = params.get('printReportFrom')
  const to = params.get('printReportTo')
  return from && to ? { from, to } : null
}

function App() {
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [screen, setScreen] = useState<AppScreen>('weigh')
  const [printTicketId, setPrintTicketId] = useState<string | null>(null)

  useEffect(() => {
    window.api.auth.current().then((user) => {
      setCurrentUser(user)
      setAuthChecked(true)
    })
  }, [])

  const printRouteId = printIdFromLocation()
  if (printRouteId) return <PrintRoute ticketId={printRouteId} />
  const printReportRange = printReportRangeFromLocation()
  if (printReportRange) return <ReportPrintRoute range={printReportRange} />
  if (!authChecked) return null
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />

  const handleLogout = async (): Promise<void> => {
    await window.api.auth.logout()
    setCurrentUser(null)
    setScreen('weigh')
  }

  const allowed = ROLE_SCREENS[currentUser.role]

  return (
    <div className={styles.app}>
      <TopChrome screen={screen} onNavigate={setScreen} currentUser={currentUser} onLogout={handleLogout} />
      <div className={styles.content}>
        {screen === 'weigh' && <WeighScreen onPrint={setPrintTicketId} />}
        {screen === 'tickets' && <TicketsScreen onPrint={setPrintTicketId} />}
        {screen === 'vehicles' && <VehiclesScreen />}
        {screen === 'products' && allowed.includes('products') && <ProductsScreen />}
        {screen === 'reports' && <ReportsScreen />}
        {screen === 'settings' && allowed.includes('settings') && <SettingsScreen />}
      </div>
      {printTicketId && <PrintModal ticketId={printTicketId} onClose={() => setPrintTicketId(null)} />}
    </div>
  )
}

export default App
