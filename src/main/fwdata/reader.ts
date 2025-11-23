import { XMLParser } from 'fast-xml-parser'
import { withTransaction } from '../database/connection'
import { lexicalEntries, texts, textParagraphs } from '../database/schema'
import { validate as validateUuid } from 'uuid'
import type { LexEntry, LexSense, StText, TextParagraph, TextSegment } from '@shared/types'
import * as fs from 'fs/promises'

interface FWDataRT {
  '@_class': string
  '@_guid': string
  '@_ownerguid'?: string
  [key: string]: any
}

export class FWDataReader {
  private parser: XMLParser
  private objectCache: Map<string, any>
  private version: string = ''

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: false,
      trimValues: true,
      isArray: (tagName: string) => ['rt', 'AStr', 'AUni', 'objsur'].includes(tagName)
    })
    this.objectCache = new Map()
  }

  async loadProject(filePath: string): Promise<void> {
    console.log(`Loading FWData file: ${filePath}`)

    // Read file
    const xmlContent = await fs.readFile(filePath, 'utf-8')

    // Parse XML
    const parsed = this.parser.parse(xmlContent)

    if (!parsed.languageproject) {
      throw new Error('Invalid FWData file: missing languageproject root element')
    }

    // Extract version
    this.version = parsed.languageproject['@_version'] || '7000072'
    console.log(`FWData version: ${this.version}`)

    // Extract all <rt> elements (runtime objects)
    let rtElements: FWDataRT[] = []
    if (Array.isArray(parsed.languageproject.rt)) {
      rtElements = parsed.languageproject.rt
    } else if (parsed.languageproject.rt) {
      rtElements = [parsed.languageproject.rt]
    }

    console.log(`Found ${rtElements.length} runtime objects`)

    // Load data in transaction
    await withTransaction(async (db) => {
      // Clear existing data
      await db.delete(lexicalEntries)
      await db.delete(texts)

      // First pass: create all objects and cache them
      console.log('First pass: parsing objects...')
      for (const rt of rtElements) {
        try {
          const obj = this.parseObject(rt)
          if (obj) {
            this.objectCache.set(obj.guid, obj)
          }
        } catch (error) {
          console.error(`Error parsing object ${rt['@_guid']}:`, error)
        }
      }

      console.log(`Cached ${this.objectCache.size} objects`)

      // Second pass: resolve references and insert into database
      console.log('Second pass: inserting into database...')
      let entryCount = 0
      let textCount = 0

      for (const obj of this.objectCache.values()) {
        try {
          if (obj.class === 'LexEntry') {
            await this.insertLexEntry(db, obj)
            entryCount++
          } else if (obj.class === 'StText') {
            await this.insertText(db, obj)
            textCount++
          }
        } catch (error) {
          console.error(`Error inserting object ${obj.guid}:`, error)
        }
      }

      console.log(`Inserted ${entryCount} entries and ${textCount} texts`)
    })

    // Clear cache
    this.objectCache.clear()
  }

  private parseObject(rt: FWDataRT): any | null {
    const className = rt['@_class']
    const guid = rt['@_guid']
    const ownerguid = rt['@_ownerguid']

    if (!guid || !validateUuid(guid)) {
      console.warn(`Invalid or missing GUID: ${guid}`)
      return null
    }

    switch (className) {
      case 'LexEntry':
        return this.parseLexEntry(rt)
      case 'LexSense':
        return this.parseLexSense(rt)
      case 'StText':
        return this.parseStText(rt)
      case 'StTxtPara':
        return this.parseTextParagraph(rt)
      case 'Segment':
        return this.parseSegment(rt)
      default:
        // Store unknown objects for reference resolution
        return {
          guid,
          class: className,
          ownerguid,
          raw: rt
        }
    }
  }

  private parseLexEntry(rt: FWDataRT): Partial<LexEntry> {
    const guid = rt['@_guid']
    const ownerguid = rt['@_ownerguid']

    return {
      guid,
      class: 'LexEntry',
      ownerguid,
      lexemeForm: this.extractLexemeForm(rt.LexemeForm) || '',
      citationForm: this.extractText(rt.CitationForm),
      homographNumber: rt.HomographNumber?.['@_val'] ? parseInt(rt.HomographNumber['@_val']) : undefined,
      etymology: this.extractText(rt.Etymology),
      literalMeaning: this.extractText(rt.LiteralMeaning),
      dateCreated: this.parseDate(rt.DateCreated?.['@_val']) || new Date(),
      dateModified: this.parseDate(rt.DateModified?.['@_val']) || new Date(),
      senses: [], // Will be resolved in second pass
      isDirty: false
    }
  }

  private parseLexSense(rt: FWDataRT): Partial<LexSense> {
    const guid = rt['@_guid']
    const ownerguid = rt['@_ownerguid']

    return {
      guid,
      class: 'LexSense',
      ownerguid,
      definition: this.parseMultiString(rt.Definition) || {},
      gloss: this.parseMultiString(rt.Gloss) || {},
      dateCreated: this.parseDate(rt.DateCreated?.['@_val']) || new Date(),
      dateModified: this.parseDate(rt.DateModified?.['@_val']) || new Date()
    }
  }

  private parseStText(rt: FWDataRT): Partial<StText> {
    const guid = rt['@_guid']
    const ownerguid = rt['@_ownerguid']

    return {
      guid,
      class: 'StText',
      ownerguid,
      title: this.parseMultiString(rt.Title) || { en: 'Untitled' },
      dateCreated: this.parseDate(rt.DateCreated?.['@_val']) || new Date(),
      dateModified: this.parseDate(rt.DateModified?.['@_val']) || new Date(),
      paragraphs: []
    }
  }

  private parseTextParagraph(rt: FWDataRT): Partial<TextParagraph> {
    const guid = rt['@_guid']
    const ownerguid = rt['@_ownerguid']

    return {
      guid,
      class: 'StTxtPara',
      ownerguid,
      contents: this.parseMultiString(rt.Contents) || {},
      parseIsCurrent: rt.ParseIsCurrent?.['@_val'] === 'true',
      dateCreated: this.parseDate(rt.DateCreated?.['@_val']) || new Date(),
      dateModified: this.parseDate(rt.DateModified?.['@_val']) || new Date(),
      segments: []
    }
  }

  private parseSegment(rt: FWDataRT): Partial<TextSegment> {
    const guid = rt['@_guid']
    const ownerguid = rt['@_ownerguid']

    return {
      guid,
      class: 'Segment',
      ownerguid,
      baselineText: this.parseMultiString(rt.BaselineText) || {},
      freeTranslation: this.parseMultiString(rt.FreeTranslation),
      literalTranslation: this.parseMultiString(rt.LiteralTranslation),
      dateCreated: this.parseDate(rt.DateCreated?.['@_val']) || new Date(),
      dateModified: this.parseDate(rt.DateModified?.['@_val']) || new Date()
    }
  }

  private parseMultiString(node: any): Record<string, string> | undefined {
    if (!node) return undefined

    const result: Record<string, string> = {}
    const aStrArray = Array.isArray(node.AStr) ? node.AStr : node.AStr ? [node.AStr] : []

    for (const aStr of aStrArray) {
      if (!aStr) continue

      const ws = aStr['@_ws']
      if (!ws) continue

      // Extract text from Run elements
      if (aStr.Run) {
        const runs = Array.isArray(aStr.Run) ? aStr.Run : [aStr.Run]
        const texts = runs.map((run: any) => {
          if (typeof run === 'string') return run
          if (run['#text']) return run['#text']
          return ''
        })
        result[ws] = texts.join('')
      } else if (aStr['#text']) {
        result[ws] = aStr['#text']
      }
    }

    return Object.keys(result).length > 0 ? result : undefined
  }

  private extractLexemeForm(node: any): string | undefined {
    if (!node) return undefined

    // Try to extract from objsur reference
    if (node.objsur) {
      const objsurArray = Array.isArray(node.objsur) ? node.objsur : [node.objsur]
      for (const objsur of objsurArray) {
        const guid = objsur['@_guid']
        if (guid) {
          const obj = this.objectCache.get(guid)
          if (obj && obj.form) {
            return this.extractTextFromMultiString(obj.form)
          }
        }
      }
    }

    // Try direct multistring
    const ms = this.parseMultiString(node)
    if (ms) {
      return this.extractTextFromMultiString(ms)
    }

    return undefined
  }

  private extractText(node: any): string | undefined {
    if (!node) return undefined

    const ms = this.parseMultiString(node)
    if (ms) {
      return this.extractTextFromMultiString(ms)
    }

    if (node['@_val']) return node['@_val']
    if (typeof node === 'string') return node

    return undefined
  }

  private extractTextFromMultiString(ms: Record<string, string>): string {
    // Prefer English, then first available
    return ms.en || ms.eng || Object.values(ms)[0] || ''
  }

  private parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined

    try {
      return new Date(dateStr)
    } catch {
      return undefined
    }
  }

  private async insertLexEntry(db: any, entry: Partial<LexEntry>): Promise<void> {
    // Resolve senses
    const senses: LexSense[] = []

    // Look for senses owned by this entry
    for (const obj of this.objectCache.values()) {
      if (obj.class === 'LexSense' && obj.ownerguid === entry.guid) {
        senses.push(obj as LexSense)
      }
    }

    await db.insert(lexicalEntries).values({
      guid: entry.guid!,
      ownerguid: entry.ownerguid,
      lexemeForm: entry.lexemeForm!,
      citationForm: entry.citationForm,
      homographNumber: entry.homographNumber,
      etymology: entry.etymology,
      literalMeaning: entry.literalMeaning,
      sensesJson: JSON.stringify(senses),
      dateCreated: entry.dateCreated!,
      dateModified: entry.dateModified!,
      isDirty: false
    })
  }

  private async insertText(db: any, text: Partial<StText>): Promise<void> {
    // Resolve paragraphs
    const paragraphs: TextParagraph[] = []

    for (const obj of this.objectCache.values()) {
      if (obj.class === 'StTxtPara' && obj.ownerguid === text.guid) {
        // Resolve segments for this paragraph
        const segments: TextSegment[] = []
        for (const segObj of this.objectCache.values()) {
          if (segObj.class === 'Segment' && segObj.ownerguid === obj.guid) {
            segments.push(segObj as TextSegment)
          }
        }
        obj.segments = segments
        paragraphs.push(obj as TextParagraph)
      }
    }

    await db.insert(texts).values({
      guid: text.guid!,
      ownerguid: text.ownerguid,
      titleJson: JSON.stringify(text.title),
      dateCreated: text.dateCreated!,
      dateModified: text.dateModified!
    })

    // Insert paragraphs
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i]
      await db.insert(textParagraphs).values({
        guid: para.guid!,
        ownerguid: para.ownerguid,
        textGuid: text.guid!,
        contentsJson: JSON.stringify(para.contents),
        segmentsJson: JSON.stringify(para.segments || []),
        parseIsCurrent: para.parseIsCurrent || false,
        orderIndex: i,
        dateCreated: para.dateCreated!,
        dateModified: para.dateModified!
      })
    }
  }
}
