import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Card.module.css'

export type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...rest }: CardProps) {
  return <div className={cx(styles.card, className)} {...rest} />
}
