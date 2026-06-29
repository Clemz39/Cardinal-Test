import { EventEmitter } from 'events'
import type { DataEntity } from '../shared/types'

export const dataBus = new EventEmitter()

export function notify(...entities: DataEntity[]): void {
  dataBus.emit('changed', entities)
}
