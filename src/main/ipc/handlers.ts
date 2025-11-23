import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { lexicalEntries } from '../database/schema'
import { eq, like, sql } from 'drizzle-orm'
import { FWDataReader } from '../fwdata/reader'
import { FWDataWriter } from '../fwdata/writer'
import type {
  LexEntry,
  CreateEntryInput,
  UpdateEntryInput,
  SearchQuery,
  SearchResult,
  BulkEditInput
} from '@shared/types'
import { nanoid } from 'nanoid'

export function registerIpcHandlers(): void {
  // Project Operations
  ipcMain.handle('project:open', async (event, filePath: string) => {
    try {
      const reader = new FWDataReader()
      await reader.loadProject(filePath)
      return { success: true }
    } catch (error: any) {
      console.error('Error opening project:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('project:save', async (event, filePath: string, projectGuid: string) => {
    try {
      const writer = new FWDataWriter()
      await writer.saveProject(filePath, projectGuid)
      return { success: true }
    } catch (error: any) {
      console.error('Error saving project:', error)
      return { success: false, error: error.message }
    }
  })

  // Lexicon Operations
  ipcMain.handle('lexicon:getEntries', async (event, limit: number = 1000, offset: number = 0) => {
    try {
      const db = getDatabase()
      const entries = await db
        .select()
        .from(lexicalEntries)
        .limit(limit)
        .offset(offset)
        .all()

      return entries.map(entryFromDb)
    } catch (error: any) {
      console.error('Error getting entries:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('lexicon:getEntry', async (event, guid: string) => {
    try {
      const db = getDatabase()
      const entry = await db
        .select()
        .from(lexicalEntries)
        .where(eq(lexicalEntries.guid, guid))
        .get()

      if (!entry) return null

      return entryFromDb(entry)
    } catch (error: any) {
      console.error('Error getting entry:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('lexicon:createEntry', async (event, input: CreateEntryInput) => {
    try {
      const db = getDatabase()

      const newEntry: LexEntry = {
        guid: nanoid(),
        class: 'LexEntry',
        lexemeForm: input.lexemeForm,
        senses: input.senses || [],
        dateCreated: new Date(),
        dateModified: new Date(),
        isDirty: true
      }

      await db.insert(lexicalEntries).values({
        guid: newEntry.guid,
        lexemeForm: newEntry.lexemeForm,
        sensesJson: JSON.stringify(newEntry.senses),
        dateCreated: newEntry.dateCreated,
        dateModified: newEntry.dateModified,
        isDirty: true
      })

      return newEntry
    } catch (error: any) {
      console.error('Error creating entry:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('lexicon:updateEntry', async (event, input: UpdateEntryInput) => {
    try {
      const db = getDatabase()

      const updates: any = {
        dateModified: new Date(),
        isDirty: true
      }

      if (input.lexemeForm !== undefined) updates.lexemeForm = input.lexemeForm
      if (input.citationForm !== undefined) updates.citationForm = input.citationForm
      if (input.senses !== undefined) updates.sensesJson = JSON.stringify(input.senses)
      if (input.etymology !== undefined) updates.etymology = input.etymology

      await db
        .update(lexicalEntries)
        .set(updates)
        .where(eq(lexicalEntries.guid, input.guid))

      return { success: true }
    } catch (error: any) {
      console.error('Error updating entry:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('lexicon:deleteEntry', async (event, guid: string) => {
    try {
      const db = getDatabase()

      await db
        .delete(lexicalEntries)
        .where(eq(lexicalEntries.guid, guid))

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting entry:', error)
      throw new Error(error.message)
    }
  })

  // Search Operations
  ipcMain.handle('search:entries', async (event, query: SearchQuery) => {
    try {
      const db = getDatabase()

      const results = await db.all<SearchResult>(sql`
        SELECT
          e.guid,
          e.lexeme_form as lexemeForm,
          e.citation_form as citationForm,
          snippet(entries_fts, 0, '<mark>', '</mark>', '...', 20) as highlight,
          rank
        FROM entries_fts
        JOIN lexical_entries e ON entries_fts.rowid = e.rowid
        WHERE entries_fts MATCH ${query.query}
        ORDER BY rank
        LIMIT ${query.limit || 100}
      `)

      return results
    } catch (error: any) {
      console.error('Error searching entries:', error)
      throw new Error(error.message)
    }
  })

  // Bulk Edit Operations
  ipcMain.handle('lexicon:bulkEdit', async (event, input: BulkEditInput) => {
    try {
      const db = getDatabase()

      let affectedCount = 0

      for (const guid of input.guids) {
        if (input.operation === 'delete') {
          await db
            .delete(lexicalEntries)
            .where(eq(lexicalEntries.guid, guid))

          affectedCount++
        } else if (input.operation === 'replace' && input.find && input.replace !== undefined) {
          // Get current entry
          const entry = await db
            .select()
            .from(lexicalEntries)
            .where(eq(lexicalEntries.guid, guid))
            .get()

          if (!entry) continue

          // Perform replacement based on field
          const updates: any = {
            dateModified: new Date(),
            isDirty: true
          }

          if (input.field === 'lexemeForm' && entry.lexemeForm) {
            updates.lexemeForm = entry.lexemeForm.replace(
              new RegExp(input.find, 'g'),
              input.replace
            )
          } else if (input.field === 'definition') {
            const senses = JSON.parse(entry.sensesJson || '[]')
            senses.forEach((sense: any) => {
              if (sense.definition) {
                Object.keys(sense.definition).forEach((ws) => {
                  sense.definition[ws] = sense.definition[ws].replace(
                    new RegExp(input.find, 'g'),
                    input.replace
                  )
                })
              }
            })
            updates.sensesJson = JSON.stringify(senses)
          }

          await db
            .update(lexicalEntries)
            .set(updates)
            .where(eq(lexicalEntries.guid, guid))

          affectedCount++
        }
      }

      return { success: true, affectedCount }
    } catch (error: any) {
      console.error('Error in bulk edit:', error)
      throw new Error(error.message)
    }
  })

  // Statistics
  ipcMain.handle('lexicon:getCount', async () => {
    try {
      const db = getDatabase()
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(lexicalEntries)
        .get()

      return result?.count || 0
    } catch (error: any) {
      console.error('Error getting count:', error)
      return 0
    }
  })
}

function entryFromDb(dbEntry: any): LexEntry {
  return {
    guid: dbEntry.guid,
    class: 'LexEntry',
    ownerguid: dbEntry.ownerguid,
    lexemeForm: dbEntry.lexemeForm,
    citationForm: dbEntry.citationForm,
    homographNumber: dbEntry.homographNumber,
    etymology: dbEntry.etymology,
    literalMeaning: dbEntry.literalMeaning,
    bibliography: dbEntry.bibliography,
    restrictions: dbEntry.restrictions,
    summaryDefinition: dbEntry.summaryDefinition,
    senses: JSON.parse(dbEntry.sensesJson || '[]'),
    pronunciations: JSON.parse(dbEntry.pronunciationsJson || '[]'),
    dateCreated: new Date(dbEntry.dateCreated),
    dateModified: new Date(dbEntry.dateModified),
    isDirty: dbEntry.isDirty
  }
}
