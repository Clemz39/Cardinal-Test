import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Badge.module.css'

export type BadgeTone = 'green' | 'amber' | 'dark' | 'chrome' | 'greenDim'
export type BadgeVariant = 'solid' | 'outline' | 'text'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  variant?: BadgeVariant
  pill?: boolean
}

export function Badge({ tone = 'dark', variant = 'outline', pill = false, className, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(styles.badge, styles[variant], styles[tone], pill && styles.pill, className)}
      {...rest}
    />
  )
}
