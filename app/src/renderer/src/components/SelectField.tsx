import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Field.module.css'

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ mono = false, className, children, ...rest }, ref) => (
    <div className={styles.wrap}>
      <select ref={ref} className={cx(styles.field, styles.select, mono && styles.mono, className)} {...rest}>
        {children}
      </select>
      <span className={styles.chevron}>▾</span>
    </div>
  )
)
SelectField.displayName = 'SelectField'
