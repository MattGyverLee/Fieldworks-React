# Fieldworks React Clone - Comprehensive Technical Specification

**Version:** 1.0
**Date:** 2025-01-23
**Project:** Cross-platform feature-complete React clone of SIL FieldWorks
**Target Platforms:** Windows, macOS, Linux (via Electron)

---

## Executive Summary

This specification outlines a complete rewrite of SIL FieldWorks Language Explorer (FLEx) as a modern, cross-platform application using **React**, **Electron**, and **TypeScript**. The application will maintain full compatibility with existing FWData files, support all core linguistic workflows, and integrate with Lexbox for cloud synchronization.

**Key Objectives:**
- ✅ **Cross-Platform:** No Windows-specific or Mono dependencies
- ✅ **FWData Compatible:** Read, edit, and write existing `.fwdata` files
- ✅ **Full Editing:** Complete lexicon, text, and grammar editing capabilities
- ✅ **Export Support:** LIFT, DOCX, PDF, Excel, and other formats
- ✅ **Lexbox Sync:** Send/Receive integration with conflict resolution
- ✅ **Modern Architecture:** TypeScript, React 18, well-supported dependencies
- ✅ **Offline-First:** Full functionality without internet connection
- ✅ **Performance:** Handle 50,000+ lexical entries efficiently

---

## Table of Contents

1. [Current FieldWorks Overview](#1-current-fieldworks-overview)
2. [Technology Stack & Rationale](#2-technology-stack--rationale)
3. [System Architecture](#3-system-architecture)
4. [Data Model & FWData Handling](#4-data-model--fwdata-handling)
5. [Core Features Implementation](#5-core-features-implementation)
6. [Sync & Collaboration (Lexbox)](#6-sync--collaboration-lexbox)
7. [Export & Publishing](#7-export--publishing)
8. [Performance & Optimization](#8-performance--optimization)
9. [Security & Data Integrity](#9-security--data-integrity)
10. [Development Phases](#10-development-phases)
11. [Risk Assessment & Mitigation](#11-risk-assessment--mitigation)
12. [Success Metrics](#12-success-metrics)

---

## 1. Current FieldWorks Overview

### 1.1 What is FieldWorks?

**FieldWorks Language Explorer (FLEx)** is the world's leading linguistic analysis software for minority and endangered languages, developed by SIL International. It serves **1,633+ active language projects** across **98 countries**, supporting lexicography, text analysis, morphological parsing, and dictionary publication.

**Primary Users:**
- Field linguists documenting endangered languages
- Missionary linguists (Bible translation)
- Lexicographers creating dictionaries
- Language communities preserving cultural heritage

### 1.2 Core Feature Set

**Lexicon Management:**
- Multi-sense lexical entries with complex forms
- Semantic domain organization (1,792 domains)
- Bulk editing operations (replace, copy, delete)
- Reversal indexes for multiple languages
- Etymology and pronunciation tracking

**Text & Interlinear Analysis:**
- Baseline text entry with metadata
- Word-by-word morphological glossing
- Parser integration (XAmple, Hermit Crab)
- Text concordance and word lists
- Discourse analysis (text charts)

**Grammar & Phonology:**
- Part-of-speech and category management
- Morphological parser configuration
- Phonological rules and features
- Grammar sketch composition

**Collaboration:**
- FLExBridge Send/Receive (via Chorus)
- 3-way XML merging with conflict resolution
- Offline collaboration via USB drives
- Distributed version control (Mercurial)

**Publishing:**
- Dictionary formatting (WYSIWYG)
- LIFT export/import
- DOCX, PDF, HTML export
- Mobile app generation (Dictionary App Builder)
- Webonary (online dictionary hosting)

### 1.3 Current Technology Stack

**Framework:** C# (.NET Framework 4.6.1), Windows Forms
**Data:** XML-based `.fwdata` files (liblcm schema)
**Database (legacy):** SQL Server (pre-v7.0)
**VCS:** Mercurial (via Chorus library)
**Rendering:** Graphite (complex scripts), ICU4C (Unicode)
**Parsing:** C++ (XAmple), C# (Hermit Crab)
**Platforms:** Windows (primary), Linux (via Mono, limited support)

**Critical Dependencies to Replace:**
- Windows Forms → React
- .NET Framework/Mono → Node.js/Electron
- System.Xml → fast-xml-parser
- ICU4C → JavaScript Intl API + icu4c bindings
- Graphite → HarfBuzz.js or browser rendering
- Hunspell → Nspell (JavaScript)
- Keyman Desktop → Keyman Web

---

## 2. Technology Stack & Rationale

### 2.1 Core Framework

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Desktop Runtime** | Electron 28+ | Cross-platform by design, mature ecosystem, native file access, auto-update |
| **UI Framework** | React 18 | Component model, massive ecosystem, proven for complex UIs |
| **Language** | TypeScript 5 | Type safety, excellent tooling, refactoring support |
| **Build Tool** | electron-vite | 10x faster than webpack, optimized for Electron, Vite ecosystem |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution |

**Why Electron over Tauri?**
- Mature ecosystem (since 2013 vs 2020)
- Better documentation and community support
- More UI framework options (React proven at scale)
- Easier debugging (Chromium DevTools)
- Native module support (better-sqlite3, etc.)

### 2.2 State Management

| Solution | Use Case | Bundle Size |
|----------|----------|-------------|
| **Zustand** | Global app state, settings, user session | 1.2 KB |
| **Jotai** | Fine-grained lexicon data, atomic updates | 1.2 KB |
| **TanStack Query** | Server state, Lexbox API caching | 13 KB |

**Why NOT Redux?**
- Zustand achieves 80% of Redux functionality with 20% of the code
- No boilerplate (actions, reducers, combineReducers)
- DevTools support via middleware
- TypeScript inference works better

**State Architecture:**
```typescript
// Zustand for global state
interface AppStore {
  currentProject: Project | null;
  user: User | null;
  settings: Settings;
}

// Jotai for lexicon entries (atomic updates, minimal re-renders)
const entriesAtom = atom<Map<string, LexEntry>>(new Map());
const filteredEntriesAtom = atom((get) => {
  const entries = get(entriesAtom);
  const filter = get(filterAtom);
  return applyFilter(entries, filter);
});
```

### 2.3 Data Layer

| Component | Choice | Performance Metric | Rationale |
|-----------|--------|-------------------|-----------|
| **Database** | better-sqlite3 | 10-100x faster than node-sqlite3 | Synchronous API, better performance, native bindings |
| **ORM** | Drizzle ORM | Type-safe, minimal overhead | TypeScript-first, no decorators, tree-shakeable |
| **XML Parser** | fast-xml-parser | 87K req/sec | 13% faster than xmldom, bidirectional (parse + build) |
| **Validation** | Zod | TypeScript inference | Runtime validation with compile-time types |
| **IndexedDB (renderer)** | Dexie.js | Observable queries | Reactive queries, TypeScript support, promise-based |

**Database Schema Strategy:**
```sql
-- Core entities optimized for queries
CREATE TABLE lexical_entries (
  guid TEXT PRIMARY KEY,
  lexeme_form TEXT NOT NULL,
  citation_form TEXT,
  homograph_number INTEGER,
  date_created INTEGER,
  date_modified INTEGER,
  owner_guid TEXT,
  is_dirty BOOLEAN DEFAULT 0
);

-- Denormalized for performance
CREATE INDEX idx_lexeme ON lexical_entries(lexeme_form);
CREATE INDEX idx_modified ON lexical_entries(date_modified);
CREATE VIRTUAL TABLE entries_fts USING fts5(lexeme_form, citation_form);
```

### 2.4 Offline-First & Sync

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **CRDT** | Automerge 2.0 | Conflict-free merging, JSON-like API, fast binary format |
| **Git (optional)** | isomorphic-git | Pure JS Git implementation, browser + Node.js |
| **Offline Queue** | Custom (Zustand + IndexedDB) | Simple, tailored to our needs |

**Why Automerge?**
- Automatic conflict resolution (no manual 3-way merge UI for most cases)
- Efficient storage (columnar binary format)
- Network-agnostic (works with any sync transport)
- Proven in production (Inkandswitch, Pushpin, etc.)

**Sync Architecture:**
```
Local SQLite (source of truth)
    ↓
Automerge Document (CRDT operations)
    ↓
Sync Protocol (to Lexbox or peer devices)
    ↓
Lexbox Mercurial Repo (server storage)
```

### 2.5 UI Components

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Component Library** | Ant Design 5 | Enterprise-ready, data-heavy UIs, 60+ components, i18n |
| **Rich Text Editor** | Tiptap (ProseMirror) | Battle-tested, CJK support, extensible, interlinear custom nodes |
| **Virtualization** | TanStack Virtual | 10K+ rows, minimal re-renders |
| **Forms** | React Hook Form + Zod | Uncontrolled inputs (performance), schema validation |
| **Drag & Drop** | dnd-kit | Modern, accessible, touch support |

**Why Ant Design?**
- Designed for data-intensive applications
- Tree components (semantic domains, grammar categories)
- Table with filtering, sorting (entry lists)
- Excellent TypeScript support
- Built-in dark mode

### 2.6 Internationalization

| Component | Choice | Features |
|-----------|--------|----------|
| **i18n** | react-i18next | Lazy loading, pluralization, variable substitution |
| **Keyboard Input** | Keyman Web | 2,000+ keyboards, complex scripts |
| **Text Rendering** | Browser native + @unicode/unicode-15.0.0 | Unicode 15, BiDi, complex scripts |

### 2.7 Export & Publishing

| Format | Library | Rationale |
|--------|---------|-----------|
| **DOCX** | docx | Native format creation, styles, tables |
| **PDF** | pdfkit | Unicode fonts, complex layouts, streaming |
| **Excel** | exceljs | Streaming, large datasets, formulas |
| **HTML** | React-based templates | Full control, Tailwind CSS |
| **LIFT XML** | fast-xml-parser | Standard interchange format |

### 2.8 Testing

| Type | Framework | Coverage Target |
|------|-----------|----------------|
| **Unit Tests** | Vitest | 80%+ |
| **E2E Tests** | Playwright | Critical paths |
| **Component Tests** | Vitest + @testing-library/react | 70%+ |
| **Type Checking** | TypeScript strict mode | 100% |

**Why Playwright over Spectron?**
- Spectron deprecated
- Official Electron support in Playwright
- Cross-browser testing (if we add web version)
- Better debugging

---

## 3. System Architecture

### 3.1 Process Model (Electron Multi-Process)

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                │
│  ───────────────────────────────────────────────────────│
│  • Application lifecycle                                 │
│  • Window management                                     │
│  • Native menu/dialog APIs                               │
│  • File system operations                                │
│  • SQLite database (better-sqlite3)                      │
│  • FWData XML import/export                              │
│  • Automerge sync engine                                 │
│  • Background tasks (parsing, export)                    │
└──────────────────┬──────────────────────────────────────┘
                   │ IPC (contextBridge)
                   │ Type-safe with Zod validation
┌──────────────────▼──────────────────────────────────────┐
│              Renderer Process (Chromium)                 │
│  ───────────────────────────────────────────────────────│
│  • React application                                     │
│  • UI components (Ant Design)                            │
│  • State management (Zustand, Jotai)                     │
│  • Dexie.js (IndexedDB cache)                            │
│  • Keyman Web (keyboard input)                           │
│  • Rich text editors (Tiptap)                            │
│  • NO direct Node.js access (security)                   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
fieldworks-react/
├── src/
│   ├── main/                      # Main process (Node.js)
│   │   ├── index.ts               # Entry point
│   │   ├── database/
│   │   │   ├── schema.ts          # Drizzle schema
│   │   │   ├── migrations/        # SQL migrations
│   │   │   └── queries.ts         # Prepared statements
│   │   ├── fwdata/
│   │   │   ├── reader.ts          # XML → SQLite
│   │   │   ├── writer.ts          # SQLite → XML
│   │   │   ├── validator.ts       # Data integrity
│   │   │   └── fixer.ts           # Auto-repair
│   │   ├── sync/
│   │   │   ├── automerge.ts       # CRDT engine
│   │   │   ├── lexbox-client.ts   # API integration
│   │   │   └── offline-queue.ts   # Change tracking
│   │   ├── export/
│   │   │   ├── docx.ts
│   │   │   ├── pdf.ts
│   │   │   ├── excel.ts
│   │   │   └── lift.ts
│   │   ├── ipc/                   # Type-safe IPC handlers
│   │   │   ├── project.ts
│   │   │   ├── lexicon.ts
│   │   │   ├── text.ts
│   │   │   └── sync.ts
│   │   └── parsers/               # Future: WASM parsers
│   │       ├── xample.wasm
│   │       └── hermit-crab.wasm
│   │
│   ├── renderer/                  # Renderer process (React)
│   │   ├── main.tsx               # Entry point
│   │   ├── App.tsx
│   │   ├── features/              # Feature-Sliced Design
│   │   │   ├── lexicon/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── store.ts       # Jotai atoms
│   │   │   │   └── types.ts
│   │   │   ├── texts/
│   │   │   ├── grammar/
│   │   │   ├── notebook/
│   │   │   └── sync/
│   │   ├── shared/
│   │   │   ├── components/        # Reusable UI
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── stores/                # Global state
│   │   │   ├── app.ts             # Zustand store
│   │   │   ├── settings.ts
│   │   │   └── user.ts
│   │   └── styles/
│   │       └── global.css
│   │
│   └── preload/                   # Preload scripts
│       ├── index.ts               # contextBridge API
│       └── types.ts               # Window interface
│
├── resources/                     # Static assets
│   ├── icons/
│   ├── fonts/
│   └── keyboards/                 # Keyman keyboard files
│
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

### 3.3 Data Flow Architecture

```
User Action (Renderer)
    ↓
React Component Event Handler
    ↓
Jotai Atom Update (optimistic UI)
    ↓
IPC Call to Main Process (Zod-validated)
    ↓
Main Process Handler
    ↓
SQLite Transaction (Drizzle ORM)
    ↓
Automerge Document Update (CRDT operation recorded)
    ↓
IPC Response to Renderer
    ↓
Dexie.js Cache Update (if needed)
    ↓
React Re-render (optimized with Jotai)
```

### 3.4 Security Architecture

**Context Isolation:**
```typescript
// main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    nodeIntegration: false,          // ✅ Security
    contextIsolation: true,           // ✅ Security
    sandbox: true,                    // ✅ Security
    webSecurity: true,                // ✅ Security
  }
});
```

**IPC Validation:**
```typescript
// preload/index.ts
import { z } from 'zod';

const CreateEntrySchema = z.object({
  lexemeForm: z.string().min(1),
  writingSystem: z.string(),
  senses: z.array(SenseSchema).optional(),
});

const api = {
  createEntry: (data: unknown) => {
    const validated = CreateEntrySchema.parse(data); // Runtime validation
    return ipcRenderer.invoke('lexicon:create-entry', validated);
  },
};

contextBridge.exposeInMainWorld('api', api);
```

**Content Security Policy:**
```typescript
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self' data:; "
      ]
    }
  });
});
```

---

## 4. Data Model & FWData Handling

### 4.1 FWData File Format

**Structure:**
- **Format:** Flat XML with `<rt>` (runtime object) elements
- **Root:** `<languageproject version="7000072">`
- **Identification:** GUID-based (all objects have unique GUID)
- **Relationships:** `ownerguid` attribute for parent-child
- **Writing Systems:** Multi-language properties (MultiString, MultiUnicode)

**Example:**
```xml
<languageproject version="7000072">
  <AdditionalFields>
    <!-- Custom field metadata -->
  </AdditionalFields>

  <rt class="LexEntry" guid="79862085-7768-45e2-b5b5-5d11760a0487" ownerguid="...">
    <LexemeForm>
      <objsur guid="..." t="o" />
    </LexemeForm>
    <Senses>
      <objsur guid="..." t="o" />
    </Senses>
    <DateCreated val="2024-01-15 10:30:00.000" />
    <DateModified val="2024-01-20 14:15:00.000" />
  </rt>

  <rt class="LexSense" guid="..." ownerguid="79862085-7768-45e2-b5b5-5d11760a0487">
    <Definition>
      <AStr ws="en"><Run ws="en">to move quickly on foot</Run></AStr>
      <AStr ws="es"><Run ws="es">moverse rápidamente a pie</Run></AStr>
    </Definition>
    <Gloss>
      <AUni ws="en">run</AUni>
    </Gloss>
  </rt>
</languageproject>
```

### 4.2 Data Model (TypeScript)

**Base Types:**
```typescript
// src/shared/types/lcm.ts
import { z } from 'zod';

export const GuidSchema = z.string().uuid();

export const MultiStringSchema = z.record(
  z.string(), // writing system ID
  z.string()  // text content
);

export const CmObjectSchema = z.object({
  guid: GuidSchema,
  class: z.string(),
  ownerguid: GuidSchema.optional(),
  dateCreated: z.date(),
  dateModified: z.date(),
});

export const LexEntrySchema = CmObjectSchema.extend({
  class: z.literal('LexEntry'),
  lexemeForm: z.string(),
  citationForm: z.string().optional(),
  homographNumber: z.number().optional(),
  senses: z.array(z.lazy(() => LexSenseSchema)),
  etymology: z.string().optional(),
  pronunciations: z.array(z.string()).optional(),
});

export const LexSenseSchema = CmObjectSchema.extend({
  class: z.literal('LexSense'),
  definition: MultiStringSchema,
  gloss: MultiStringSchema,
  examples: z.array(z.lazy(() => LexExampleSchema)).optional(),
  subsenses: z.array(z.lazy(() => LexSenseSchema)).optional(),
  semanticDomains: z.array(GuidSchema).optional(),
});

export type LexEntry = z.infer<typeof LexEntrySchema>;
export type LexSense = z.infer<typeof LexSenseSchema>;
```

**Drizzle Schema (SQLite):**
```typescript
// src/main/database/schema.ts
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const lexicalEntries = sqliteTable('lexical_entries', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid'),
  lexemeForm: text('lexeme_form').notNull(),
  citationForm: text('citation_form'),
  homographNumber: integer('homograph_number'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull(),
  // Store complex data as JSON
  sensesJson: text('senses_json').notNull(), // Serialized LexSense[]
  isDirty: integer('is_dirty', { mode: 'boolean' }).default(false),
});

export const lexicalSenses = sqliteTable('lexical_senses', {
  guid: text('guid').primaryKey(),
  ownerguid: text('owner_guid').notNull(),
  entryGuid: text('entry_guid').notNull(),
  definitionJson: text('definition_json').notNull(), // MultiString
  glossJson: text('gloss_json').notNull(),
  examplesJson: text('examples_json'),
  dateCreated: integer('date_created', { mode: 'timestamp' }).notNull(),
  dateModified: integer('date_modified', { mode: 'timestamp' }).notNull(),
});

// Full-text search
export const entriesFts = sqliteTable('entries_fts', {
  // FTS5 virtual table for fast searching
  lexemeForm: text('lexeme_form'),
  citationForm: text('citation_form'),
  definitionText: text('definition_text'),
});
```

### 4.3 FWData Reader Implementation

```typescript
// src/main/fwdata/reader.ts
import { XMLParser } from 'fast-xml-parser';
import { db } from '../database';
import { lexicalEntries } from '../database/schema';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export class FWDataReader {
  private parser: XMLParser;
  private objectCache: Map<string, any>;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: false,
      trimValues: true,
      isArray: (tagName) => ['rt', 'AStr', 'AUni'].includes(tagName),
    });
    this.objectCache = new Map();
  }

  async loadProject(filePath: string): Promise<void> {
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const parsed = this.parser.parse(xmlContent);

    const version = parsed.languageproject['@_version'];
    console.log(`Loading FWData version: ${version}`);

    // Start transaction
    return db.transaction(async (tx) => {
      // Clear existing data
      await tx.delete(lexicalEntries);

      // Parse all <rt> elements
      const rtElements = Array.isArray(parsed.languageproject.rt)
        ? parsed.languageproject.rt
        : [parsed.languageproject.rt];

      // First pass: create all objects
      for (const rt of rtElements) {
        const obj = this.parseObject(rt);
        this.objectCache.set(obj.guid, obj);
      }

      // Second pass: resolve references and insert
      for (const obj of this.objectCache.values()) {
        if (obj.class === 'LexEntry') {
          await this.insertLexEntry(tx, obj);
        }
      }
    });
  }

  private parseObject(rt: any): any {
    const className = rt['@_class'];
    const guid = rt['@_guid'];
    const ownerguid = rt['@_ownerguid'];

    if (!validateUuid(guid)) {
      throw new Error(`Invalid GUID: ${guid}`);
    }

    switch (className) {
      case 'LexEntry':
        return this.parseLexEntry(rt);
      case 'LexSense':
        return this.parseLexSense(rt);
      default:
        return { guid, class: className, ownerguid, raw: rt };
    }
  }

  private parseLexEntry(rt: any): LexEntry {
    return {
      guid: rt['@_guid'],
      class: 'LexEntry',
      ownerguid: rt['@_ownerguid'],
      lexemeForm: this.extractLexemeForm(rt.LexemeForm),
      citationForm: this.extractText(rt.CitationForm),
      homographNumber: rt.HomographNumber?.['@_val'],
      dateCreated: new Date(rt.DateCreated?.['@_val']),
      dateModified: new Date(rt.DateModified?.['@_val']),
      senses: [], // Resolved in second pass
    };
  }

  private parseLexSense(rt: any): LexSense {
    return {
      guid: rt['@_guid'],
      class: 'LexSense',
      ownerguid: rt['@_ownerguid'],
      definition: this.parseMultiString(rt.Definition),
      gloss: this.parseMultiString(rt.Gloss),
      dateCreated: new Date(rt.DateCreated?.['@_val']),
      dateModified: new Date(rt.DateModified?.['@_val']),
    };
  }

  private parseMultiString(node: any): Record<string, string> {
    if (!node) return {};

    const result: Record<string, string> = {};
    const aStrArray = Array.isArray(node.AStr) ? node.AStr : [node.AStr];

    for (const aStr of aStrArray) {
      if (!aStr) continue;
      const ws = aStr['@_ws'];
      const text = aStr.Run?.['#text'] || aStr.Run || '';
      result[ws] = text;
    }

    return result;
  }

  private async insertLexEntry(tx: any, entry: LexEntry): Promise<void> {
    // Resolve sense references
    const senses = [];
    // ... resolve from objectCache based on ownerguid ...

    await tx.insert(lexicalEntries).values({
      guid: entry.guid,
      ownerguid: entry.ownerguid,
      lexemeForm: entry.lexemeForm,
      citationForm: entry.citationForm,
      homographNumber: entry.homographNumber,
      dateCreated: entry.dateCreated,
      dateModified: entry.dateModified,
      sensesJson: JSON.stringify(senses),
      isDirty: false,
    });
  }
}
```

### 4.4 FWData Writer Implementation

```typescript
// src/main/fwdata/writer.ts
import { XMLBuilder } from 'fast-xml-parser';
import { db } from '../database';
import { lexicalEntries } from '../database/schema';

export class FWDataWriter {
  private builder: XMLBuilder;

  constructor() {
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
  }

  async saveProject(filePath: string, projectGuid: string): Promise<void> {
    // Backup existing file
    await this.createBackup(filePath);

    // Collect all entries from SQLite
    const entries = await db.select().from(lexicalEntries).all();

    // Build XML structure
    const xmlObject = {
      languageproject: {
        '@_version': '7000072',
        AdditionalFields: {}, // TODO: custom fields
        rt: this.entriesToXmlObjects(entries),
      },
    };

    // Write to temp file then atomic rename
    const tempPath = `${filePath}.tmp`;
    const xmlString = this.builder.build(xmlObject);
    await fs.writeFile(tempPath, xmlString, 'utf-8');
    await fs.rename(tempPath, filePath);
  }

  private entriesToXmlObjects(entries: any[]): any[] {
    const xmlObjects = [];

    for (const entry of entries) {
      // Add LexEntry object
      xmlObjects.push({
        '@_class': 'LexEntry',
        '@_guid': entry.guid,
        '@_ownerguid': entry.ownerguid,
        LexemeForm: {
          AUni: {
            '@_ws': 'en', // TODO: get from entry
            '#text': entry.lexemeForm,
          },
        },
        DateCreated: {
          '@_val': entry.dateCreated.toISOString(),
        },
        DateModified: {
          '@_val': entry.dateModified.toISOString(),
        },
      });

      // Add sense objects
      const senses = JSON.parse(entry.sensesJson);
      for (const sense of senses) {
        xmlObjects.push(this.senseToXmlObject(sense, entry.guid));
      }
    }

    // Sort for version control stability
    return this.sortObjects(xmlObjects);
  }

  private senseToXmlObject(sense: LexSense, entryGuid: string): any {
    return {
      '@_class': 'LexSense',
      '@_guid': sense.guid,
      '@_ownerguid': entryGuid,
      Definition: this.multiStringToXml(sense.definition),
      Gloss: this.multiStringToXml(sense.gloss),
      DateCreated: { '@_val': sense.dateCreated.toISOString() },
      DateModified: { '@_val': sense.dateModified.toISOString() },
    };
  }

  private multiStringToXml(multiString: Record<string, string>): any {
    const AStr = [];
    for (const [ws, text] of Object.entries(multiString)) {
      AStr.push({
        '@_ws': ws,
        Run: {
          '@_ws': ws,
          '#text': text,
        },
      });
    }
    return { AStr };
  }

  private sortObjects(objects: any[]): any[] {
    // Sort by class, then by GUID for VCS stability
    return objects.sort((a, b) => {
      if (a['@_class'] !== b['@_class']) {
        return a['@_class'].localeCompare(b['@_class']);
      }
      return a['@_guid'].localeCompare(b['@_guid']);
    });
  }

  private async createBackup(filePath: string): Promise<void> {
    if (await fs.pathExists(filePath)) {
      await fs.copy(filePath, `${filePath}.bak`);
    }
  }
}
```

### 4.5 Data Validation & Auto-Repair

```typescript
// src/main/fwdata/validator.ts
export class DataValidator {
  async validate(projectGuid: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    await this.checkGuidUniqueness(errors);
    await this.checkOwnershipIntegrity(errors);
    await this.checkReferenceIntegrity(errors);
    await this.checkDateConsistency(errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async checkGuidUniqueness(errors: ValidationError[]): Promise<void> {
    const result = await db.execute(`
      SELECT guid, COUNT(*) as count
      FROM (
        SELECT guid FROM lexical_entries
        UNION ALL
        SELECT guid FROM lexical_senses
      )
      GROUP BY guid
      HAVING count > 1
    `);

    for (const row of result.rows) {
      errors.push({
        type: 'DuplicateGUID',
        guid: row.guid,
        message: `GUID ${row.guid} appears ${row.count} times`,
      });
    }
  }

  // ... more validation methods ...
}
```

---

## 5. Core Features Implementation

### 5.1 Lexicon Area

**Entry List Component:**
```typescript
// src/renderer/features/lexicon/components/EntryList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom } from 'jotai';
import { entriesAtom, filteredEntriesAtom } from '../store';

export const EntryList: React.FC = () => {
  const [entries] = useAtom(filteredEntriesAtom);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          return (
            <EntryRow
              key={entry.guid}
              entry={entry}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
```

**Entry Editor Component:**
```typescript
// src/renderer/features/lexicon/components/EntryEditor.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LexEntrySchema } from '@/shared/types/lcm';

export const EntryEditor: React.FC<{ entryGuid: string }> = ({ entryGuid }) => {
  const entry = useAtomValue(entryAtomFamily(entryGuid));

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(LexEntrySchema),
    defaultValues: entry,
  });

  const onSubmit = async (data: LexEntry) => {
    await window.api.updateEntry(entryGuid, data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        label="Lexeme Form"
        {...register('lexemeForm')}
        error={errors.lexemeForm?.message}
      />

      <MultiStringInput
        label="Definition"
        name="senses.0.definition"
        writingSystems={['en', 'es', 'fr']}
      />

      <Button type="submit">Save</Button>
    </form>
  );
};
```

**Bulk Edit:**
```typescript
// src/renderer/features/lexicon/components/BulkEdit.tsx
export const BulkEdit: React.FC = () => {
  const [selectedEntries] = useAtom(selectedEntriesAtom);
  const [operation, setOperation] = useState<'replace' | 'delete' | 'copy'>('replace');

  const handleApply = async () => {
    const guids = Array.from(selectedEntries);

    if (operation === 'replace') {
      await window.api.bulkReplace({
        guids,
        field: 'definition',
        find: 'old text',
        replace: 'new text',
      });
    }
  };

  return (
    <div>
      <Select value={operation} onChange={(e) => setOperation(e.target.value)}>
        <option value="replace">Bulk Replace</option>
        <option value="delete">Bulk Delete</option>
        <option value="copy">Bulk Copy</option>
      </Select>

      <PreviewPane entries={selectedEntries} operation={operation} />

      <Button onClick={handleApply}>Apply to {selectedEntries.size} entries</Button>
    </div>
  );
};
```

### 5.2 Texts & Interlinear

**Interlinear Editor (Tiptap):**
```typescript
// src/renderer/features/texts/components/InterlinearEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import { Node } from '@tiptap/core';

// Custom Tiptap node for interlinear structure
const InterlinearWordNode = Node.create({
  name: 'interlinearWord',
  group: 'block',
  content: 'interlinearLine+',

  addAttributes() {
    return {
      wordGuid: { default: null },
      isAnalyzed: { default: false },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'interlinear-word', ...HTMLAttributes }, 0];
  },
});

const InterlinearLineNode = Node.create({
  name: 'interlinearLine',
  group: 'block',
  content: 'text*',

  addAttributes() {
    return {
      type: { default: 'baseline' }, // baseline | morphemes | gloss | pos | freeTranslation
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: `line-${HTMLAttributes.type}`, ...HTMLAttributes }, 0];
  },
});

export const InterlinearEditor: React.FC = () => {
  const editor = useEditor({
    extensions: [InterlinearWordNode, InterlinearLineNode],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      window.api.saveText(textGuid, json);
    },
  });

  return <EditorContent editor={editor} />;
};
```

**Parser Integration (Future WASM):**
```typescript
// src/main/parsers/xample.ts
export class XAmpleParser {
  private wasmModule: WebAssembly.Module | null = null;

  async initialize(): Promise<void> {
    const wasmBuffer = await fs.readFile('./xample.wasm');
    this.wasmModule = await WebAssembly.compile(wasmBuffer);
  }

  async parseWord(word: string, morphemes: string[]): Promise<ParseResult> {
    // Call WASM exported function
    // Return analysis with morphemes, gloss, POS
  }
}
```

### 5.3 Search & Concordance

**Full-Text Search:**
```typescript
// src/main/ipc/search.ts
import { db } from '../database';

ipcMain.handle('search:entries', async (event, query: string) => {
  const results = await db.execute(`
    SELECT e.guid, e.lexeme_form, e.citation_form,
           snippet(entries_fts, 0, '<mark>', '</mark>', '...', 20) as highlight
    FROM entries_fts
    JOIN lexical_entries e ON entries_fts.rowid = e.rowid
    WHERE entries_fts MATCH ?
    ORDER BY rank
    LIMIT 100
  `, [query]);

  return results.rows;
});
```

---

## 6. Sync & Collaboration (Lexbox)

### 6.1 Lexbox Integration Architecture

```
React App (Renderer)
    ↓
Main Process Sync Service
    ↓
┌─────────────┬──────────────┐
│ Automerge   │  Lexbox API  │
│ CRDT Engine │  Client      │
└─────────────┴──────────────┘
    ↓                ↓
Local SQLite    HTTPS (JWT)
                     ↓
              Lexbox Server
                     ↓
          Mercurial Repository
```

### 6.2 Lexbox Client Implementation

```typescript
// src/main/sync/lexbox-client.ts
import { z } from 'zod';

const ProjectSchema = z.object({
  identifier: z.string(),
  name: z.string(),
  lastModified: z.string().datetime(),
});

export class LexboxClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'https://lexbox.org') {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // HTTP-only cookies
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.token = data.token; // Optional: may be in cookie only
  }

  async getUserProjects(): Promise<Project[]> {
    const response = await fetch(`${this.baseUrl}/api/user/projects`, {
      credentials: 'include',
    });

    const data = await response.json();
    return z.array(ProjectSchema).parse(data);
  }

  async pull(projectCode: string, lastRevision: string): Promise<ChangeSet> {
    // Use Mercurial changegroup command
    const response = await fetch(
      `${this.baseUrl}/hg/${projectCode}?cmd=changegroup&roots=${lastRevision}`,
      { credentials: 'include' }
    );

    return this.parseChangeSet(response);
  }

  async push(projectCode: string, changes: Uint8Array): Promise<void> {
    // Resumable push via API v03
    await this.resumablePush(projectCode, changes);
  }

  private async resumablePush(
    projectCode: string,
    bundle: Uint8Array
  ): Promise<void> {
    const chunkSize = 5000; // 5KB initial
    const bundleSize = bundle.length;
    let offset = 0;

    while (offset < bundleSize) {
      const chunk = bundle.slice(offset, offset + chunkSize);

      const params = new URLSearchParams({
        offset: offset.toString(),
        chunkSize: chunkSize.toString(),
        bundleSize: bundleSize.toString(),
        repoId: projectCode,
      });

      const response = await fetch(`${this.baseUrl}/api/v03/push?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk,
        credentials: 'include',
      });

      const status = response.headers.get('X-HgR-Status');

      if (status === '202') {
        offset += chunk.length;
      } else if (status === '412') {
        // Resend chunk
        continue;
      } else {
        throw new Error(`Push failed with status ${status}`);
      }
    }
  }
}
```

### 6.3 Automerge CRDT Sync

```typescript
// src/main/sync/automerge.ts
import * as Automerge from '@automerge/automerge';
import { next as A } from '@automerge/automerge';

export class AutomergeSyncService {
  private doc: A.Doc<ProjectData>;
  private syncState: A.SyncState | null = null;

  constructor() {
    this.doc = A.init<ProjectData>();
  }

  async applyLocalChange(change: LocalChange): Promise<void> {
    this.doc = A.change(this.doc, (doc) => {
      if (change.type === 'UPDATE_ENTRY') {
        const entry = doc.entries.find((e) => e.guid === change.guid);
        if (entry) {
          Object.assign(entry, change.data);
          entry.dateModified = new Date();
        }
      } else if (change.type === 'CREATE_ENTRY') {
        doc.entries.push(change.data);
      } else if (change.type === 'DELETE_ENTRY') {
        const index = doc.entries.findIndex((e) => e.guid === change.guid);
        if (index !== -1) {
          doc.entries.splice(index, 1);
        }
      }
    });

    // Persist to SQLite
    await this.persistToDatabase();
  }

  async sync(remotePeer: LexboxClient, projectCode: string): Promise<void> {
    // Initialize sync state if needed
    if (!this.syncState) {
      this.syncState = A.initSyncState();
    }

    // Generate sync message
    const [nextSyncState, syncMessage] = A.generateSyncMessage(
      this.doc,
      this.syncState
    );
    this.syncState = nextSyncState;

    // Send to Lexbox (requires custom protocol or store in Mercurial)
    if (syncMessage) {
      await remotePeer.pushAutomergeMessage(projectCode, syncMessage);
    }

    // Receive changes from Lexbox
    const remoteMessage = await remotePeer.pullAutomergeMessage(projectCode);

    if (remoteMessage) {
      const [nextDoc, nextSyncState] = A.receiveSyncMessage(
        this.doc,
        this.syncState,
        remoteMessage
      );

      this.doc = nextDoc;
      this.syncState = nextSyncState;

      // Update SQLite with merged changes
      await this.persistToDatabase();
    }
  }

  private async persistToDatabase(): Promise<void> {
    const entries = A.materialize(this.doc).entries;

    await db.transaction(async (tx) => {
      for (const entry of entries) {
        await tx.insert(lexicalEntries).values(entry)
          .onConflictDoUpdate({
            target: lexicalEntries.guid,
            set: {
              lexemeForm: entry.lexemeForm,
              sensesJson: JSON.stringify(entry.senses),
              dateModified: entry.dateModified,
            },
          });
      }
    });
  }
}
```

### 6.4 Conflict Resolution UI

```typescript
// src/renderer/features/sync/components/ConflictResolver.tsx
export const ConflictResolver: React.FC<{ conflicts: Conflict[] }> = ({ conflicts }) => {
  const handleResolve = async (conflict: Conflict, resolution: 'ours' | 'theirs' | 'manual') => {
    await window.api.resolveConflict(conflict.id, resolution, conflict.mergedData);
  };

  return (
    <div>
      <h2>Conflicts Detected ({conflicts.length})</h2>
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="conflict-item">
          <h3>{conflict.fieldPath}</h3>

          <div className="comparison">
            <div>
              <strong>Your Version:</strong>
              <pre>{JSON.stringify(conflict.ours, null, 2)}</pre>
            </div>

            <div>
              <strong>Their Version:</strong>
              <pre>{JSON.stringify(conflict.theirs, null, 2)}</pre>
            </div>
          </div>

          <div className="actions">
            <Button onClick={() => handleResolve(conflict, 'ours')}>
              Keep Mine
            </Button>
            <Button onClick={() => handleResolve(conflict, 'theirs')}>
              Keep Theirs
            </Button>
            <Button onClick={() => setEditing(conflict.id)}>
              Edit Manually
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

**Note:** Automerge provides automatic conflict resolution for most cases. Manual resolution UI is only needed for semantic conflicts (e.g., both users changed the same lexeme to different words).

---

## 7. Export & Publishing

### 7.1 DOCX Export

```typescript
// src/main/export/docx.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function exportToDocx(
  entries: LexEntry[],
  options: ExportOptions
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: 'Dictionary',
          heading: HeadingLevel.HEADING_1,
        }),
        ...entries.flatMap(entry => entryToParagraphs(entry, options)),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}

function entryToParagraphs(entry: LexEntry, options: ExportOptions): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Headword
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: entry.lexemeForm,
        bold: true,
        size: 28,
      }),
      ...(entry.homographNumber ? [new TextRun({
        text: ` ${entry.homographNumber}`,
        size: 20,
        superScript: true,
      })] : []),
    ],
  }));

  // Senses
  for (const [index, sense] of entry.senses.entries()) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: `${index + 1}. `,
          bold: true,
        }),
        new TextRun({
          text: sense.definition[options.definitionWs] || '',
        }),
      ],
      indent: { left: 720 }, // 0.5 inch
    }));
  }

  return paragraphs;
}
```

### 7.2 PDF Export

```typescript
// src/main/export/pdf.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';

export async function exportToPdf(
  entries: LexEntry[],
  outputPath: string,
  options: ExportOptions
): Promise<void> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 72, right: 72 },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Register Unicode fonts
  doc.registerFont('Regular', './resources/fonts/NotoSans-Regular.ttf');
  doc.registerFont('Bold', './resources/fonts/NotoSans-Bold.ttf');

  // Title
  doc.font('Bold').fontSize(24).text('Dictionary', { align: 'center' });
  doc.moveDown(2);

  // Entries
  for (const entry of entries) {
    // Headword
    doc.font('Bold').fontSize(14).text(entry.lexemeForm, { continued: true });

    if (entry.homographNumber) {
      doc.fontSize(10).text(` ${entry.homographNumber}`, { baseline: 'top' });
    } else {
      doc.text(''); // New line
    }

    // Senses
    for (const [index, sense] of entry.senses.entries()) {
      doc.font('Regular')
         .fontSize(11)
         .text(`  ${index + 1}. ${sense.definition[options.definitionWs] || ''}`, {
           indent: 20,
         });
    }

    doc.moveDown(0.5);

    // Page break if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
```

### 7.3 LIFT Export

```typescript
// src/main/export/lift.ts
import { XMLBuilder } from 'fast-xml-parser';

export async function exportToLift(
  entries: LexEntry[],
  outputPath: string
): Promise<void> {
  const liftObject = {
    lift: {
      '@_version': '0.13',
      entry: entries.map(entryToLift),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  const xml = builder.build(liftObject);
  await fs.writeFile(outputPath, xml, 'utf-8');
}

function entryToLift(entry: LexEntry): any {
  return {
    '@_id': entry.guid,
    '@_dateCreated': entry.dateCreated.toISOString(),
    '@_dateModified': entry.dateModified.toISOString(),
    'lexical-unit': {
      form: Object.entries(entry.definition).map(([lang, text]) => ({
        '@_lang': lang,
        text,
      })),
    },
    sense: entry.senses.map(senseToLift),
  };
}

function senseToLift(sense: LexSense): any {
  return {
    '@_id': sense.guid,
    definition: {
      form: Object.entries(sense.definition).map(([lang, text]) => ({
        '@_lang': lang,
        text,
      })),
    },
    gloss: {
      form: Object.entries(sense.gloss).map(([lang, text]) => ({
        '@_lang': lang,
        text,
      })),
    },
  };
}
```

---

## 8. Performance & Optimization

### 8.1 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Cold start | < 2 seconds | Code splitting, lazy loading, faster boot via electron-vite |
| Load 10K entries | < 500ms | Indexed SQLite queries, batch loading, virtual scrolling |
| Search 50K entries | < 100ms | FTS5 full-text search, debounced input |
| Render entry list | 60 FPS | TanStack Virtual, React.memo, Jotai granular updates |
| Export 1K entries | < 2 seconds | Streaming writes, worker threads |
| Sync 100 changes | < 5 seconds | Automerge binary format, chunked transfer |

### 8.2 Optimization Strategies

**Database Indexing:**
```sql
CREATE INDEX idx_lexeme ON lexical_entries(lexeme_form);
CREATE INDEX idx_modified ON lexical_entries(date_modified);
CREATE INDEX idx_owner ON lexical_entries(owner_guid);

CREATE VIRTUAL TABLE entries_fts USING fts5(
  lexeme_form,
  citation_form,
  definition_text,
  content=lexical_entries,
  content_rowid=rowid
);
```

**React Optimization:**
```typescript
// Memoize expensive components
export const EntryRow = React.memo<EntryRowProps>(({ entry }) => {
  return <div>{entry.lexemeForm}</div>;
}, (prev, next) => prev.entry.guid === next.entry.guid);

// Use Jotai atom families for granular updates
export const entryAtomFamily = atomFamily((guid: string) =>
  atom(
    (get) => get(entriesAtom).get(guid),
    (get, set, update: Partial<LexEntry>) => {
      const entries = new Map(get(entriesAtom));
      const entry = entries.get(guid);
      if (entry) {
        entries.set(guid, { ...entry, ...update });
        set(entriesAtom, entries);
      }
    }
  )
);
```

**Code Splitting:**
```typescript
// Lazy load heavy features
const GrammarArea = lazy(() => import('./features/grammar'));
const InterlinearEditor = lazy(() => import('./features/texts/InterlinearEditor'));

<Suspense fallback={<Loading />}>
  <GrammarArea />
</Suspense>
```

**Worker Threads for Heavy Operations:**
```typescript
// src/main/workers/export-worker.ts
import { parentPort } from 'worker_threads';

parentPort?.on('message', async ({ type, data }) => {
  if (type === 'EXPORT_PDF') {
    const result = await exportToPdf(data.entries, data.options);
    parentPort?.postMessage({ type: 'EXPORT_COMPLETE', result });
  }
});
```

---

## 9. Security & Data Integrity

### 9.1 Security Measures

**Electron Security Checklist:**
- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Sandbox enabled
- ✅ Content Security Policy configured
- ✅ All IPC validated with Zod schemas
- ✅ No `eval()` or `new Function()`
- ✅ HTTPS for all external requests (Lexbox)

**Data Protection:**
```typescript
// Encrypt sensitive settings (Lexbox credentials)
import { safeStorage } from 'electron';

function encryptCredentials(password: string): Buffer {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(password);
  }
  throw new Error('Encryption not available');
}

function decryptCredentials(encrypted: Buffer): string {
  return safeStorage.decryptString(encrypted);
}
```

**SQL Injection Prevention:**
```typescript
// Always use prepared statements (Drizzle ORM handles this)
const results = await db.select()
  .from(lexicalEntries)
  .where(eq(lexicalEntries.lexemeForm, userInput)); // Safe
```

### 9.2 Data Integrity

**Transaction Atomicity:**
```typescript
// All multi-step operations in transactions
await db.transaction(async (tx) => {
  await tx.insert(lexicalEntries).values(entry);
  await tx.insert(lexicalSenses).values(entry.senses);
  await tx.update(projectMetadata).set({ lastModified: new Date() });
});
```

**Backup Strategy:**
```typescript
// Automatic backups before major operations
async function autoBackup(projectPath: string): Promise<void> {
  const backupPath = `${projectPath}.backup.${Date.now()}`;
  await fs.copy(projectPath, backupPath);

  // Keep last 10 backups
  await cleanOldBackups(projectPath, 10);
}
```

**Data Validation:**
```typescript
// Validate all user input
const validated = LexEntrySchema.parse(userInput); // Throws if invalid
```

---

## 10. Development Phases

### Phase 1: Foundation (Months 1-4)

**Deliverables:**
- ✅ Electron + React + TypeScript project setup
- ✅ SQLite database with Drizzle ORM
- ✅ FWData XML reader (read-only)
- ✅ Basic project management (open, close, create)
- ✅ Entry list with virtual scrolling
- ✅ Simple entry editor (lexeme, gloss, definition)
- ✅ Full-text search (FTS5)

**Success Criteria:**
- Can open existing `.fwdata` files
- Display 10,000+ entries smoothly
- Search works in < 100ms

### Phase 2: Core Editing (Months 5-8)

**Deliverables:**
- ✅ Complete entry editor (all fields)
- ✅ Multi-sense support with subsenses
- ✅ Multi-writing system input (Keyman Web)
- ✅ Bulk edit operations
- ✅ Semantic domain assignment
- ✅ FWData writer (can save changes)
- ✅ Undo/redo system

**Success Criteria:**
- Full CRUD on lexical entries
- Changes persist correctly to `.fwdata`
- Round-trip fidelity (read → edit → save → read)

### Phase 3: Text & Interlinear (Months 9-12)

**Deliverables:**
- ✅ Text corpus management
- ✅ Baseline text editor
- ✅ Interlinear editor (Tiptap-based)
- ✅ Word analysis UI (manual glossing)
- ✅ Concordance views
- ✅ Text import (SFM)

**Success Criteria:**
- Can create and gloss texts
- Concordance shows word contexts
- Manual morphological analysis works

### Phase 4: Sync & Collaboration (Months 13-16)

**Deliverables:**
- ✅ Lexbox authentication
- ✅ Project discovery from Lexbox
- ✅ Automerge CRDT integration
- ✅ Send/Receive implementation
- ✅ Conflict resolution UI
- ✅ Offline queue

**Success Criteria:**
- Can sync with Lexbox
- Conflicts detected and resolvable
- Offline changes queue and sync when online

### Phase 5: Export & Publishing (Months 17-20)

**Deliverables:**
- ✅ LIFT export/import
- ✅ DOCX export (configurable)
- ✅ PDF export with Unicode fonts
- ✅ Excel export
- ✅ Dictionary formatting templates
- ✅ Print preview

**Success Criteria:**
- LIFT compatible with other tools (WeSay)
- DOCX opens in Word with correct formatting
- PDF renders complex scripts correctly

### Phase 6: Grammar & Advanced Features (Months 21-24)

**Deliverables:**
- ✅ Grammar area (POS, categories, features)
- ✅ Parser integration (WASM)
- ✅ Automatic glossing suggestions
- ✅ Notebook area
- ✅ Reversal indexes
- ✅ Classified dictionary view

**Success Criteria:**
- Parser provides analysis suggestions
- Grammar data persists
- All major areas functional

### Phase 7: Polish & Migration (Months 25-30)

**Deliverables:**
- ✅ Performance optimization
- ✅ Migration tool (old FWData versions)
- ✅ User documentation
- ✅ Video tutorials
- ✅ Bug fixes from beta testing
- ✅ Localization (Spanish, French)
- ✅ Auto-update system

**Success Criteria:**
- Passes performance targets
- Beta users complete real work
- No data loss in production use

---

## 11. Risk Assessment & Mitigation

### 11.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **FWData format changes** | Medium | Implement all schema versions, use XSD validation |
| **Parser complexity (WASM)** | High | Start with manual analysis, add parser in Phase 6 |
| **Lexbox API changes** | Medium | Abstract API client, version API calls |
| **Performance at scale** | High | Benchmark early (Phase 1), optimize iteratively |
| **Complex script rendering** | Medium | Use browser text layout, fall back to HarfBuzz.js if needed |
| **Sync conflicts** | High | Automerge handles most cases, clear conflict UI for rest |

### 11.2 Organizational Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **User adoption** | High | Beta program with real linguists, migration support |
| **Feature parity** | High | Phased rollout, feature flags, don't claim 100% parity upfront |
| **Lexbox availability** | Medium | Offline-first architecture, can work without Lexbox |
| **Team capacity** | Medium | Start with MVP (Phase 1-2), expand team later |

---

## 12. Success Metrics

### 12.1 Technical Metrics

- **Code Coverage:** > 80% unit tests, > 70% E2E coverage
- **Performance:** All targets met (see section 8.1)
- **Bundle Size:** < 500 KB initial, < 2 MB total
- **Startup Time:** < 2 seconds on modern hardware
- **Memory Usage:** < 500 MB for 50K entries

### 12.2 User Metrics

- **Beta Users:** 50+ linguists testing by Month 18
- **Production Projects:** 100+ by Month 24
- **Data Loss Incidents:** 0 (critical)
- **Sync Success Rate:** > 99%
- **User Satisfaction:** > 4/5 rating

### 12.3 Adoption Metrics

- **Migration Rate:** 20% of FLEx users within Year 1
- **New Users:** 500+ in Year 1
- **Active Projects:** 200+ by end of Year 2

---

## Appendix A: Technology Decision Matrix

| Category | Options Considered | Selected | Rationale |
|----------|-------------------|----------|-----------|
| Desktop Framework | Electron, Tauri, NW.js | **Electron** | Mature ecosystem, better tooling |
| State Management | Redux, Zustand, Jotai, MobX | **Zustand + Jotai** | Minimal boilerplate, great DX |
| Database | SQLite, IndexedDB, LevelDB | **better-sqlite3** | Performance, SQL queries |
| ORM | Drizzle, Prisma, TypeORM | **Drizzle** | Type-safe, minimal overhead |
| CRDT | Automerge, Yjs, CRDT.tech | **Automerge** | JSON-like API, fast binary |
| Rich Text | Tiptap, Slate, Lexical | **Tiptap** | ProseMirror proven, CJK support |
| UI Library | Ant Design, MUI, Chakra | **Ant Design** | Data-heavy UIs, enterprise |
| Testing | Jest, Vitest, Playwright | **Vitest + Playwright** | Fast, Vite integration |

---

## Appendix B: File Format Compatibility

### FWData Versions Supported

- ✅ Version 7000072 (FLEx 9.1+) - Primary target
- ✅ Version 7000071 (FLEx 9.0)
- ⚠️ Version 7000068 (FLEx 8.x) - Migration required
- ⚠️ SQL Server (pre-v7.0) - Export to XML first

### LIFT Compatibility

- ✅ LIFT 0.13 (current standard)
- ✅ LIFT 0.12 (legacy, read-only)

---

## Appendix C: Recommended Team Structure

**Phase 1-2 (Foundation):**
- 1 Senior Full-Stack Developer (Electron + React)
- 1 Database/Backend Developer (SQLite, data model)
- 1 Linguist Consultant (part-time, requirements validation)

**Phase 3-4 (Scale-up):**
- +1 Frontend Developer (UI/UX)
- +1 Sync/Backend Developer (Lexbox integration)

**Phase 5-7 (Polish):**
- +1 QA Engineer
- +1 Technical Writer (documentation)
- Linguist Consultant (full-time, beta testing)

**Total:** 4-6 engineers + 1 consultant

---

## Appendix D: References

**SIL International Resources:**
- [FieldWorks GitHub](https://github.com/sillsdev/fieldworks)
- [liblcm GitHub](https://github.com/sillsdev/liblcm)
- [Chorus GitHub](https://github.com/sillsdev/chorus)
- [Lexbox GitHub](https://github.com/sillsdev/languageforge-lexbox)
- [LIFT Specification](https://code.google.com/archive/p/lift-standard)

**Technology Documentation:**
- [Electron Docs](https://www.electronjs.org/docs)
- [Automerge Docs](https://automerge.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tiptap](https://tiptap.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

**Document Status:** DRAFT v1.0
**Next Review:** After Phase 1 completion
**Maintained By:** Fieldworks-React Architecture Team
**Last Updated:** 2025-01-23
