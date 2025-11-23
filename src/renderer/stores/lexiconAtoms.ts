import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import type { LexEntry, SearchResult } from '@shared/types'

// Map of all entries (guid -> entry)
export const entriesAtom = atom<Map<string, LexEntry>>(new Map())

// Loading state
export const isLoadingEntriesAtom = atom(false)

// Search state
export const searchQueryAtom = atom('')
export const searchResultsAtom = atom<SearchResult[]>([])

// Filter state
export const filterTextAtom = atom('')

// Selected entries (for bulk edit)
export const selectedEntriesAtom = atom<Set<string>>(new Set<string>())

// Current entry being edited
export const currentEntryGuidAtom = atom<string | null>(null)

// Derived atom: filtered and sorted entries
export const filteredEntriesAtom = atom((get) => {
  const entries = get(entriesAtom)
  const filterText = get(filterTextAtom)
  const searchResults = get(searchResultsAtom)

  // If searching, use search results
  if (searchResults.length > 0) {
    return Array.from(entries.values()).filter((entry) =>
      searchResults.some((r) => r.guid === entry.guid)
    )
  }

  // Otherwise, apply text filter
  if (!filterText) {
    return Array.from(entries.values())
  }

  const filter = filterText.toLowerCase()
  return Array.from(entries.values()).filter(
    (entry) =>
      entry.lexemeForm.toLowerCase().includes(filter) ||
      entry.citationForm?.toLowerCase().includes(filter) ||
      entry.senses.some((sense) =>
        Object.values(sense.definition).some((def) =>
          typeof def === 'string' && def.toLowerCase().includes(filter)
        )
      )
  )
})

// Derived atom: sorted entries
export const sortedEntriesAtom = atom((get) => {
  const entries = get(filteredEntriesAtom)

  return entries.sort((a, b) => {
    // Sort by lexeme form
    const aForm = a.lexemeForm.toLowerCase()
    const bForm = b.lexemeForm.toLowerCase()

    if (aForm < bForm) return -1
    if (aForm > bForm) return 1

    // If same lexeme, sort by homograph number
    const aNum = a.homographNumber || 0
    const bNum = b.homographNumber || 0

    return aNum - bNum
  })
})

// Atom family for individual entries (for granular updates)
export const entryAtomFamily = atomFamily((guid: string) =>
  atom(
    (get) => get(entriesAtom).get(guid),
    (get, set, update: LexEntry | ((prev: LexEntry | undefined) => LexEntry | undefined)) => {
      const entries = new Map(get(entriesAtom))
      const currentEntry = entries.get(guid)

      const newEntry = typeof update === 'function' ? update(currentEntry) : update

      if (newEntry) {
        entries.set(guid, newEntry)
      } else {
        entries.delete(guid)
      }

      set(entriesAtom, entries)
    }
  )
)

// Entry count atom
export const entryCountAtom = atom((get) => {
  return get(entriesAtom).size
})

// Selection helpers
export const selectEntryAtom = atom(
  null,
  (get, set, guid: string) => {
    const selected = new Set(get(selectedEntriesAtom))
    selected.add(guid)
    set(selectedEntriesAtom, selected)
  }
)

export const deselectEntryAtom = atom(
  null,
  (get, set, guid: string) => {
    const selected = new Set(get(selectedEntriesAtom))
    selected.delete(guid)
    set(selectedEntriesAtom, selected)
  }
)

export const toggleSelectEntryAtom = atom(
  null,
  (get, set, guid: string) => {
    const selected = new Set(get(selectedEntriesAtom))
    if (selected.has(guid)) {
      selected.delete(guid)
    } else {
      selected.add(guid)
    }
    set(selectedEntriesAtom, selected)
  }
)

export const clearSelectionAtom = atom(
  null,
  (_get, set) => {
    set(selectedEntriesAtom, new Set<string>())
  }
)
