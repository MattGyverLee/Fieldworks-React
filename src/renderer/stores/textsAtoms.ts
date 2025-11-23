import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

export interface Text {
  guid: string
  class: 'Text'
  title: Record<string, string>
  genre?: string
  source?: string
  description?: string
  abbreviation?: string
  dateCreated: Date
  dateModified: Date
  paragraphs?: Paragraph[]
}

export interface Paragraph {
  guid: string
  class: 'StTxtPara'
  textGuid: string
  contents: Record<string, string>
  segments?: Segment[]
  parseIsCurrent: boolean
  orderIndex: number
  dateCreated: Date
  dateModified: Date
}

export interface Segment {
  guid: string
  baselineText: Record<string, string>
  freeTranslation?: Record<string, string>
  literalTranslation?: Record<string, string>
  analyses?: WordAnalysis[]
}

export interface WordAnalysis {
  wordform: string
  gloss?: string
  morphemes?: Morpheme[]
  category?: string
}

export interface Morpheme {
  form: string
  gloss: string
  category?: string
}

// Map of all texts (guid -> text)
export const textsAtom = atom<Map<string, Text>>(new Map())

// Loading state
export const isLoadingTextsAtom = atom(false)

// Current text being edited
export const currentTextGuidAtom = atom<string | null>(null)

// Current paragraph being edited
export const currentParagraphGuidAtom = atom<string | null>(null)

// Filtered texts
export const filteredTextsAtom = atom((get) => {
  const texts = get(textsAtom)
  return Array.from(texts.values())
})

// Sorted texts
export const sortedTextsAtom = atom((get) => {
  const texts = get(filteredTextsAtom)

  return texts.sort((a, b) => {
    const aTitle = Object.values(a.title)[0] || ''
    const bTitle = Object.values(b.title)[0] || ''
    return aTitle.localeCompare(bTitle)
  })
})

// Text atom family for individual text state
export const textAtomFamily = atomFamily((guid: string) =>
  atom(
    (get) => get(textsAtom).get(guid),
    (get, set, update: Text) => {
      const texts = new Map(get(textsAtom))
      texts.set(guid, update)
      set(textsAtom, texts)
    }
  )
)

// Load all texts action
export const loadTextsAtom = atom(
  null,
  async (_get, set) => {
    set(isLoadingTextsAtom, true)
    try {
      const loadedTexts = await window.api.texts.getAll(1000, 0)

      const textsMap = new Map<string, Text>()
      loadedTexts.forEach((text: any) => {
        textsMap.set(text.guid, text)
      })

      set(textsAtom, textsMap)
    } catch (error) {
      console.error('Error loading texts:', error)
    } finally {
      set(isLoadingTextsAtom, false)
    }
  }
)

// Load single text with paragraphs
export const loadTextByIdAtom = atom(
  null,
  async (_get, set, guid: string) => {
    try {
      const text = await window.api.texts.getById(guid)

      const texts = new Map(_get(textsAtom))
      texts.set(guid, text)
      set(textsAtom, texts)

      return text
    } catch (error) {
      console.error('Error loading text:', error)
      throw error
    }
  }
)

// Create new text
export const createTextAtom = atom(
  null,
  async (get, set, input: { title: Record<string, string>; genre?: string }) => {
    try {
      const newText = await window.api.texts.create(input)

      const texts = new Map(get(textsAtom))
      texts.set(newText.guid, newText)
      set(textsAtom, texts)

      return newText
    } catch (error) {
      console.error('Error creating text:', error)
      throw error
    }
  }
)

// Delete text
export const deleteTextAtom = atom(
  null,
  async (get, set, guid: string) => {
    try {
      await window.api.texts.delete(guid)

      const texts = new Map(get(textsAtom))
      texts.delete(guid)
      set(textsAtom, texts)

      if (get(currentTextGuidAtom) === guid) {
        set(currentTextGuidAtom, null)
      }
    } catch (error) {
      console.error('Error deleting text:', error)
      throw error
    }
  }
)
