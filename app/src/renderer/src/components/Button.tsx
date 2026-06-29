import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'success'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  muted?: boolean
  glow?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', muted = false, glow = false, className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cx(styles.btn, styles[variant], muted && styles.muted, glow && styles.glow, className)}
      {...rest}
    />
  )
)
Button.displayName = 'Button'
