import { contextBridge, ipcRenderer } from 'electron'
import type {
  LexEntry,
  CreateEntryInput,
  UpdateEntryInput,
  SearchQuery,
  SearchResult,
  BulkEditInput
} from '@shared/types'

// Custom APIs for renderer
const api = {
  // Project Operations
  project: {
    open: (filePath: string) => ipcRenderer.invoke('project:open', filePath),
    save: (filePath: string, projectGuid: string) => ipcRenderer.invoke('project:save', filePath, projectGuid)
  },

  // Dialog Operations
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath)
  },

  // Lexicon Operations
  lexicon: {
    getEntries: (limit?: number, offset?: number): Promise<LexEntry[]> =>
      ipcRenderer.invoke('lexicon:getEntries', limit, offset),

    getEntry: (guid: string): Promise<LexEntry | null> =>
      ipcRenderer.invoke('lexicon:getEntry', guid),

    createEntry: (input: CreateEntryInput): Promise<LexEntry> =>
      ipcRenderer.invoke('lexicon:createEntry', input),

    updateEntry: (input: UpdateEntryInput): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('lexicon:updateEntry', input),

    deleteEntry: (guid: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('lexicon:deleteEntry', guid),

    bulkEdit: (input: BulkEditInput): Promise<{ success: boolean; affectedCount: number }> =>
      ipcRenderer.invoke('lexicon:bulkEdit', input),

    getCount: (): Promise<number> =>
      ipcRenderer.invoke('lexicon:getCount')
  },

  // Search Operations
  search: {
    entries: (query: SearchQuery): Promise<SearchResult[]> =>
      ipcRenderer.invoke('search:entries', query)
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', api)

// TypeScript declaration for window.api
declare global {
  interface Window {
    api: typeof api
  }
}
