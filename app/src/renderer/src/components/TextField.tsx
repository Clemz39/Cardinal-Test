import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Field.module.css'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ mono = false, className, ...rest }, ref) => (
    <input ref={ref} className={cx(styles.field, mono && styles.mono, className)} {...rest} />
  )
)
TextField.displayName = 'TextField'
