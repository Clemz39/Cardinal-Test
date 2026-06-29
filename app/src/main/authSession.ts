import { verifyCredentials } from './repos/authRepo'
import type { AuthUser } from '../shared/types'

let currentUser: AuthUser | null = null

export function getCurrentUser(): AuthUser | null {
  return currentUser
}

export function login(username: string, pin: string): { ok: boolean; user?: AuthUser; reason?: string } {
  const user = verifyCredentials(username.trim(), pin.trim())
  if (!user) return { ok: false, reason: 'Invalid username or PIN' }
  currentUser = user
  return { ok: true, user }
}

export function logout(): void {
  currentUser = null
}
