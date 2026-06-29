import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { FieldLabel } from '../components/FieldLabel'
import { TextField } from '../components/TextField'
import type { AuthUser } from '@shared/types'
import styles from './LoginScreen.module.css'

export interface LoginScreenProps {
  onLogin: (user: AuthUser) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!username.trim() || !pin.trim()) return
    setSubmitting(true)
    setError(null)
    const result = await window.api.auth.login(username, pin)
    setSubmitting(false)
    if (!result.ok || !result.user) {
      setError(result.reason ?? 'Invalid username or PIN')
      return
    }
    onLogin(result.user)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoDot} />
          </div>
          <div className={styles.wordmark}>ATLAS WEIGH NAVIGATOR</div>
          <div className={styles.subtitle}>WEIGHBRIDGE TERMINAL</div>
        </div>
        <form className={styles.body} onSubmit={handleSubmit}>
          <div className={styles.title}>Sign in</div>
          <div className={styles.fieldGroup}>
            <FieldLabel>USERNAME</FieldLabel>
            <TextField
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jmercer"
            />
          </div>
          <div className={styles.fieldGroup}>
            <FieldLabel>PIN</FieldLabel>
            <TextField
              mono
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <Button type="submit" variant="primary" className={styles.submit} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
          <div className={styles.hint}>Demo: jmercer / 1234 (Operator) · rcastillo / 4242 (Technician)</div>
        </form>
      </div>
    </div>
  )
}
