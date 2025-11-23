import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { lexicalEntries, texts, textParagraphs, morphemes, morphemeConstraints } from '../database/schema'
import { eq, sql } from 'drizzle-orm'
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
  ipcMain.handle('project:open', async (_event, filePath: string) => {
    try {
      const reader = new FWDataReader()
      await reader.loadProject(filePath)
      return { success: true }
    } catch (error: any) {
      console.error('Error opening project:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('project:save', async (_event, filePath: string, projectGuid: string) => {
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
  ipcMain.handle('lexicon:getEntries', async (_event, limit: number = 1000, offset: number = 0) => {
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

  ipcMain.handle('lexicon:getEntry', async (_event, guid: string) => {
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

  ipcMain.handle('lexicon:createEntry', async (_event, input: CreateEntryInput) => {
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

  ipcMain.handle('lexicon:updateEntry', async (_event, input: UpdateEntryInput) => {
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

  ipcMain.handle('lexicon:deleteEntry', async (_event, guid: string) => {
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
  ipcMain.handle('search:entries', async (_event, query: SearchQuery) => {
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
  ipcMain.handle('lexicon:bulkEdit', async (_event, input: BulkEditInput) => {
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

          if (input.field === 'lexemeForm' && entry.lexemeForm && input.find) {
            updates.lexemeForm = entry.lexemeForm.replace(
              new RegExp(input.find, 'g'),
              input.replace
            )
          } else if (input.field === 'definition' && input.find) {
            const senses = JSON.parse(entry.sensesJson || '[]')
            const findPattern = input.find
            const replaceWith = input.replace
            senses.forEach((sense: any) => {
              if (sense.definition) {
                Object.keys(sense.definition).forEach((ws) => {
                  sense.definition[ws] = sense.definition[ws].replace(
                    new RegExp(findPattern, 'g'),
                    replaceWith
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

  // Text Operations
  ipcMain.handle('texts:getAll', async (_event, limit: number = 1000, offset: number = 0) => {
    try {
      const db = getDatabase()
      const textsList = await db
        .select()
        .from(texts)
        .limit(limit)
        .offset(offset)
        .all()

      return textsList.map(textFromDb)
    } catch (error: any) {
      console.error('Error getting texts:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('texts:getById', async (_event, guid: string) => {
    try {
      const db = getDatabase()
      const text = await db
        .select()
        .from(texts)
        .where(eq(texts.guid, guid))
        .get()

      if (!text) throw new Error('Text not found')

      // Get paragraphs for this text
      const paragraphs = await db
        .select()
        .from(textParagraphs)
        .where(eq(textParagraphs.textGuid, guid))
        .orderBy(textParagraphs.orderIndex)
        .all()

      return {
        ...textFromDb(text),
        paragraphs: paragraphs.map(paragraphFromDb)
      }
    } catch (error: any) {
      console.error('Error getting text:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('texts:create', async (_event, input: { title: Record<string, string>; genre?: string }) => {
    try {
      const db = getDatabase()

      const newText = {
        guid: nanoid(),
        titleJson: JSON.stringify(input.title),
        genre: input.genre || '',
        source: '',
        description: '',
        abbreviation: '',
        dateCreated: new Date(),
        dateModified: new Date()
      }

      await db.insert(texts).values(newText).run()

      return textFromDb(newText)
    } catch (error: any) {
      console.error('Error creating text:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('texts:update', async (_event, guid: string, updates: Partial<{ title: Record<string, string>; genre: string; description: string }>) => {
    try {
      const db = getDatabase()

      const updateData: any = {
        dateModified: new Date()
      }

      if (updates.title) updateData.titleJson = JSON.stringify(updates.title)
      if (updates.genre) updateData.genre = updates.genre
      if (updates.description) updateData.description = updates.description

      await db
        .update(texts)
        .set(updateData)
        .where(eq(texts.guid, guid))
        .run()

      const updated = await db
        .select()
        .from(texts)
        .where(eq(texts.guid, guid))
        .get()

      return textFromDb(updated)
    } catch (error: any) {
      console.error('Error updating text:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('texts:delete', async (_event, guid: string) => {
    try {
      const db = getDatabase()

      // Delete paragraphs first
      await db.delete(textParagraphs).where(eq(textParagraphs.textGuid, guid)).run()

      // Delete text
      await db.delete(texts).where(eq(texts.guid, guid)).run()

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting text:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('texts:addParagraph', async (_event, textGuid: string, content: Record<string, string>) => {
    try {
      const db = getDatabase()

      // Get max order index
      const maxOrder = await db
        .select({ max: sql<number>`MAX(order_index)` })
        .from(textParagraphs)
        .where(eq(textParagraphs.textGuid, textGuid))
        .get()

      const newParagraph = {
        guid: nanoid(),
        textGuid,
        contentsJson: JSON.stringify(content),
        segmentsJson: '[]',
        parseIsCurrent: false,
        orderIndex: (maxOrder?.max || -1) + 1,
        dateCreated: new Date(),
        dateModified: new Date()
      }

      await db.insert(textParagraphs).values(newParagraph).run()

      return paragraphFromDb(newParagraph)
    } catch (error: any) {
      console.error('Error adding paragraph:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('texts:updateParagraph', async (_event, guid: string, content: Record<string, string>) => {
    try {
      const db = getDatabase()

      await db
        .update(textParagraphs)
        .set({
          contentsJson: JSON.stringify(content),
          dateModified: new Date()
        })
        .where(eq(textParagraphs.guid, guid))
        .run()

      const updated = await db
        .select()
        .from(textParagraphs)
        .where(eq(textParagraphs.guid, guid))
        .get()

      return paragraphFromDb(updated)
    } catch (error: any) {
      console.error('Error updating paragraph:', error)
      throw new Error(error.message)
    }
  })

  // Export Operations
  ipcMain.handle('export:getEntries', async (_event) => {
    try {
      const db = getDatabase()
      const entries = await db
        .select()
        .from(lexicalEntries)
        .all()

      return entries.map(entryFromDb)
    } catch (error: any) {
      console.error('Error getting entries for export:', error)
      throw new Error(error.message)
    }
  })

  // Parser Operations
  ipcMain.handle('parser:getMorphemes', async (_event) => {
    try {
      const db = getDatabase()
      const morphs = await db
        .select()
        .from(morphemes)
        .all()

      return morphs.map(morphemeFromDb)
    } catch (error: any) {
      console.error('Error getting morphemes:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('parser:createMorpheme', async (_event, input: any) => {
    try {
      const db = getDatabase()
      const id = input.id || `morph-${Date.now()}`

      const newMorpheme = {
        id,
        form: input.form,
        type: input.type,
        category: input.category,
        gloss: input.gloss,
        propertiesJson: JSON.stringify(input.properties || []),
        allomorphsJson: JSON.stringify(input.allomorphs || []),
        dateCreated: new Date(),
        dateModified: new Date()
      }

      await db.insert(morphemes).values(newMorpheme).run()

      return morphemeFromDb(newMorpheme)
    } catch (error: any) {
      console.error('Error creating morpheme:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('parser:updateMorpheme', async (_event, id: string, updates: any) => {
    try {
      const db = getDatabase()

      const updateData: any = {
        dateModified: new Date()
      }

      if (updates.form !== undefined) updateData.form = updates.form
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.category !== undefined) updateData.category = updates.category
      if (updates.gloss !== undefined) updateData.gloss = updates.gloss
      if (updates.properties !== undefined) updateData.propertiesJson = JSON.stringify(updates.properties)
      if (updates.allomorphs !== undefined) updateData.allomorphsJson = JSON.stringify(updates.allomorphs)

      await db
        .update(morphemes)
        .set(updateData)
        .where(eq(morphemes.id, id))
        .run()

      const updated = await db
        .select()
        .from(morphemes)
        .where(eq(morphemes.id, id))
        .get()

      return morphemeFromDb(updated)
    } catch (error: any) {
      console.error('Error updating morpheme:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('parser:deleteMorpheme', async (_event, id: string) => {
    try {
      const db = getDatabase()

      await db
        .delete(morphemes)
        .where(eq(morphemes.id, id))
        .run()

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting morpheme:', error)
      throw new Error(error.message)
    }
  })

  ipcMain.handle('parser:parseWord', async (_event, word: string, config?: any) => {
    try {
      const { MorphologicalParser } = await import('../parser/morphologicalParser')
      const db = getDatabase()

      // Load all morphemes from database
      const allMorphemes = await db.select().from(morphemes).all()
      const morphemeList = allMorphemes.map(morphemeFromDb)

      // Load all constraints
      const allConstraints = await db.select().from(morphemeConstraints).all()
      const constraintList = allConstraints.map((c: any) => ({
        id: c.id,
        morphemeId: c.morphemeId,
        requires: JSON.parse(c.requiresJson || '[]'),
        excludes: JSON.parse(c.excludesJson || '[]'),
        mustPrecede: JSON.parse(c.mustPrecedeJson || '[]'),
        mustFollow: JSON.parse(c.mustFollowJson || '[]')
      }))

      // Create parser and load data
      const parser = new MorphologicalParser(config)
      parser.loadMorphemes(morphemeList)
      parser.loadConstraints(constraintList)

      // Parse the word
      const result = parser.parseWord(word)

      return result
    } catch (error: any) {
      console.error('Error parsing word:', error)
      throw new Error(error.message)
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

function textFromDb(dbText: any): any {
  return {
    guid: dbText.guid,
    class: 'Text',
    ownerguid: dbText.ownerguid,
    title: JSON.parse(dbText.titleJson || '{}'),
    genre: dbText.genre,
    source: dbText.source,
    description: dbText.description,
    abbreviation: dbText.abbreviation,
    dateCreated: new Date(dbText.dateCreated),
    dateModified: new Date(dbText.dateModified)
  }
}

function paragraphFromDb(dbPara: any): any {
  return {
    guid: dbPara.guid,
    class: 'StTxtPara',
    ownerguid: dbPara.ownerguid,
    textGuid: dbPara.textGuid,
    contents: JSON.parse(dbPara.contentsJson || '{}'),
    segments: JSON.parse(dbPara.segmentsJson || '[]'),
    parseIsCurrent: dbPara.parseIsCurrent,
    orderIndex: dbPara.orderIndex,
    dateCreated: new Date(dbPara.dateCreated),
    dateModified: new Date(dbPara.dateModified)
  }
}

function morphemeFromDb(dbMorph: any): any {
  return {
    id: dbMorph.id,
    form: dbMorph.form,
    type: dbMorph.type,
    category: dbMorph.category,
    gloss: dbMorph.gloss,
    properties: JSON.parse(dbMorph.propertiesJson || '[]'),
    allomorphs: JSON.parse(dbMorph.allomorphsJson || '[]'),
    dateCreated: new Date(dbMorph.dateCreated),
    dateModified: new Date(dbMorph.dateModified)
  }
}
