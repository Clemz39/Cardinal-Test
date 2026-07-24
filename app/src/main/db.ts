import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { buildSeed } from './seed'

let db: Database.Database | null = null
let dbPath: string | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  facilityName TEXT NOT NULL,
  facilityAddress TEXT NOT NULL,
  ntepCert TEXT NOT NULL,
  operatorName TEXT NOT NULL,
  scaleLabel TEXT NOT NULL,
  dataSource TEXT NOT NULL DEFAULT 'simulator',
  serialPort TEXT NOT NULL,
  baudRate INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  dataBits INTEGER NOT NULL,
  parity TEXT NOT NULL,
  stopBits INTEGER NOT NULL,
  scaleCapacityKg REAL NOT NULL,
  scaleDivisionKg REAL NOT NULL,
  lastCalibration TEXT NOT NULL,
  calibrationIntervalDays INTEGER NOT NULL DEFAULT 365,
  tareValidityDays INTEGER NOT NULL,
  nextTicketNumber INTEGER NOT NULL,
  nextInvoiceNumber INTEGER NOT NULL DEFAULT 1000,
  printerName TEXT NOT NULL,
  autoPrint INTEGER NOT NULL,
  copies INTEGER NOT NULL,
  companyDetails TEXT NOT NULL DEFAULT '',
  companyLogo TEXT,
  backupPath TEXT NOT NULL DEFAULT '',
  backupIntervalHours INTEGER NOT NULL DEFAULT 24,
  lastBackupAt TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  hauler TEXT NOT NULL,
  plate TEXT NOT NULL,
  storedTare REAL,
  tareCapturedAt TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  pricePerKg REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  capturedAt TEXT,
  vehicleId TEXT,
  vehicleDesc TEXT,
  hauler TEXT,
  commodity TEXT,
  invoiceNumber TEXT,
  originBin TEXT,
  gross REAL,
  tare REAL,
  net REAL,
  unitPrice REAL,
  tareSource TEXT NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL,
  printedAt TEXT,
  voidedAt TEXT,
  voidedBy TEXT,
  voidReason TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_createdAt ON tickets(createdAt);
CREATE INDEX IF NOT EXISTS idx_tickets_vehicleId ON tickets(vehicleId);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`

function runMigrations(database: Database.Database): void {
  const migrations = [
    `ALTER TABLE settings ADD COLUMN backupPath TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE settings ADD COLUMN backupIntervalHours INTEGER NOT NULL DEFAULT 24`,
    `ALTER TABLE settings ADD COLUMN lastBackupAt TEXT`,
    `ALTER TABLE settings ADD COLUMN nextInvoiceNumber INTEGER NOT NULL DEFAULT 1000`,
    `ALTER TABLE settings ADD COLUMN companyDetails TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE settings ADD COLUMN companyLogo TEXT`,
    `ALTER TABLE settings ADD COLUMN dataSource TEXT NOT NULL DEFAULT 'simulator'`,
    `ALTER TABLE settings ADD COLUMN calibrationIntervalDays INTEGER NOT NULL DEFAULT 365`,
    `ALTER TABLE tickets RENAME COLUMN contractPo TO invoiceNumber`,
    `ALTER TABLE tickets ADD COLUMN unitPrice REAL`,
    `ALTER TABLE tickets ADD COLUMN printedAt TEXT`,
    `ALTER TABLE tickets ADD COLUMN voidedAt TEXT`,
    `ALTER TABLE tickets ADD COLUMN voidedBy TEXT`,
    `ALTER TABLE tickets ADD COLUMN voidReason TEXT`
  ]
  for (const sql of migrations) {
    try {
      database.exec(sql)
    } catch {
      // already applied on fresh/updated DBs — expected
    }
  }

  try {
    // Only succeeds on DBs still carrying the legacy column; convert the values exactly once.
    database.exec('ALTER TABLE products RENAME COLUMN pricePerTonne TO pricePerKg')
    database.exec('UPDATE products SET pricePerKg = pricePerKg / 1000.0')
  } catch {
    // already renamed, or fresh db created with pricePerKg directly
  }
}

function seedUsersIfEmpty(database: Database.Database, users: ReturnType<typeof buildSeed>['users']): void {
  const row = database.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (row.c > 0) return
  const insertUser = database.prepare(`
    INSERT INTO users (id, name, username, pin, role) VALUES (@id, @name, @username, @pin, @role)
  `)
  const tx = database.transaction(() => {
    for (const u of users) insertUser.run(u)
  })
  tx()
}

function seedIfEmpty(database: Database.Database, seed: ReturnType<typeof buildSeed>): void {
  const row = database.prepare('SELECT COUNT(*) as c FROM settings').get() as { c: number }
  if (row.c > 0) return

  const insertSettings = database.prepare(`
    INSERT INTO settings (
      id, facilityName, facilityAddress, ntepCert, operatorName, scaleLabel,
      dataSource, serialPort, baudRate, protocol, dataBits, parity, stopBits,
      scaleCapacityKg, scaleDivisionKg, lastCalibration, calibrationIntervalDays, tareValidityDays,
      nextTicketNumber, nextInvoiceNumber, printerName, autoPrint, copies,
      companyDetails, companyLogo,
      backupPath, backupIntervalHours, lastBackupAt
    ) VALUES (
      1, @facilityName, @facilityAddress, @ntepCert, @operatorName, @scaleLabel,
      @dataSource, @serialPort, @baudRate, @protocol, @dataBits, @parity, @stopBits,
      @scaleCapacityKg, @scaleDivisionKg, @lastCalibration, @calibrationIntervalDays, @tareValidityDays,
      @nextTicketNumber, @nextInvoiceNumber, @printerName, @autoPrint, @copies,
      '', NULL,
      '', 24, NULL
    )
  `)
  insertSettings.run({ ...seed.settings, autoPrint: seed.settings.autoPrint ? 1 : 0 })

  const insertVehicle = database.prepare(`
    INSERT INTO vehicles (id, description, hauler, plate, storedTare, tareCapturedAt)
    VALUES (@id, @description, @hauler, @plate, @storedTare, @tareCapturedAt)
  `)
  const insertProduct = database.prepare(`
    INSERT INTO products (id, name, color, pricePerKg)
    VALUES (@id, @name, @color, @pricePerKg)
  `)
  const insertTicket = database.prepare(`
    INSERT INTO tickets (
      id, createdAt, capturedAt, vehicleId, vehicleDesc, hauler, commodity,
      invoiceNumber, originBin, gross, tare, net, unitPrice, tareSource, status, direction,
      printedAt, voidedAt, voidedBy, voidReason
    ) VALUES (
      @id, @createdAt, @capturedAt, @vehicleId, @vehicleDesc, @hauler, @commodity,
      @invoiceNumber, @originBin, @gross, @tare, @net, @unitPrice, @tareSource, @status, @direction,
      @printedAt, @voidedAt, @voidedBy, @voidReason
    )
  `)

  const tx = database.transaction(() => {
    for (const v of seed.vehicles) insertVehicle.run(v)
    for (const p of seed.products) insertProduct.run(p)
    for (const t of seed.tickets) insertTicket.run(t)
  })
  tx()
}

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true })
  dbPath = join(userDataPath, 'atlasweigh.sqlite3')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  runMigrations(db)
  const seed = buildSeed(new Date())
  seedIfEmpty(db, seed)
  seedUsersIfEmpty(db, seed.users)

  return db
}

export function getDbPath(): string {
  if (!dbPath) getDb()
  return dbPath as string
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
