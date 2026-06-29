import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './FieldLabel.module.css'

export type FieldLabelProps = HTMLAttributes<HTMLDivElement>

export function FieldLabel({ className, ...rest }: FieldLabelProps) {
  return <div className={cx(styles.label, className)} {...rest} />
}
