import { useEffect, useState } from 'react'
import { Badge } from '../components/Badge'
import { Dot } from '../components/Dot'
import { cx } from '../lib/cx'
import { formatDateTime } from '@shared/format'
import { useDataChanged } from '../hooks/useDataChanged'
import type { AuthUser, ScaleStatusInfo, Settings } from '@shared/types'
import appIcon from '../assets/icon.png'
import styles from './TopChrome.module.css'

const STATUS_COLOR: Record<ScaleStatusInfo['status'], string> = {
  connected: 'var(--color-green)',
  connecting: 'var(--color-amber-text)',
  disconnected: 'var(--color-text-faint)',
  error: '#e05555'
}

export type AppScreen = 'weigh' | 'tickets' | 'vehicles' | 'products' | 'reports' | 'settings'

export const ROLE_SCREENS: Record<AuthUser['role'], AppScreen[]> = {
  operator: ['weigh', 'tickets', 'vehicles', 'reports'],
  technician: ['weigh', 'tickets', 'vehicles', 'products', 'reports', 'settings']
}

const TABS: { key: AppScreen; label: string }[] = [
  { key: 'weigh', label: 'Weigh' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'products', label: 'Products' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' }
]

function serialSummary(s: Settings): string {
  return `${s.serialPort} · ${s.baudRate} ${s.dataBits}-${s.parity[0]}-${s.stopBits}`
}

interface TopChromeProps {
  screen: AppScreen
  onNavigate: (screen: AppScreen) => void
  currentUser: AuthUser
  onLogout: () => void
}

export function TopChrome({ screen, onNavigate, currentUser, onLogout }: TopChromeProps) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [scaleStatus, setScaleStatus] = useState<ScaleStatusInfo | null>(null)
  const [now, setNow] = useState(() => new Date())
  const tabs = TABS.filter((tab) => ROLE_SCREENS[currentUser.role].includes(tab.key))

  const loadSettings = (): void => {
    window.api.settings.get().then(setSettings)
  }
  useEffect(loadSettings, [])
  useDataChanged(['settings'], loadSettings)

  useEffect(() => {
    window.api.scale.getStatus().then(setScaleStatus)
    return window.api.onScaleStatus(setScaleStatus)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className={styles.chrome}>
      <div className={styles.left}>
        <img className={styles.logo} src={appIcon} alt="" />
        <div className={styles.wordmark}>ATLAS WEIGH NAVIGATOR</div>
        {settings && <div className={styles.scaleLabel}>{settings.scaleLabel}</div>}
      </div>

      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={cx(styles.tab, screen === tab.key && styles.tabActive)}
            onClick={() => onNavigate(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.right}>
        <div className={styles.connection}>
          <Dot
            color={scaleStatus ? STATUS_COLOR[scaleStatus.status] : 'var(--color-text-faint)'}
            glow={scaleStatus?.status === 'connected'}
            pulse={scaleStatus?.status === 'connected' || scaleStatus?.status === 'connecting'}
          />
          <span>{settings ? serialSummary(settings) : ''}</span>
        </div>
        <div className={styles.operator}>{currentUser.name}</div>
        <Badge tone="dark" variant="outline" pill>
          {currentUser.role === 'technician' ? 'TECH' : 'OPERATOR'}
        </Badge>
        <button type="button" className={styles.logout} onClick={onLogout}>
          Log Out
        </button>
        <div className={styles.clock}>{formatDateTime(now.toISOString())}</div>
      </div>
    </header>
  )
}
