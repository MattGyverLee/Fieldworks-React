# Implementation Guide - Getting Started

This guide provides step-by-step instructions to implement the Fieldworks React/Electron clone based on the architecture defined in ARCHITECTURE.md.

## Table of Contents

1. [Project Initialization](#1-project-initialization)
2. [Database Setup](#2-database-setup)
3. [IPC Communication](#3-ipc-communication)
4. [State Management](#4-state-management)
5. [Core Features](#5-core-features)
6. [FWData Import/Export](#6-fwdata-importexport)
7. [Offline Sync](#7-offline-sync)
8. [Testing](#8-testing)

---

## 1. Project Initialization

### Step 1: Create Project

```bash
# Create electron-vite project with React + TypeScript
npm create electron-vite@latest fieldworks-react -- --template react-ts

cd fieldworks-react
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install \
  zustand \
  jotai \
  better-sqlite3 \
  drizzle-orm \
  dexie \
  dexie-react-hooks \
  fast-xml-parser \
  zod \
  @automerge/automerge \
  @automerge/automerge-repo \
  @automerge/automerge-repo-storage-nodefs \
  isomorphic-git \
  docx \
  pdfkit \
  exceljs \
  antd \
  @tiptap/react \
  @tiptap/starter-kit \
  i18next \
  react-i18next \
  date-fns \
  nanoid

# Development dependencies
npm install -D \
  @types/better-sqlite3 \
  @types/pdfkit \
  @electron/rebuild \
  drizzle-kit \
  @playwright/test \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  electron-typescript-ipc
```

### Step 3: Rebuild Native Modules

```bash
# Rebuild better-sqlite3 for Electron
npx electron-rebuild
```

### Step 4: Update Project Structure

```bash
mkdir -p src/main/{database,ipc,sync}
mkdir -p src/renderer/{app,pages,features,entities,shared}
mkdir -p src/shared/{types,schemas}
mkdir -p test/{unit,e2e}
```

---

## 2. Database Setup

### Step 1: Define Schema with Drizzle

Create `src/main/database/schema.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Entries table
export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  guid: text('guid').notNull().unique(),
  lexeme: text('lexeme').notNull(),
  citationForm: text('citation_form'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  modifiedAt: integer('modified_at', { mode: 'timestamp' }).notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
});

// Senses table
export const senses = sqliteTable('senses', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').notNull().references(() => entries.id),
  gloss: text('gloss'),
  definition: text('definition'),
  partOfSpeech: text('part_of_speech'),
  order: integer('order').notNull(),
});

// Examples table
export const examples = sqliteTable('examples', {
  id: text('id').primaryKey(),
  senseId: text('sense_id').notNull().references(() => senses.id),
  content: text('content').notNull(),
  translation: text('translation'),
  reference: text('reference'),
  order: integer('order').notNull(),
});

// Tags table (for categorization)
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
});

// Entry-Tag junction table
export const entryTags = sqliteTable('entry_tags', {
  entryId: text('entry_id').notNull().references(() => entries.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});

// Relations
export const entriesRelations = relations(entries, ({ many }) => ({
  senses: many(senses),
  tags: many(entryTags),
}));

export const sensesRelations = relations(senses, ({ one, many }) => ({
  entry: one(entries, {
    fields: [senses.entryId],
    references: [entries.id],
  }),
  examples: many(examples),
}));

export const examplesRelations = relations(examples, ({ one }) => ({
  sense: one(senses, {
    fields: [examples.senseId],
    references: [senses.id],
  }),
}));
```

### Step 2: Create Database Connection

Create `src/main/database/connection.ts`:

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

export function getDatabase() {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'fieldworks.db');

  sqlite = new Database(dbPath);

  // Performance optimizations
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = -64000'); // 64MB
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('mmap_size = 30000000000'); // 30GB

  db = drizzle(sqlite, { schema });

  return db;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

// Close database on app quit
app.on('will-quit', () => {
  closeDatabase();
});
```

### Step 3: Create Migrations

Create `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';
import { app } from 'electron';
import path from 'path';

export default {
  schema: './src/main/database/schema.ts',
  out: './migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: path.join(app.getPath('userData'), 'fieldworks.db'),
  },
} satisfies Config;
```

Generate initial migration:

```bash
npx drizzle-kit generate:sqlite
npx drizzle-kit push:sqlite
```

### Step 4: Create Database Service

Create `src/main/database/service.ts`:

```typescript
import { eq, like, and, desc } from 'drizzle-orm';
import { getDatabase } from './connection';
import { entries, senses, examples } from './schema';
import { nanoid } from 'nanoid';

export class DatabaseService {
  private db = getDatabase();

  // ========== ENTRIES ==========

  async createEntry(data: {
    lexeme: string;
    citationForm?: string;
  }) {
    const now = new Date();
    const entry = {
      id: nanoid(),
      guid: crypto.randomUUID(),
      lexeme: data.lexeme,
      citationForm: data.citationForm,
      createdAt: now,
      modifiedAt: now,
    };

    await this.db.insert(entries).values(entry);
    return entry;
  }

  async getEntry(id: string) {
    return await this.db.query.entries.findFirst({
      where: eq(entries.id, id),
      with: {
        senses: {
          with: {
            examples: true,
          },
          orderBy: [senses.order],
        },
      },
    });
  }

  async getAllEntries(options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.db.query.entries.findMany({
      where: options?.search
        ? like(entries.lexeme, `%${options.search}%`)
        : undefined,
      with: {
        senses: {
          with: {
            examples: true,
          },
        },
      },
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
      orderBy: [entries.lexeme],
    });

    return await query;
  }

  async updateEntry(id: string, data: Partial<{
    lexeme: string;
    citationForm: string;
  }>) {
    await this.db
      .update(entries)
      .set({
        ...data,
        modifiedAt: new Date(),
      })
      .where(eq(entries.id, id));
  }

  async deleteEntry(id: string) {
    // Soft delete
    await this.db
      .update(entries)
      .set({
        isDeleted: true,
        modifiedAt: new Date(),
      })
      .where(eq(entries.id, id));
  }

  // ========== SENSES ==========

  async createSense(entryId: string, data: {
    gloss: string;
    definition?: string;
    partOfSpeech?: string;
  }) {
    // Get current max order
    const existingSenses = await this.db.query.senses.findMany({
      where: eq(senses.entryId, entryId),
    });

    const sense = {
      id: nanoid(),
      entryId,
      ...data,
      order: existingSenses.length,
    };

    await this.db.insert(senses).values(sense);
    return sense;
  }

  async updateSense(id: string, data: Partial<{
    gloss: string;
    definition: string;
    partOfSpeech: string;
  }>) {
    await this.db
      .update(senses)
      .set(data)
      .where(eq(senses.id, id));
  }

  async deleteSense(id: string) {
    await this.db
      .delete(senses)
      .where(eq(senses.id, id));
  }

  // ========== EXAMPLES ==========

  async createExample(senseId: string, data: {
    content: string;
    translation?: string;
    reference?: string;
  }) {
    const existingExamples = await this.db.query.examples.findMany({
      where: eq(examples.senseId, senseId),
    });

    const example = {
      id: nanoid(),
      senseId,
      ...data,
      order: existingExamples.length,
    };

    await this.db.insert(examples).values(example);
    return example;
  }

  async updateExample(id: string, data: Partial<{
    content: string;
    translation: string;
    reference: string;
  }>) {
    await this.db
      .update(examples)
      .set(data)
      .where(eq(examples.id, id));
  }

  async deleteExample(id: string) {
    await this.db
      .delete(examples)
      .where(eq(examples.id, id));
  }
}

export const dbService = new DatabaseService();
```

---

## 3. IPC Communication

### Step 1: Define Shared Types

Create `src/shared/types/entry.ts`:

```typescript
export interface Entry {
  id: string;
  guid: string;
  lexeme: string;
  citationForm?: string;
  createdAt: Date;
  modifiedAt: Date;
  senses: Sense[];
}

export interface Sense {
  id: string;
  entryId: string;
  gloss: string;
  definition?: string;
  partOfSpeech?: string;
  order: number;
  examples: Example[];
}

export interface Example {
  id: string;
  senseId: string;
  content: string;
  translation?: string;
  reference?: string;
  order: number;
}

export interface EntryFilter {
  search?: string;
  limit?: number;
  offset?: number;
}
```

### Step 2: Define IPC API

Create `src/shared/ipc-api.ts`:

```typescript
import type { Entry, EntryFilter, Sense, Example } from './types/entry';

export interface IpcAPI {
  // Entry operations
  'entry:create': (data: { lexeme: string; citationForm?: string }) => Promise<Entry>;
  'entry:get': (id: string) => Promise<Entry | null>;
  'entry:getAll': (filter?: EntryFilter) => Promise<Entry[]>;
  'entry:update': (id: string, data: Partial<Entry>) => Promise<void>;
  'entry:delete': (id: string) => Promise<void>;

  // Sense operations
  'sense:create': (entryId: string, data: Omit<Sense, 'id' | 'entryId' | 'order' | 'examples'>) => Promise<Sense>;
  'sense:update': (id: string, data: Partial<Sense>) => Promise<void>;
  'sense:delete': (id: string) => Promise<void>;

  // Example operations
  'example:create': (senseId: string, data: Omit<Example, 'id' | 'senseId' | 'order'>) => Promise<Example>;
  'example:update': (id: string, data: Partial<Example>) => Promise<void>;
  'example:delete': (id: string) => Promise<void>;

  // File operations
  'file:openProject': () => Promise<string | null>;
  'file:saveProject': () => Promise<void>;
  'file:importFWData': (path: string) => Promise<void>;
  'file:exportFWData': (path: string) => Promise<void>;

  // Export operations
  'export:docx': (entries: Entry[]) => Promise<Buffer>;
  'export:pdf': (entries: Entry[]) => Promise<Buffer>;
  'export:excel': (entries: Entry[]) => Promise<Buffer>;
}
```

### Step 3: Setup IPC Handlers (Main Process)

Create `src/main/ipc/handlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { dbService } from '../database/service';
import type { IpcAPI } from '../../shared/ipc-api';

export function setupIpcHandlers() {
  // Entry handlers
  ipcMain.handle('entry:create', async (_, data) => {
    return await dbService.createEntry(data);
  });

  ipcMain.handle('entry:get', async (_, id: string) => {
    return await dbService.getEntry(id);
  });

  ipcMain.handle('entry:getAll', async (_, filter) => {
    return await dbService.getAllEntries(filter);
  });

  ipcMain.handle('entry:update', async (_, id: string, data) => {
    return await dbService.updateEntry(id, data);
  });

  ipcMain.handle('entry:delete', async (_, id: string) => {
    return await dbService.deleteEntry(id);
  });

  // Sense handlers
  ipcMain.handle('sense:create', async (_, entryId: string, data) => {
    return await dbService.createSense(entryId, data);
  });

  ipcMain.handle('sense:update', async (_, id: string, data) => {
    return await dbService.updateSense(id, data);
  });

  ipcMain.handle('sense:delete', async (_, id: string) => {
    return await dbService.deleteSense(id);
  });

  // Example handlers
  ipcMain.handle('example:create', async (_, senseId: string, data) => {
    return await dbService.createExample(senseId, data);
  });

  ipcMain.handle('example:update', async (_, id: string, data) => {
    return await dbService.updateExample(id, data);
  });

  ipcMain.handle('example:delete', async (_, id: string) => {
    return await dbService.deleteExample(id);
  });
}
```

### Step 4: Setup Preload Script

Create `src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcAPI } from '../shared/ipc-api';

// Create type-safe API
const api: IpcAPI = {
  'entry:create': (data) => ipcRenderer.invoke('entry:create', data),
  'entry:get': (id) => ipcRenderer.invoke('entry:get', id),
  'entry:getAll': (filter) => ipcRenderer.invoke('entry:getAll', filter),
  'entry:update': (id, data) => ipcRenderer.invoke('entry:update', id, data),
  'entry:delete': (id) => ipcRenderer.invoke('entry:delete', id),

  'sense:create': (entryId, data) => ipcRenderer.invoke('sense:create', entryId, data),
  'sense:update': (id, data) => ipcRenderer.invoke('sense:update', id, data),
  'sense:delete': (id) => ipcRenderer.invoke('sense:delete', id),

  'example:create': (senseId, data) => ipcRenderer.invoke('example:create', senseId, data),
  'example:update': (id, data) => ipcRenderer.invoke('example:update', id, data),
  'example:delete': (id) => ipcRenderer.invoke('example:delete', id),

  'file:openProject': () => ipcRenderer.invoke('file:openProject'),
  'file:saveProject': () => ipcRenderer.invoke('file:saveProject'),
  'file:importFWData': (path) => ipcRenderer.invoke('file:importFWData', path),
  'file:exportFWData': (path) => ipcRenderer.invoke('file:exportFWData', path),

  'export:docx': (entries) => ipcRenderer.invoke('export:docx', entries),
  'export:pdf': (entries) => ipcRenderer.invoke('export:pdf', entries),
  'export:excel': (entries) => ipcRenderer.invoke('export:excel', entries),
};

contextBridge.exposeInMainWorld('api', api);

// TypeScript declaration
declare global {
  interface Window {
    api: IpcAPI;
  }
}
```

---

## 4. State Management

### Step 1: Create Zustand Stores

Create `src/renderer/shared/stores/projectStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  path: string;
  language: string;
  lastOpened: Date;
}

interface ProjectState {
  currentProject: Project | null;
  recentProjects: Project[];

  setCurrentProject: (project: Project) => void;
  addRecentProject: (project: Project) => void;
  clearRecentProjects: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      recentProjects: [],

      setCurrentProject: (project) => set({ currentProject: project }),

      addRecentProject: (project) =>
        set((state) => ({
          recentProjects: [
            project,
            ...state.recentProjects.filter((p) => p.id !== project.id),
          ].slice(0, 10), // Keep only 10 recent projects
        })),

      clearRecentProjects: () => set({ recentProjects: [] }),
    }),
    {
      name: 'project-storage',
    }
  )
);
```

Create `src/renderer/shared/stores/uiStore.ts`:

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activePane: 'lexicon' | 'texts' | 'grammar' | 'settings';
  theme: 'light' | 'dark' | 'auto';

  toggleSidebar: () => void;
  setActivePane: (pane: UIState['activePane']) => void;
  setTheme: (theme: UIState['theme']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activePane: 'lexicon',
  theme: 'light',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActivePane: (pane) => set({ activePane: pane }),
  setTheme: (theme) => set({ theme }),
}));
```

### Step 2: Create Jotai Atoms

Create `src/renderer/shared/atoms/entryAtoms.ts`:

```typescript
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Entry } from '@/shared/types/entry';

// Base atoms
export const entriesAtom = atom<Entry[]>([]);
export const searchTermAtom = atomWithStorage('search-term', '');
export const selectedEntryIdAtom = atom<string | null>(null);

// Derived atoms
export const filteredEntriesAtom = atom((get) => {
  const entries = get(entriesAtom);
  const search = get(searchTermAtom);

  if (!search) return entries;

  return entries.filter(
    (entry) =>
      entry.lexeme.toLowerCase().includes(search.toLowerCase()) ||
      entry.citationForm?.toLowerCase().includes(search.toLowerCase()) ||
      entry.senses.some((sense) =>
        sense.gloss.toLowerCase().includes(search.toLowerCase())
      )
  );
});

export const selectedEntryAtom = atom((get) => {
  const entries = get(entriesAtom);
  const selectedId = get(selectedEntryIdAtom);
  return entries.find((e) => e.id === selectedId) ?? null;
});

export const entryCountAtom = atom((get) => get(entriesAtom).length);

// Async atoms for data fetching
export const loadEntriesAtom = atom(null, async (get, set) => {
  const entries = await window.api['entry:getAll']();
  set(entriesAtom, entries);
});
```

---

## 5. Core Features

### Step 1: Create Entry List Component

Create `src/renderer/features/lexicon/ui/EntryList.tsx`:

```typescript
import React from 'react';
import { List, Input, Button, Empty } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  filteredEntriesAtom,
  searchTermAtom,
  selectedEntryIdAtom,
} from '@/shared/atoms/entryAtoms';

export function EntryList() {
  const entries = useAtomValue(filteredEntriesAtom);
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const setSelectedId = useSetAtom(selectedEntryIdAtom);

  return (
    <div className="entry-list">
      <div className="entry-list-header">
        <Input
          placeholder="Search entries..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            /* TODO: Open create dialog */
          }}
        >
          New Entry
        </Button>
      </div>

      <List
        dataSource={entries}
        locale={{
          emptyText: (
            <Empty description="No entries found. Create your first entry!" />
          ),
        }}
        renderItem={(entry) => (
          <List.Item
            onClick={() => setSelectedId(entry.id)}
            className="entry-list-item"
          >
            <div>
              <div className="entry-lexeme">{entry.lexeme}</div>
              {entry.citationForm && (
                <div className="entry-citation">{entry.citationForm}</div>
              )}
              <div className="entry-glosses">
                {entry.senses.map((sense, i) => (
                  <span key={sense.id}>
                    {i + 1}. {sense.gloss}
                  </span>
                ))}
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
```

### Step 2: Create Entry Editor Component

Create `src/renderer/features/lexicon/ui/EntryEditor.tsx`:

```typescript
import React from 'react';
import { Form, Input, Button, Card, Space } from 'antd';
import { useAtomValue } from 'jotai';
import { selectedEntryAtom } from '@/shared/atoms/entryAtoms';
import type { Entry } from '@/shared/types/entry';

export function EntryEditor() {
  const entry = useAtomValue(selectedEntryAtom);
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (entry) {
      form.setFieldsValue({
        lexeme: entry.lexeme,
        citationForm: entry.citationForm,
      });
    }
  }, [entry, form]);

  const handleSave = async (values: Partial<Entry>) => {
    if (!entry) return;
    await window.api['entry:update'](entry.id, values);
  };

  if (!entry) {
    return <div className="empty-state">Select an entry to edit</div>;
  }

  return (
    <div className="entry-editor">
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item label="Lexeme" name="lexeme" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>

        <Form.Item label="Citation Form" name="citationForm">
          <Input size="large" />
        </Form.Item>

        <Card title="Senses" className="senses-card">
          {entry.senses.map((sense, index) => (
            <Card.Grid key={sense.id} style={{ width: '100%' }}>
              <div className="sense-header">
                <span className="sense-number">{index + 1}</span>
                <Input
                  defaultValue={sense.gloss}
                  placeholder="Gloss"
                  onBlur={(e) => {
                    window.api['sense:update'](sense.id, {
                      gloss: e.target.value,
                    });
                  }}
                />
              </div>
              <Input.TextArea
                defaultValue={sense.definition}
                placeholder="Definition"
                onBlur={(e) => {
                  window.api['sense:update'](sense.id, {
                    definition: e.target.value,
                  });
                }}
              />
            </Card.Grid>
          ))}

          <Button
            type="dashed"
            block
            onClick={() => {
              window.api['sense:create'](entry.id, { gloss: '' });
            }}
          >
            Add Sense
          </Button>
        </Card>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
            <Button>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
```

---

## 6. FWData Import/Export

### Step 1: Create Import Service

Create `src/main/services/fwdata-import.ts`:

```typescript
import { XMLParser } from 'fast-xml-parser';
import { promises as fs } from 'fs';
import { dbService } from '../database/service';

interface FWDataEntry {
  '@_guid': string;
  LexemeForm?: {
    AUni: string;
  };
  CitationForm?: {
    AUni: string;
  };
  Senses?: {
    rt: Array<{
      '@_guid': string;
      Gloss?: {
        AUni: string;
      };
      Definition?: {
        AStr: {
          Run: string;
        };
      };
    }>;
  };
}

export class FWDataImporter {
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: 'text',
  });

  async importFile(filePath: string): Promise<void> {
    console.log(`Importing FWData from ${filePath}...`);

    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const parsed = this.parser.parse(xmlContent);

    const entries = this.extractEntries(parsed);

    console.log(`Found ${entries.length} entries`);

    // Import in batches
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await this.importBatch(batch);
      console.log(`Imported ${Math.min(i + batchSize, entries.length)}/${entries.length}`);
    }

    console.log('Import complete!');
  }

  private extractEntries(parsed: any): FWDataEntry[] {
    // Navigate to entries in FWData structure
    const languageProject = parsed.languageproject || parsed.LanguageProject;
    const lexDb = languageProject?.LexDb;
    const entries = lexDb?.Entries?.rt;

    if (!entries) {
      throw new Error('No entries found in FWData file');
    }

    return Array.isArray(entries) ? entries : [entries];
  }

  private async importBatch(entries: FWDataEntry[]): Promise<void> {
    for (const fwEntry of entries) {
      try {
        // Create entry
        const entry = await dbService.createEntry({
          lexeme: fwEntry.LexemeForm?.AUni || '',
          citationForm: fwEntry.CitationForm?.AUni,
        });

        // Import senses
        const fwSenses = fwEntry.Senses?.rt;
        if (fwSenses) {
          const sensesArray = Array.isArray(fwSenses) ? fwSenses : [fwSenses];

          for (const fwSense of sensesArray) {
            await dbService.createSense(entry.id, {
              gloss: fwSense.Gloss?.AUni || '',
              definition: fwSense.Definition?.AStr?.Run,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to import entry ${fwEntry['@_guid']}:`, error);
      }
    }
  }
}

export const fwdataImporter = new FWDataImporter();
```

### Step 2: Create Export Service

Create `src/main/services/fwdata-export.ts`:

```typescript
import { XMLBuilder } from 'fast-xml-parser';
import { promises as fs } from 'fs';
import { dbService } from '../database/service';

export class FWDataExporter {
  private builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  async exportFile(filePath: string): Promise<void> {
    console.log(`Exporting to ${filePath}...`);

    const entries = await dbService.getAllEntries();
    const fwData = this.buildFWDataStructure(entries);
    const xml = this.builder.build(fwData);

    await fs.writeFile(filePath, xml, 'utf-8');
    console.log(`Export complete!`);
  }

  private buildFWDataStructure(entries: any[]) {
    return {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8',
      },
      languageproject: {
        '@_version': '7000068',
        LexDb: {
          Entries: {
            rt: entries.map((entry) => ({
              '@_guid': entry.guid,
              '@_class': 'LexEntry',
              LexemeForm: {
                AUni: entry.lexeme,
              },
              CitationForm: entry.citationForm
                ? {
                    AUni: entry.citationForm,
                  }
                : undefined,
              Senses: entry.senses.length
                ? {
                    rt: entry.senses.map((sense) => ({
                      '@_guid': crypto.randomUUID(),
                      '@_class': 'LexSense',
                      Gloss: {
                        AUni: sense.gloss,
                      },
                      Definition: sense.definition
                        ? {
                            AStr: {
                              Run: sense.definition,
                            },
                          }
                        : undefined,
                    })),
                  }
                : undefined,
            })),
          },
        },
      },
    };
  }
}

export const fwdataExporter = new FWDataExporter();
```

---

## 7. Offline Sync

### Step 1: Setup Automerge

Create `src/main/sync/automerge-setup.ts`:

```typescript
import { Repo } from '@automerge/automerge-repo';
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { app } from 'electron';
import path from 'path';

export interface LexiconDoc {
  entries: {
    [id: string]: {
      lexeme: string;
      citationForm?: string;
      senses: Array<{
        id: string;
        gloss: string;
        definition?: string;
      }>;
      modifiedAt: number;
    };
  };
  metadata: {
    projectName: string;
    language: string;
    version: number;
  };
}

let repo: Repo | null = null;

export function getAutomergeRepo(): Repo {
  if (repo) return repo;

  const storagePath = path.join(app.getPath('userData'), 'automerge');

  repo = new Repo({
    storage: new NodeFSStorageAdapter(storagePath),
    network: [new BroadcastChannelNetworkAdapter()],
  });

  return repo;
}
```

### Step 2: Create Sync Service

Create `src/main/sync/sync-service.ts`:

```typescript
import { getAutomergeRepo, type LexiconDoc } from './automerge-setup';
import { dbService } from '../database/service';
import type { DocumentId } from '@automerge/automerge-repo';

export class SyncService {
  private repo = getAutomergeRepo();

  async createDocument(projectName: string, language: string): Promise<DocumentId> {
    const handle = this.repo.create<LexiconDoc>();

    handle.change((doc) => {
      doc.entries = {};
      doc.metadata = {
        projectName,
        language,
        version: 1,
      };
    });

    await handle.whenReady();
    return handle.documentId;
  }

  async syncFromDatabase(documentId: DocumentId): Promise<void> {
    const handle = this.repo.find<LexiconDoc>(documentId);
    await handle.whenReady();

    const entries = await dbService.getAllEntries();

    handle.change((doc) => {
      for (const entry of entries) {
        doc.entries[entry.id] = {
          lexeme: entry.lexeme,
          citationForm: entry.citationForm,
          senses: entry.senses.map((sense) => ({
            id: sense.id,
            gloss: sense.gloss,
            definition: sense.definition,
          })),
          modifiedAt: entry.modifiedAt.getTime(),
        };
      }
    });
  }

  async syncToDatabase(documentId: DocumentId): Promise<void> {
    const handle = this.repo.find<LexiconDoc>(documentId);
    const doc = await handle.doc();

    if (!doc) throw new Error('Document not found');

    // Import entries from Automerge doc to SQLite
    for (const [id, entry] of Object.entries(doc.entries)) {
      const existing = await dbService.getEntry(id);

      if (!existing) {
        // Create new entry
        await dbService.createEntry({
          lexeme: entry.lexeme,
          citationForm: entry.citationForm,
        });
      } else if (existing.modifiedAt.getTime() < entry.modifiedAt) {
        // Update if remote is newer
        await dbService.updateEntry(id, {
          lexeme: entry.lexeme,
          citationForm: entry.citationForm,
        });
      }
    }
  }
}

export const syncService = new SyncService();
```

---

## 8. Testing

### Step 1: Setup Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
  },
});
```

### Step 2: Write Unit Tests

Create `test/unit/database-service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseService } from '../../src/main/database/service';

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
  });

  it('should create an entry', async () => {
    const entry = await dbService.createEntry({
      lexeme: 'test',
      citationForm: 'test-citation',
    });

    expect(entry).toHaveProperty('id');
    expect(entry.lexeme).toBe('test');
    expect(entry.citationForm).toBe('test-citation');
  });

  it('should retrieve an entry by id', async () => {
    const created = await dbService.createEntry({ lexeme: 'test' });
    const retrieved = await dbService.getEntry(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('should update an entry', async () => {
    const entry = await dbService.createEntry({ lexeme: 'original' });

    await dbService.updateEntry(entry.id, { lexeme: 'updated' });

    const updated = await dbService.getEntry(entry.id);
    expect(updated?.lexeme).toBe('updated');
  });
});
```

### Step 3: Setup Playwright for E2E

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

### Step 4: Write E2E Tests

Create `test/e2e/lexicon.spec.ts`:

```typescript
import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({ args: ['.'] });
  window = await electronApp.firstWindow();
});

test.afterAll(async () => {
  await electronApp.close();
});

test('can create a new entry', async () => {
  // Click "New Entry" button
  await window.click('button:has-text("New Entry")');

  // Fill in the form
  await window.fill('input[name="lexeme"]', 'test');
  await window.fill('input[name="citationForm"]', 'test-citation');

  // Save
  await window.click('button:has-text("Save")');

  // Verify entry appears in list
  await expect(window.locator('text=test')).toBeVisible();
});

test('can search entries', async () => {
  // Enter search term
  await window.fill('input[placeholder="Search entries..."]', 'test');

  // Verify filtered results
  const results = window.locator('.entry-list-item');
  await expect(results).toHaveCount(1);
});
```

---

## Next Steps

1. **Run the application:**
   ```bash
   npm run dev
   ```

2. **Build for production:**
   ```bash
   npm run build
   npm run build:win   # Windows
   npm run build:mac   # macOS
   npm run build:linux # Linux
   ```

3. **Run tests:**
   ```bash
   npm test              # Unit tests
   npm run test:e2e      # E2E tests
   ```

4. **Implement additional features:**
   - Text corpus management
   - Interlinear glossing
   - Advanced search
   - Reversal indexes
   - Publishing tools

---

*For more details, see ARCHITECTURE.md and TECH_STACK.md*
