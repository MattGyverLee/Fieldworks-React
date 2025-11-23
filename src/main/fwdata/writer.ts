import { XMLBuilder } from 'fast-xml-parser'
import { getDatabase } from '../database/connection'
import { lexicalEntries, texts } from '../database/schema'
import * as fs from 'fs/promises'
import type { LexSense } from '@shared/types'

export class FWDataWriter {
  private builder: XMLBuilder

  constructor() {
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
      suppressBooleanAttributes: false
    })
  }

  async saveProject(filePath: string, projectGuid: string): Promise<void> {
    console.log(`Saving FWData to: ${filePath}`)

    // Create backup of existing file
    await this.createBackup(filePath)

    const db = getDatabase()

    // Collect all entries from SQLite
    const entries = await db.select().from(lexicalEntries).all()
    console.log(`Collected ${entries.length} entries`)

    // Collect all texts
    const textsList = await db.select().from(texts).all()
    console.log(`Collected ${textsList.length} texts`)

    // Build XML structure
    const xmlObject = {
      languageproject: {
        '@_version': '7000072',
        '@_guid': projectGuid,
        AdditionalFields: {}, // TODO: custom fields support
        rt: this.collectAllObjects(entries, textsList)
      }
    }

    // Write to temp file first
    const tempPath = `${filePath}.tmp`
    const xmlString = '<?xml version="1.0" encoding="utf-8"?>\n' + this.builder.build(xmlObject)

    await fs.writeFile(tempPath, xmlString, 'utf-8')

    // Atomic rename
    await fs.rename(tempPath, filePath)

    console.log('FWData saved successfully')
  }

  private collectAllObjects(entries: any[], textsList: any[]): any[] {
    const xmlObjects: any[] = []

    // Add lexical entries and their senses
    for (const entry of entries) {
      // Add entry object
      xmlObjects.push(this.entryToXmlObject(entry))

      // Add sense objects
      const senses: LexSense[] = JSON.parse(entry.sensesJson || '[]')
      for (const sense of senses) {
        xmlObjects.push(this.senseToXmlObject(sense, entry.guid))
      }
    }

    // Add texts
    for (const text of textsList) {
      xmlObjects.push(this.textToXmlObject(text))
    }

    // Sort for version control stability
    return this.sortObjects(xmlObjects)
  }

  private entryToXmlObject(entry: any): any {
    const obj: any = {
      '@_class': 'LexEntry',
      '@_guid': entry.guid
    }

    if (entry.ownerguid) {
      obj['@_ownerguid'] = entry.ownerguid
    }

    // Lexeme form
    obj.LexemeForm = {
      AUni: {
        '@_ws': 'en', // TODO: get from writing system
        '#text': entry.lexemeForm
      }
    }

    // Citation form
    if (entry.citationForm) {
      obj.CitationForm = {
        AUni: {
          '@_ws': 'en',
          '#text': entry.citationForm
        }
      }
    }

    // Homograph number
    if (entry.homographNumber) {
      obj.HomographNumber = {
        '@_val': entry.homographNumber
      }
    }

    // Etymology
    if (entry.etymology) {
      obj.Etymology = {
        AStr: {
          '@_ws': 'en',
          Run: {
            '@_ws': 'en',
            '#text': entry.etymology
          }
        }
      }
    }

    // Dates
    obj.DateCreated = {
      '@_val': new Date(entry.dateCreated).toISOString()
    }

    obj.DateModified = {
      '@_val': new Date(entry.dateModified).toISOString()
    }

    return obj
  }

  private senseToXmlObject(sense: LexSense, entryGuid: string): any {
    const obj: any = {
      '@_class': 'LexSense',
      '@_guid': sense.guid,
      '@_ownerguid': entryGuid
    }

    // Definition
    if (sense.definition && Object.keys(sense.definition).length > 0) {
      obj.Definition = this.multiStringToXml(sense.definition)
    }

    // Gloss
    if (sense.gloss && Object.keys(sense.gloss).length > 0) {
      obj.Gloss = this.multiStringToXml(sense.gloss)
    }

    // Dates
    obj.DateCreated = {
      '@_val': sense.dateCreated.toISOString()
    }

    obj.DateModified = {
      '@_val': sense.dateModified.toISOString()
    }

    return obj
  }

  private textToXmlObject(text: any): any {
    const title = JSON.parse(text.titleJson || '{"en":"Untitled"}')

    const obj: any = {
      '@_class': 'StText',
      '@_guid': text.guid
    }

    if (text.ownerguid) {
      obj['@_ownerguid'] = text.ownerguid
    }

    obj.Title = this.multiStringToXml(title)

    obj.DateCreated = {
      '@_val': new Date(text.dateCreated).toISOString()
    }

    obj.DateModified = {
      '@_val': new Date(text.dateModified).toISOString()
    }

    return obj
  }

  private multiStringToXml(multiString: Record<string, string>): any {
    const AStr: any[] = []

    for (const [ws, text] of Object.entries(multiString)) {
      if (!text) continue

      AStr.push({
        '@_ws': ws,
        Run: {
          '@_ws': ws,
          '#text': text
        }
      })
    }

    return { AStr }
  }

  private sortObjects(objects: any[]): any[] {
    // Sort by class name, then by GUID for VCS stability
    return objects.sort((a, b) => {
      const classA = a['@_class'] || ''
      const classB = b['@_class'] || ''

      if (classA !== classB) {
        return classA.localeCompare(classB)
      }

      const guidA = a['@_guid'] || ''
      const guidB = b['@_guid'] || ''

      return guidA.localeCompare(guidB)
    })
  }

  private async createBackup(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      if (stats.isFile()) {
        const backupPath = `${filePath}.bak`
        await fs.copyFile(filePath, backupPath)
        console.log(`Backup created: ${backupPath}`)
      }
    } catch (error) {
      // File doesn't exist yet, no backup needed
      console.log('No existing file to backup')
    }
  }
}
