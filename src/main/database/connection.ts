import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: BetterSQLite3Database<typeof schema> | null = null
let sqlite: Database.Database | null = null

export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error('SQLite not initialized. Call initDatabase() first.')
  }
  return sqlite
}

export function initDatabase(projectPath?: string): BetterSQLite3Database<typeof schema> {
  const dbPath = projectPath || path.join(app.getPath('userData'), 'fieldworks-default.db')

  // Ensure directory exists
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Create SQLite connection
  sqlite = new Database(dbPath)

  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('temp_store = MEMORY')
  sqlite.pragma('mmap_size = 30000000000')
  sqlite.pragma('page_size = 4096')

  // Create Drizzle instance
  db = drizzle(sqlite, { schema })

  // Create FTS5 virtual table if it doesn't exist
  createFts5Table()

  // Create indexes
  createIndexes()

  return db
}

function createFts5Table(): void {
  if (!sqlite) return

  try {
    // Create FTS5 virtual table for full-text search
    sqlite.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        lexeme_form,
        citation_form,
        definition_text,
        gloss_text,
        content='lexical_entries',
        content_rowid='rowid'
      );
    `)

    // Create triggers to keep FTS index in sync
    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON lexical_entries BEGIN
        INSERT INTO entries_fts(rowid, lexeme_form, citation_form, definition_text, gloss_text)
        VALUES (new.rowid, new.lexeme_form, new.citation_form, '', '');
      END;
    `)

    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON lexical_entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, lexeme_form, citation_form, definition_text, gloss_text)
        VALUES ('delete', old.rowid, old.lexeme_form, old.citation_form, '', '');
      END;
    `)

    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON lexical_entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, lexeme_form, citation_form, definition_text, gloss_text)
        VALUES ('delete', old.rowid, old.lexeme_form, old.citation_form, '', '');
        INSERT INTO entries_fts(rowid, lexeme_form, citation_form, definition_text, gloss_text)
        VALUES (new.rowid, new.lexeme_form, new.citation_form, '', '');
      END;
    `)
  } catch (error) {
    console.error('Error creating FTS5 table:', error)
  }
}

function createIndexes(): void {
  if (!sqlite) return

  try {
    // Indexes for lexical entries
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_lexeme ON lexical_entries(lexeme_form);
      CREATE INDEX IF NOT EXISTS idx_citation ON lexical_entries(citation_form);
      CREATE INDEX IF NOT EXISTS idx_modified ON lexical_entries(date_modified);
      CREATE INDEX IF NOT EXISTS idx_owner ON lexical_entries(owner_guid);
      CREATE INDEX IF NOT EXISTS idx_dirty ON lexical_entries(is_dirty);
    `)

    // Indexes for senses
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_sense_entry ON lexical_senses(entry_guid);
      CREATE INDEX IF NOT EXISTS idx_sense_owner ON lexical_senses(owner_guid);
    `)

    // Indexes for texts
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_text_modified ON texts(date_modified);
      CREATE INDEX IF NOT EXISTS idx_para_text ON text_paragraphs(text_guid);
      CREATE INDEX IF NOT EXISTS idx_para_order ON text_paragraphs(text_guid, order_index);
      CREATE INDEX IF NOT EXISTS idx_seg_para ON text_segments(paragraph_guid);
      CREATE INDEX IF NOT EXISTS idx_seg_order ON text_segments(paragraph_guid, order_index);
    `)

    // Indexes for wordforms and analyses
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_analysis_wordform ON analyses(wordform_guid);
    `)

    // Indexes for concordance
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_conc_word ON concordance_cache(wordform);
      CREATE INDEX IF NOT EXISTS idx_conc_text ON concordance_cache(text_guid);
    `)

    // Indexes for morphemes and parser
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_morph_type ON morphemes(type);
      CREATE INDEX IF NOT EXISTS idx_morph_category ON morphemes(category);
      CREATE INDEX IF NOT EXISTS idx_morph_form ON morphemes(form);
      CREATE INDEX IF NOT EXISTS idx_constraint_morpheme ON morpheme_constraints(morpheme_id);
    `)
  } catch (error) {
    console.error('Error creating indexes:', error)
  }
}

export function closeDatabase(): void {
  if (sqlite) {
    try {
      // Optimize database before closing
      sqlite.pragma('optimize')
      sqlite.close()
      sqlite = null
      db = null
    } catch (error) {
      console.error('Error closing database:', error)
    }
  }
}

export function beginTransaction(): void {
  getSqlite().exec('BEGIN TRANSACTION')
}

export function commitTransaction(): void {
  getSqlite().exec('COMMIT')
}

export function rollbackTransaction(): void {
  getSqlite().exec('ROLLBACK')
}

// Utility function for transactions
export async function withTransaction<T>(
  callback: (db: BetterSQLite3Database<typeof schema>) => Promise<T>
): Promise<T> {
  const database = getDatabase()
  beginTransaction()

  try {
    const result = await callback(database)
    commitTransaction()
    return result
  } catch (error) {
    rollbackTransaction()
    throw error
  }
}

// Backup utility
export async function createBackup(backupPath: string): Promise<void> {
  if (!sqlite) throw new Error('Database not initialized')

  await sqlite.backup(backupPath)
}
