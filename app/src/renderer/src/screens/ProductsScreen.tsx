import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel } from '../components/FieldLabel'
import { TextField } from '../components/TextField'
import { useDataChanged } from '../hooks/useDataChanged'
import { cx } from '../lib/cx'
import type { Product, ProductWithStats } from '@shared/types'
import styles from './ProductsScreen.module.css'

const SWATCHES = ['#f0a83c', '#6b8f3a', '#3a78e0', '#a6452e', '#c9a24a', '#4a7a8c', '#8a6bb0']

const EMPTY_FORM = { name: '', color: SWATCHES[0], pricePerTonne: '' }
type ProductFormState = typeof EMPTY_FORM

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function uniqueId(name: string, existing: ProductWithStats[]): string {
  const base = slugify(name) || 'commodity'
  let candidate = base
  let n = 2
  while (existing.some((p) => p.id === candidate)) {
    candidate = `${base}-${n}`
    n += 1
  }
  return candidate
}

export function ProductsScreen() {
  const [products, setProducts] = useState<ProductWithStats[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'editing' | 'adding'>('idle')
  const [editForm, setEditForm] = useState<ProductFormState>(EMPTY_FORM)
  const [addForm, setAddForm] = useState<ProductFormState>(EMPTY_FORM)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadProducts = (): void => {
    window.api.products.list().then(setProducts)
  }

  useEffect(loadProducts, [])
  useDataChanged(['products'], loadProducts)

  const startAdd = (): void => {
    setAddForm(EMPTY_FORM)
    setActionError(null)
    setMode('adding')
  }

  const submitAdd = async (): Promise<void> => {
    const name = addForm.name.trim()
    const price = Number(addForm.pricePerTonne)
    if (!name || !Number.isFinite(price) || price <= 0) {
      setActionError('Name and a valid price are required')
      return
    }
    const input: Product = { id: uniqueId(name, products), name, color: addForm.color, pricePerTonne: price }
    await window.api.products.create(input)
    setMode('idle')
    setActionError(null)
  }

  const selectProduct = (p: ProductWithStats): void => {
    if (mode === 'editing' && selectedId === p.id) {
      setMode('idle')
      setSelectedId(null)
      return
    }
    setSelectedId(p.id)
    setEditForm({ name: p.name, color: p.color, pricePerTonne: String(Math.round(p.pricePerTonne)) })
    setActionError(null)
    setMode('editing')
  }

  const submitEdit = async (): Promise<void> => {
    if (!selectedId) return
    const name = editForm.name.trim()
    const price = Number(editForm.pricePerTonne)
    if (!name || !Number.isFinite(price) || price <= 0) {
      setActionError('Name and a valid price are required')
      return
    }
    await window.api.products.update(selectedId, { name, color: editForm.color, pricePerTonne: price })
    setActionError(null)
    setMode('idle')
    setSelectedId(null)
  }

  const cancelEdit = (): void => {
    setMode('idle')
    setSelectedId(null)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.title}>Commodities</div>
          <div className={styles.subtitle}>Master data · pricing &amp; defaults</div>
        </div>
        <Button variant="primary" style={{ padding: '10px 16px', fontSize: 12 }} onClick={startAdd}>
          + Add Commodity
        </Button>
      </div>

      {actionError && <div className={styles.actionError}>{actionError}</div>}

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>COMMODITY</span>
          <span className={styles.right}>PRICE / TONNE</span>
          <span className={styles.right}>LOADS TODAY</span>
        </div>

        {mode === 'adding' && (
          <AddProductForm form={addForm} onChange={setAddForm} onSave={submitAdd} onCancel={() => setMode('idle')} />
        )}

        {products.length === 0 && mode !== 'adding' && <div className={styles.empty}>No commodities yet</div>}

        {products.map((p) => (
          <div key={p.id}>
            <div
              className={cx(styles.row, mode === 'editing' && selectedId === p.id && styles.rowSelected)}
              onClick={() => selectProduct(p)}
            >
              <span className={styles.nameCell}>
                <span className={styles.swatch} style={{ background: p.color }} />
                <span className={styles.nameText}>{p.name}</span>
              </span>
              <span className={cx(styles.right, styles.priceCell)}>${Math.round(p.pricePerTonne)} / t</span>
              <span className={cx(styles.right, styles.todayCell)}>
                {p.loadsToday} load{p.loadsToday === 1 ? '' : 's'}
              </span>
            </div>
            {mode === 'editing' && selectedId === p.id && (
              <EditProductForm form={editForm} onChange={setEditForm} onSave={submitEdit} onCancel={cancelEdit} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface SwatchPickerProps {
  value: string
  onChange: (color: string) => void
}

function SwatchPicker({ value, onChange }: SwatchPickerProps) {
  return (
    <div className={styles.swatchPicker}>
      {SWATCHES.map((c) => (
        <span
          key={c}
          className={cx(styles.swatchOption, c === value && styles.swatchOptionActive)}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}

interface ProductFormProps {
  form: ProductFormState
  onChange: (form: ProductFormState) => void
  onSave: () => void
  onCancel: () => void
}

function AddProductForm({ form, onChange, onSave, onCancel }: ProductFormProps) {
  return (
    <div className={styles.addRow}>
      <div className={styles.editGrid}>
        <div>
          <FieldLabel>COMMODITY NAME</FieldLabel>
          <TextField
            value={form.name}
            placeholder="Corn #2 Yellow"
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>PRICE / TONNE</FieldLabel>
          <TextField
            mono
            type="number"
            value={form.pricePerTonne}
            placeholder="165"
            onChange={(e) => onChange({ ...form, pricePerTonne: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>COLOR</FieldLabel>
          <SwatchPicker value={form.color} onChange={(color) => onChange({ ...form, color })} />
        </div>
      </div>
      <div className={styles.editActions}>
        <Button variant="secondary" style={{ padding: '11px 20px', fontSize: 12 }} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" style={{ padding: '11px 20px', fontSize: 12 }} onClick={onSave}>
          Add Commodity
        </Button>
      </div>
    </div>
  )
}

function EditProductForm({ form, onChange, onSave, onCancel }: ProductFormProps) {
  return (
    <div className={styles.editRow}>
      <div className={styles.editGrid}>
        <div>
          <FieldLabel>COMMODITY NAME</FieldLabel>
          <TextField value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
        </div>
        <div>
          <FieldLabel>PRICE / TONNE</FieldLabel>
          <TextField
            mono
            type="number"
            value={form.pricePerTonne}
            onChange={(e) => onChange({ ...form, pricePerTonne: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>COLOR</FieldLabel>
          <SwatchPicker value={form.color} onChange={(color) => onChange({ ...form, color })} />
        </div>
      </div>
      <div className={styles.editActions}>
        <Button variant="secondary" style={{ padding: '11px 20px', fontSize: 12 }} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" style={{ padding: '11px 20px', fontSize: 12 }} onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}
