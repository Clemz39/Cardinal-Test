import type {
  AuthUser,
  DataEntity,
  Product,
  ProductWithStats,
  ReportRange,
  ReportSummary,
  ScaleReading,
  Settings,
  Ticket,
  TicketFilter,
  Vehicle,
  VehicleWithStats
} from './types'

export type OkResult = { ok: boolean; reason?: string }

export interface AtlasApi {
  auth: {
    login(username: string, pin: string): Promise<OkResult & { user?: AuthUser }>
    logout(): Promise<void>
    current(): Promise<AuthUser | null>
  }
  draft: {
    get(): Promise<Ticket>
    reset(): Promise<Ticket>
    setVehicle(vehicleId: string | null): Promise<Ticket>
    setField(field: 'hauler' | 'commodity' | 'contractPo' | 'originBin', value: string): Promise<Ticket>
    pressZero(): Promise<OkResult>
    pressTare(): Promise<OkResult>
    captureGross(): Promise<OkResult & { ticket?: Ticket }>
    save(): Promise<OkResult & { saved?: Ticket; nextDraft?: Ticket }>
  }
  tickets: {
    list(filter?: TicketFilter): Promise<Ticket[]>
    get(id: string): Promise<Ticket | null>
    recentDone(limit?: number): Promise<Ticket[]>
    distinctCommodities(): Promise<string[]>
    distinctHaulers(): Promise<string[]>
    exportCsv(filter?: TicketFilter): Promise<OkResult & { path?: string }>
    print(id: string, copies?: number): Promise<OkResult>
  }
  vehicles: {
    list(query?: string): Promise<VehicleWithStats[]>
    get(id: string): Promise<VehicleWithStats | null>
    create(input: Omit<Vehicle, 'storedTare' | 'tareCapturedAt'> & Partial<Pick<Vehicle, 'storedTare' | 'tareCapturedAt'>>): Promise<VehicleWithStats>
    update(id: string, patch: Partial<Omit<Vehicle, 'id'>>): Promise<VehicleWithStats>
    delete(id: string): Promise<void>
    history(id: string, limit?: number): Promise<Ticket[]>
    startReweigh(id: string): Promise<OkResult>
    cancelReweigh(): Promise<void>
    confirmReweigh(id: string): Promise<OkResult & { vehicle?: VehicleWithStats }>
    setManualTare(id: string, kg: number): Promise<VehicleWithStats>
  }
  products: {
    list(): Promise<ProductWithStats[]>
    get(id: string): Promise<ProductWithStats | null>
    create(input: Product): Promise<ProductWithStats>
    update(id: string, patch: Partial<Omit<Product, 'id'>>): Promise<ProductWithStats>
    delete(id: string): Promise<void>
  }
  settings: {
    get(): Promise<Settings>
    update(patch: Partial<Settings>): Promise<Settings>
  }
  reports: {
    summary(range: ReportRange): Promise<ReportSummary>
    exportPdf(range: ReportRange): Promise<OkResult & { path?: string }>
  }
  scale: {
    getReading(): Promise<ScaleReading>
    recentLines(limit?: number): Promise<string[]>
  }
  backup: {
    now(): Promise<{ ok: true; filePath: string } | { ok: false; error: string }>
    browse(): Promise<string | null>
    restore(filePath: string): Promise<{ ok: true } | { ok: false; error: string }>
    browseRestoreFile(): Promise<string | null>
  }
  onScaleReading(callback: (reading: ScaleReading) => void): () => void
  onDataChanged(callback: (entities: DataEntity[]) => void): () => void
}
