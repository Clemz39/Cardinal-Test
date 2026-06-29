import { getDb } from '../db'
import type { AuthUser } from '../../shared/types'

interface UserRow extends AuthUser {
  pin: string
}

export function verifyCredentials(username: string, pin: string): AuthUser | null {
  const row = getDb()
    .prepare('SELECT id, name, username, role, pin FROM users WHERE username = ? COLLATE NOCASE')
    .get(username) as UserRow | undefined
  if (!row || row.pin !== pin) return null
  const { pin: _pin, ...user } = row
  return user
}
