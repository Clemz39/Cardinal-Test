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
  serialPort TEXT NOT NULL,
  baudRate INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  dataBits INTEGER NOT NULL,
  parity TEXT NOT NULL,
  stopBits INTEGER NOT NULL,
  scaleCapacityKg REAL NOT NULL,
  scaleDivisionKg REAL NOT NULL,
  lastCalibration TEXT NOT NULL,
  tareValidityDays INTEGER NOT NULL,
  nextTicketNumber INTEGER NOT NULL,
  printerName TEXT NOT NULL,
  autoPrint INTEGER NOT NULL,
  copies INTEGER NOT NULL,
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
  pricePerTonne REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  capturedAt TEXT,
  vehicleId TEXT,
  vehicleDesc TEXT,
  hauler TEXT,
  commodity TEXT,
  contractPo TEXT,
  originBin TEXT,
  gross REAL,
  tare REAL,
  net REAL,
  tareSource TEXT NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_createdAt ON tickets(createdAt);
CREATE INDEX IF NOT EXISTS idx_tickets_vehicleId ON tickets(vehicleId);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`

function runMigrations(database: Database.Database): void {
  const migrations = [
    `ALTER TABLE settings ADD COLUMN backupPath TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE settings ADD COLUMN backupIntervalHours INTEGER NOT NULL DEFAULT 24`,
    `ALTER TABLE settings ADD COLUMN lastBackupAt TEXT`
  ]
  for (const sql of migrations) {
    try {
      database.exec(sql)
    } catch {
      // column already exists on fresh DBs — expected
    }
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
      serialPort, baudRate, protocol, dataBits, parity, stopBits,
      scaleCapacityKg, scaleDivisionKg, lastCalibration, tareValidityDays,
      nextTicketNumber, printerName, autoPrint, copies,
      backupPath, backupIntervalHours, lastBackupAt
    ) VALUES (
      1, @facilityName, @facilityAddress, @ntepCert, @operatorName, @scaleLabel,
      @serialPort, @baudRate, @protocol, @dataBits, @parity, @stopBits,
      @scaleCapacityKg, @scaleDivisionKg, @lastCalibration, @tareValidityDays,
      @nextTicketNumber, @printerName, @autoPrint, @copies,
      '', 24, NULL
    )
  `)
  insertSettings.run({ ...seed.settings, autoPrint: seed.settings.autoPrint ? 1 : 0 })

  const insertVehicle = database.prepare(`
    INSERT INTO vehicles (id, description, hauler, plate, storedTare, tareCapturedAt)
    VALUES (@id, @description, @hauler, @plate, @storedTare, @tareCapturedAt)
  `)
  const insertProduct = database.prepare(`
    INSERT INTO products (id, name, color, pricePerTonne)
    VALUES (@id, @name, @color, @pricePerTonne)
  `)
  const insertTicket = database.prepare(`
    INSERT INTO tickets (
      id, createdAt, capturedAt, vehicleId, vehicleDesc, hauler, commodity,
      contractPo, originBin, gross, tare, net, tareSource, status, direction
    ) VALUES (
      @id, @createdAt, @capturedAt, @vehicleId, @vehicleDesc, @hauler, @commodity,
      @contractPo, @originBin, @gross, @tare, @net, @tareSource, @status, @direction
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
