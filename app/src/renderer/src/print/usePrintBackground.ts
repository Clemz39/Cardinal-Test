import { useEffect } from 'react'

/**
 * Print routes render inside a hidden, offscreen window whose content height rarely
 * matches the printed page height — without this, the app's dashboard-gray body
 * background shows through below the content on the exported PDF/printout.
 */
export function usePrintBackground(): void {
  useEffect(() => {
    const root = document.getElementById('root')
    const previousBody = document.body.style.background
    const previousRootHeight = root?.style.height
    const previousRootBackground = root?.style.background
    document.body.style.background = '#fff'
    if (root) {
      root.style.height = 'auto'
      root.style.background = '#fff'
    }
    return () => {
      document.body.style.background = previousBody
      if (root) {
        root.style.height = previousRootHeight ?? ''
        root.style.background = previousRootBackground ?? ''
      }
    }
  }, [])
}
