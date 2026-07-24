import { getDb } from '../db'
import type { Product, ProductWithStats } from '../../shared/types'
import { rangeFor } from '../../shared/dateRanges'
import { notify } from '../events'

function withStats(p: Product): ProductWithStats {
  const today = rangeFor('today')
  const row = getDb()
    .prepare(
      'SELECT COUNT(*) as c FROM tickets WHERE commodity = ? AND gross IS NOT NULL AND createdAt BETWEEN ? AND ?'
    )
    .get(p.name, today.from, today.to) as { c: number }
  return { ...p, loadsToday: row.c }
}

export function listProducts(): ProductWithStats[] {
  const rows = getDb().prepare('SELECT * FROM products ORDER BY name').all() as Product[]
  return rows.map(withStats)
}

export function getProduct(id: string): ProductWithStats | null {
  const row = getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
  return row ? withStats(row) : null
}

export function getProductByName(name: string): Product | null {
  const row = getDb().prepare('SELECT * FROM products WHERE name = ?').get(name) as Product | undefined
  return row ?? null
}

export function createProduct(input: Product): ProductWithStats {
  getDb()
    .prepare('INSERT INTO products (id, name, color, pricePerKg) VALUES (@id, @name, @color, @pricePerKg)')
    .run(input)
  notify('products')
  return getProduct(input.id)!
}

export function updateProduct(id: string, patch: Partial<Omit<Product, 'id'>>): ProductWithStats {
  const current = getProduct(id)
  if (!current) throw new Error(`Product ${id} not found`)
  const next = { ...current, ...patch }
  getDb()
    .prepare('UPDATE products SET name=@name, color=@color, pricePerKg=@pricePerKg WHERE id=@id')
    .run({ id, name: next.name, color: next.color, pricePerKg: next.pricePerKg })
  notify('products')
  return getProduct(id)!
}

export function deleteProduct(id: string): void {
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id)
  notify('products')
}
