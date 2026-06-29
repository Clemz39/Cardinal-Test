import { useEffect, useRef } from 'react'
import type { DataEntity } from '@shared/types'

export function useDataChanged(entities: DataEntity[], onChange: () => void): void {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const key = entities.join(',')

  useEffect(() => {
    const watched = key.split(',') as DataEntity[]
    return window.api.onDataChanged((changed) => {
      if (changed.some((e) => watched.includes(e))) onChangeRef.current()
    })
  }, [key])
}
