import { useState } from 'react'
import { TopChrome, type AppScreen } from './shell/TopChrome'
import { WeighScreen } from './screens/WeighScreen'
import { TicketsScreen } from './screens/TicketsScreen'
import { VehiclesScreen } from './screens/VehiclesScreen'
import { ProductsScreen } from './screens/ProductsScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PrintModal } from './print/PrintModal'
import { PrintRoute } from './print/PrintRoute'
import styles from './App.module.css'

function printIdFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get('print')
}

function App() {
  const [screen, setScreen] = useState<AppScreen>('weigh')
  const [printTicketId, setPrintTicketId] = useState<string | null>(null)

  const printRouteId = printIdFromLocation()
  if (printRouteId) return <PrintRoute ticketId={printRouteId} />

  return (
    <div className={styles.app}>
      <TopChrome screen={screen} onNavigate={setScreen} />
      <div className={styles.content}>
        {screen === 'weigh' && <WeighScreen onPrint={setPrintTicketId} />}
        {screen === 'tickets' && <TicketsScreen onPrint={setPrintTicketId} />}
        {screen === 'vehicles' && <VehiclesScreen />}
        {screen === 'products' && <ProductsScreen />}
        {screen === 'reports' && <ReportsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </div>
      {printTicketId && <PrintModal ticketId={printTicketId} onClose={() => setPrintTicketId(null)} />}
    </div>
  )
}

export default App
