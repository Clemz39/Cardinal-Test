import type { CSSProperties } from 'react'

export interface DotProps {
  color: string
  size?: number
  glow?: boolean
  pulse?: boolean
  style?: CSSProperties
}

export function Dot({ color, size = 8, glow = false, pulse = false, style }: DotProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: glow ? `0 0 7px ${color}` : undefined,
        animation: pulse ? 'pulseDot 2s infinite' : undefined,
        ...style
      }}
    />
  )
}
