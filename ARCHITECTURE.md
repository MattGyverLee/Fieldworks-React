# Fieldworks React/Electron Clone - Modern Cross-Platform Architecture

## Executive Summary

This document outlines a comprehensive modern architecture for building a cross-platform linguistic data management application as a Fieldworks clone using React, Electron, and TypeScript. The architecture focuses on replacing Windows-specific and .NET dependencies with modern, well-maintained JavaScript/TypeScript libraries while ensuring robust offline-first capabilities and cross-platform compatibility.

---

## 1. Modern Replacements for Windows-Specific Dependencies

### Current Fieldworks Dependencies to Replace

**Original Stack:**
- Windows Forms/.NET Framework UI
- Windows-specific file system APIs
- Platform-specific COM components
- Windows registry for configuration

**Modern Cross-Platform Replacements:**

| Component | Modern Replacement | Rationale |
|-----------|-------------------|-----------|
| UI Framework | Electron + React | Cross-platform desktop with native-like experience |
| File System | Node.js `fs` + `electron.app.getPath()` | Platform-agnostic file operations with OS-specific paths |
| Configuration | `electron-store` | Cross-platform settings persistence using JSON |
| Native Dialogs | `electron.dialog` | Native file/folder pickers on all platforms |
| System Integration | Electron IPC + `@electron/remote` | Cross-platform system tray, notifications, menus |

---

## 2. Modern Replacements for Mono/.NET Dependencies

### Current .NET Stack

**Original Dependencies:**
- C# Language & Runtime (.NET Framework 4.6.1/4.6.2)
- SIL.LCModel (Language & Culture Model)
- NuGet packages for data access
- Mono for Linux cross-platform support

**Modern JavaScript/TypeScript Replacements:**

### Core Language & Runtime
- **Replace:** C#/.NET Framework
- **With:** TypeScript 5.x + Node.js (via Electron)
- **Rationale:**
  - Strong typing with superior tooling
  - Native cross-platform support
  - Massive ecosystem
  - Better web integration

### Data Model Libraries
- **Replace:** SIL.LCModel.Core
- **With:** Custom TypeScript classes with Zod validation
- **Rationale:**
  - Type-safe data models
  - Runtime validation
  - JSON serialization
  - Clear separation of concerns

### Object-Relational Mapping
- **Replace:** .NET ORM (Entity Framework/NHibernate)
- **With:** Drizzle ORM or Kysely
- **Rationale:**
  - TypeScript-first SQL query builders
  - Type-safe database access
  - Lightweight and performant
  - Better SQLite support

---

## 3. React Component Architecture

### Architectural Pattern: Feature-Sliced Design

```
src/
├── app/                          # Application initialization
│   ├── providers/               # Global providers (theme, i18n, state)
│   ├── routes/                  # Route configuration
│   └── App.tsx
│
├── processes/                    # Complex cross-feature workflows
│   ├── lexicon-import/
│   ├── text-interlinearization/
│   └── data-synchronization/
│
├── pages/                        # Page-level components
│   ├── LexiconEditor/
│   ├── TextCorpus/
│   ├── Grammar/
│   └── Settings/
│
├── widgets/                      # Large composite components
│   ├── EntryEditor/
│   ├── GlossEditor/
│   ├── InterlinearText/
│   └── FieldSelector/
│
├── features/                     # Feature-specific business logic
│   ├── entry-management/
│   │   ├── model/              # State, types, schemas
│   │   ├── api/                # API calls
│   │   ├── ui/                 # Feature components
│   │   └── lib/                # Feature utilities
│   ├── text-analysis/
│   ├── morphology/
│   └── concordance/
│
├── entities/                     # Business entities
│   ├── entry/
│   ├── sense/
│   ├── example/
│   ├── text/
│   └── morpheme/
│
└── shared/                       # Shared infrastructure
    ├── ui/                      # UI kit components
    ├── lib/                     # Utilities
    ├── api/                     # API client
    ├── config/                  # Configuration
    └── types/                   # Common types
```

### Component Design Principles

1. **Composition Over Inheritance**
   - Use composition for complex UI elements
   - Leverage React hooks for behavior reuse
   - Headless UI components for logic/presentation separation

2. **Domain-Driven Components**
   - Align components with linguistic concepts (Entry, Sense, Example, Text)
   - Use domain language in component names
   - Encapsulate domain logic within feature boundaries

3. **Performance Optimization**
   - Virtualization for long lists (React Virtual)
   - Code splitting by route and feature
   - Memoization for expensive operations
   - Lazy loading for heavy components

---

## 4. State Management Solution

### Recommended: **Zustand** with **Jotai** for Fine-Grained State

#### Primary: Zustand (Global Application State)

**Library:** `zustand` v4.x

**Rationale:**
- Minimal boilerplate (~1KB bundle)
- Excellent TypeScript support
- Simple, intuitive API
- Middleware for persistence, immer, devtools
- Scales well for medium-large applications
- No provider wrapping needed

**Use Cases:**
- User preferences and settings
- Current project/database state
- UI state (sidebar open, active view)
- Authentication state
- Application-level caching

**Example Store Structure:**
```typescript
// stores/projectStore.ts
interface ProjectState {
  currentProject: Project | null;
  recentProjects: Project[];
  setCurrentProject: (project: Project) => void;
  addRecentProject: (project: Project) => void;
}

// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  activePane: string;
  toggleSidebar: () => void;
}

// stores/dataStore.ts
interface DataState {
  entries: Map<string, Entry>;
  isDirty: boolean;
  syncStatus: SyncStatus;
}
```

#### Secondary: Jotai (Fine-Grained Component State)

**Library:** `jotai` v2.x

**Rationale:**
- Atomic state management (~1.2KB)
- Minimal re-renders
- Perfect for complex interdependent state
- Great for derived/computed values
- Bottom-up approach

**Use Cases:**
- Form state with complex dependencies
- Editor state (cursor position, selection)
- Filtered/sorted lists
- Real-time collaborative state
- Temporary UI state

**Example Atoms:**
```typescript
// atoms/lexicon.ts
const entriesAtom = atom<Entry[]>([]);
const searchTermAtom = atom('');
const filteredEntriesAtom = atom(get => {
  const entries = get(entriesAtom);
  const search = get(searchTermAtom);
  return entries.filter(e => e.lexeme.includes(search));
});
```

#### Why Not Redux?

While Redux Toolkit is excellent for large enterprise teams, Zustand provides:
- 80% of Redux functionality with 20% of the code
- Better TypeScript inference
- No provider complexity
- Easier learning curve for contributors

**Decision Matrix:**
- Team size < 10 developers → Zustand
- Complex state interdependencies → Add Jotai
- Need time-travel debugging → Consider Redux Toolkit
- Need strict patterns → Consider Redux Toolkit

---

## 5. Database/Storage Solution for FWData Files

### Dual-Layer Storage Architecture

#### Layer 1: Primary Database - Better-SQLite3

**Library:** `better-sqlite3` v9.x

**Rationale:**
- **Performance:** Synchronous API (10-100x faster for Electron)
- **Reliability:** Battle-tested, widely used
- **Type Safety:** Excellent TypeScript support
- **Electron Native:** Works seamlessly in main process
- **ACID Compliance:** Full transaction support
- **Backup:** Simple file-based backups

**Schema Design for FWData:**
```sql
-- Core linguistic entities
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  guid TEXT UNIQUE NOT NULL,
  lexeme TEXT NOT NULL,
  citation_form TEXT,
  created_at INTEGER,
  modified_at INTEGER,
  owner_guid TEXT
);

CREATE TABLE senses (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  gloss TEXT,
  definition TEXT,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

CREATE TABLE examples (
  id TEXT PRIMARY KEY,
  sense_id TEXT NOT NULL,
  content TEXT,
  translation TEXT,
  FOREIGN KEY (sense_id) REFERENCES senses(id)
);

-- Full-text search
CREATE VIRTUAL TABLE entry_fts USING fts5(
  lexeme, citation_form, content='entries'
);

-- Indexes for performance
CREATE INDEX idx_entries_lexeme ON entries(lexeme);
CREATE INDEX idx_senses_entry ON senses(entry_id);
```

**Query Builder:** Drizzle ORM or Kysely
- Type-safe SQL queries
- Migration support
- Schema versioning

#### Layer 2: Renderer Process Cache - Dexie.js

**Library:** `dexie` v4.x + `dexie-react-hooks`

**Rationale:**
- **IndexedDB Wrapper:** Simplified API for browser storage
- **React Integration:** `useLiveQuery` hook for reactive queries
- **Offline-First:** Works without main process
- **Performance:** Fast queries for UI rendering
- **Sync:** Can sync with SQLite via IPC

**Use Cases:**
- UI state caching
- Temporary edits before commit
- Search indexes
- Media file references
- User preferences

**Schema Example:**
```typescript
class FieldworksDB extends Dexie {
  entries!: Table<Entry>;
  senses!: Table<Sense>;

  constructor() {
    super('FieldworksDB');
    this.version(1).stores({
      entries: 'id, lexeme, *tags',
      senses: 'id, entryId, gloss'
    });
  }
}
```

### FWData File Format Handling

#### XML Parsing: fast-xml-parser

**Library:** `fast-xml-parser` v4.x

**Rationale:**
- **Performance:** 87,710 req/sec vs xmldom's 77,285
- **TypeScript Support:** Full type definitions
- **Bidirectional:** Parse and build XML
- **Large Files:** Handles 100MB+ files
- **Validation:** Schema validation support

**Import/Export Pipeline:**
```typescript
// Import FWData XML → SQLite
async function importFWData(filePath: string) {
  const xml = await fs.readFile(filePath, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  const data = parser.parse(xml);

  // Transform to SQLite schema
  await db.transaction(async (tx) => {
    for (const rt of data.languageproject.entries.rt) {
      await tx.insert(entries).values({
        id: rt['@_guid'],
        lexeme: rt.LexemeForm?.AUni,
        // ... map other fields
      });
    }
  });
}

// Export SQLite → FWData XML
async function exportFWData(filePath: string) {
  const allEntries = await db.select().from(entries);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const xml = builder.build({
    languageproject: {
      entries: {
        rt: allEntries.map(toXMLFormat)
      }
    }
  });

  await fs.writeFile(filePath, xml);
}
```

### Database Migration Strategy

**Library:** `drizzle-kit` for migrations

```typescript
// migrations/0001_initial_schema.ts
export async function up(db: Database) {
  db.exec(`
    CREATE TABLE entries (...);
    CREATE TABLE senses (...);
  `);
}

export async function down(db: Database) {
  db.exec(`DROP TABLE entries; DROP TABLE senses;`);
}
```

---

## 6. Export Functionality Architecture

### Document Export Strategy

#### DOCX Export: docx

**Library:** `docx` v8.x

**Rationale:**
- **Native Format:** Creates proper DOCX (not conversion)
- **Rich Formatting:** Full Word formatting support
- **TypeScript:** Excellent type definitions
- **Maintainability:** Actively maintained
- **No Dependencies:** Pure JavaScript

**Use Cases:**
- Lexicon exports (formatted dictionaries)
- Interlinear text exports
- Grammar documentation
- Field notes

**Example:**
```typescript
import { Document, Paragraph, TextRun, Table } from 'docx';

async function exportLexiconToDOCX(entries: Entry[]) {
  const doc = new Document({
    sections: [{
      children: entries.flatMap(entry => [
        new Paragraph({
          children: [
            new TextRun({
              text: entry.lexeme,
              bold: true,
              size: 28
            })
          ]
        }),
        ...entry.senses.map(sense =>
          new Paragraph({
            text: `  ${sense.gloss}`,
            indent: { left: 720 }
          })
        )
      ])
    }]
  });

  return await Packer.toBlob(doc);
}
```

#### PDF Export: PDFKit

**Library:** `pdfkit` v0.14.x

**Rationale:**
- **Complex Layouts:** Powerful drawing API
- **Unicode Support:** Full Unicode text rendering
- **Fonts:** Embed custom fonts for complex scripts
- **Streams:** Memory-efficient for large documents
- **Cross-Platform:** Works in Node.js and browser

**Use Cases:**
- Print-ready lexicons
- Academic papers
- Reports with complex formatting
- Multi-column layouts

**Example:**
```typescript
import PDFDocument from 'pdfkit';

function generateLexiconPDF(entries: Entry[], outputPath: string) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));

  // Register custom fonts for linguistic symbols
  doc.registerFont('Charis', 'fonts/CharisSIL-Regular.ttf');

  entries.forEach(entry => {
    doc.fontSize(14).font('Charis').text(entry.lexeme);
    entry.senses.forEach(sense => {
      doc.fontSize(11).text(`  ${sense.gloss}`, { indent: 20 });
    });
    doc.moveDown();
  });

  doc.end();
}
```

#### Excel/CSV Export: ExcelJS

**Library:** `exceljs` v4.x

**Rationale:**
- **Full Excel Support:** .xlsx with formulas, styling
- **Large Datasets:** Streaming for huge files
- **TypeScript:** Full type support
- **Cross-Platform:** Works everywhere
- **Active Maintenance:** Regular updates

**Use Cases:**
- Data exports for analysis
- Concordance tables
- Word frequency lists
- Bulk import templates

#### HTML Export: Built-in

**Strategy:** Generate HTML with CSS for web viewing

**Libraries:**
- Template engine: Handlebars or template literals
- Styling: TailwindCSS classes
- Print CSS: For printable HTML

---

## 7. Offline-First Architecture with Sync

### Synchronization Strategy: CRDT-Based with Automerge

#### Primary Sync Library: Automerge

**Library:** `@automerge/automerge` v2.x + `@automerge/automerge-repo`

**Rationale:**
- **Conflict-Free:** Automatic merge without conflicts
- **Offline-First:** Full offline editing capabilities
- **JSON Model:** Matches linguistic data structures
- **TypeScript:** Strong type support
- **Network Agnostic:** Works with any transport
- **Mature:** Battle-tested in production

**Alternative:** Yjs (if real-time collaboration is priority)

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                         │
│  ┌────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │   React    │◄────►│  Automerge   │◄────►│  IndexedDB  │ │
│  │ Components │      │   Document   │      │   (Dexie)   │ │
│  └────────────┘      └──────────────┘      └─────────────┘ │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │ IPC
┌─────────────────────────────┼────────────────────────────────┐
│                     Main Process                             │
│                      ┌──────────────┐                        │
│                      │  Automerge   │                        │
│                      │   Repo       │                        │
│                      └──────┬───────┘                        │
│                             │                                │
│        ┌────────────────────┼────────────────────┐          │
│        │                    │                    │          │
│  ┌─────▼─────┐      ┌───────▼──────┐     ┌──────▼──────┐  │
│  │  SQLite   │      │ File System  │     │  Network     │  │
│  │ (Primary) │      │   Storage    │     │  Sync        │  │
│  └───────────┘      └──────────────┘     └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation Pattern

```typescript
// Main Process - Automerge Repo Setup
import { Repo } from '@automerge/automerge-repo';
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';

const repo = new Repo({
  storage: new NodeFSStorageAdapter(app.getPath('userData')),
  network: [new BroadcastChannelNetworkAdapter()],
});

// Document Type Definitions
interface LexiconDoc {
  entries: {
    [id: string]: {
      lexeme: string;
      senses: Array<{
        gloss: string;
        definition: string;
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

// Create/Load Document
const handle = repo.find<LexiconDoc>(documentId);
await handle.doc();

// Update Document (Automatic CRDT merge)
handle.change((doc) => {
  doc.entries[newId] = {
    lexeme: 'test',
    senses: [],
    modifiedAt: Date.now()
  };
});
```

#### Sync Mechanisms

##### Local Sync (Multi-Window)
- **Library:** `BroadcastChannelNetworkAdapter`
- **Use Case:** Multiple windows editing same project
- **Mechanism:** Browser BroadcastChannel API

##### Remote Sync (Cloud/Server)
- **Library:** `@automerge/automerge-repo-network-websocket`
- **Protocol:** WebSocket for real-time
- **Fallback:** HTTP polling for unreliable connections

##### Peer-to-Peer Sync
- **Library:** Custom WebRTC adapter
- **Use Case:** Direct device-to-device sync
- **Benefit:** No server required

#### Conflict Resolution Strategy

```typescript
// Automerge handles conflicts automatically, but we can track them
function detectConflicts(doc: LexiconDoc, baseVersion: number) {
  const conflicts: Conflict[] = [];

  for (const [id, entry] of Object.entries(doc.entries)) {
    const history = Automerge.getHistory(doc);
    const changes = history.filter(h =>
      h.change.time > baseVersion &&
      h.change.ops.some(op => op.obj === id)
    );

    if (changes.length > 1) {
      conflicts.push({
        entryId: id,
        changes: changes.map(c => c.change)
      });
    }
  }

  return conflicts;
}
```

### Version Control Integration

#### Git for Linguistic Data: isomorphic-git

**Library:** `isomorphic-git` v1.x + `lightning-fs`

**Rationale:**
- **Pure JavaScript:** No native dependencies
- **Cross-Platform:** Works in Electron, Node, Browser
- **Full Git Features:** Clone, commit, push, pull
- **Offline:** Full local repository
- **TypeScript:** Type definitions available

**Use Cases:**
- Project versioning
- Collaboration via Git repos
- Backup to GitHub/GitLab
- Change tracking
- Branching for experiments

**Implementation:**
```typescript
import git from 'isomorphic-git';
import fs from 'fs';
import http from 'isomorphic-git/http/node';

// Initialize repository
await git.init({ fs, dir: projectPath });

// Commit changes
await git.add({ fs, dir: projectPath, filepath: 'lexicon.fwdata' });
await git.commit({
  fs,
  dir: projectPath,
  message: 'Updated lexicon entries',
  author: {
    name: currentUser.name,
    email: currentUser.email
  }
});

// Push to remote
await git.push({
  fs,
  http,
  dir: projectPath,
  remote: 'origin',
  ref: 'main',
  onAuth: () => ({ username: token })
});

// View history
const commits = await git.log({ fs, dir: projectPath });
```

### Offline Detection & Queue

**Library:** Custom implementation with `navigator.onLine`

```typescript
// Offline queue manager
class SyncQueue {
  private queue: SyncOperation[] = [];
  private processing = false;

  constructor() {
    window.addEventListener('online', () => this.processQueue());
  }

  async add(operation: SyncOperation) {
    this.queue.push(operation);
    await this.saveQueue(); // Persist to IndexedDB

    if (navigator.onLine && !this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    if (this.processing || !navigator.onLine) return;

    this.processing = true;

    while (this.queue.length > 0 && navigator.onLine) {
      const op = this.queue.shift()!;
      try {
        await this.executeOperation(op);
      } catch (error) {
        this.queue.unshift(op); // Re-queue on failure
        break;
      }
    }

    this.processing = false;
    await this.saveQueue();
  }
}
```

---

## 8. Additional Modern Libraries & Tools

### Unicode & Complex Script Support

#### Intl.Segmenter (Native API)

**Standard:** ECMAScript 2022 (Stage 4)

**Browser Support:** Chrome 87+, Safari 14.1+, Firefox 125+, Node.js 16+

**Rationale:**
- **Native Performance:** Built into JavaScript engines
- **No Dependencies:** Part of the platform
- **Standard Compliant:** UAX #29 Unicode segmentation
- **Grapheme Clusters:** Proper emoji and complex script handling

**Use Cases:**
- Character counting (grapheme-aware)
- Word boundary detection
- Sentence segmentation
- CJK text handling

**Example:**
```typescript
// Grapheme segmentation (handles emojis, combining characters)
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const text = '👨‍👩‍👧‍👦 Hello';
const segments = [...segmenter.segment(text)];
// segments.length === 7 (not 13!)

// Word segmentation
const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' });
for (const {segment, isWordLike} of wordSegmenter.segment(text)) {
  if (isWordLike) console.log(segment);
}
```

**Fallback for Older Environments:**
- **Library:** `unicode-segmenter` (1.2KB)
- **Use:** Polyfill for browsers without native support

### UI Component Library

#### Recommended: Ant Design

**Library:** `antd` v5.x

**Rationale:**
- **Enterprise Ready:** Built for complex applications
- **Rich Component Set:** 50+ high-quality components
- **Data Visualization:** Excellent for linguistic data tables
- **TypeScript:** First-class TypeScript support
- **Customizable:** Theme system for branding
- **Internationalization:** Built-in i18n
- **Documentation:** Comprehensive docs

**Key Components for Linguistic App:**
- Table: Virtual scrolling, sortable, filterable
- Tree: Hierarchical data (morphology, categories)
- Form: Complex data entry with validation
- Drawer/Modal: Entry editing panels
- Tabs: Multiple view modes
- AutoComplete: Lexeme suggestions

**Alternative: shadcn/ui** (for more customization)
- Copy-paste component approach
- Full control over styling
- Built on Radix UI primitives
- Tailwind CSS based

### Rich Text Editing

#### Recommended: ProseMirror (via Tiptap)

**Library:** `@tiptap/react` v2.x (ProseMirror wrapper)

**Rationale:**
- **Battle-Tested:** Used by Notion, Atlassian, GitLab
- **Schema-Based:** Structured content model
- **Extensible:** Plugin architecture
- **Collaboration:** Real-time editing support
- **TypeScript:** Full type safety
- **CJK Support:** Proper IME handling
- **Complex Scripts:** Handles Unicode properly

**Use Cases:**
- Example sentence editing
- Definition/gloss editing
- Text corpus annotation
- Notes and comments

**Example:**
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

function ExampleEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // Custom extension for interlinear glosses
      InterlinearGloss
    ],
    content: '<p>Example sentence here</p>'
  });

  return <EditorContent editor={editor} />;
}
```

**Alternative:** Lexical (by Meta)
- Modern React-first architecture
- Excellent performance
- Growing ecosystem
- Good for new projects

### Schema Validation

#### Recommended: Zod

**Library:** `zod` v3.x

**Rationale:**
- **TypeScript-First:** Inferred static types
- **Runtime Safety:** Validates at runtime
- **Composable:** Build complex schemas
- **Error Messages:** Clear validation errors
- **Small Bundle:** ~12KB minified
- **Framework Agnostic:** Works everywhere

**Use Cases:**
- Data import validation
- API response validation
- Form validation
- Database schema enforcement
- IPC message validation

**Example:**
```typescript
import { z } from 'zod';

// Define schema
const EntrySchema = z.object({
  id: z.string().uuid(),
  lexeme: z.string().min(1),
  senses: z.array(z.object({
    gloss: z.string(),
    definition: z.string().optional(),
    partOfSpeech: z.enum(['noun', 'verb', 'adj', 'adv'])
  })),
  createdAt: z.date(),
  modifiedAt: z.date()
});

// Infer TypeScript type
type Entry = z.infer<typeof EntrySchema>;

// Validate data
const result = EntrySchema.safeParse(unknownData);
if (result.success) {
  const entry: Entry = result.data;
} else {
  console.error(result.error.issues);
}

// Use with forms
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

function EntryForm() {
  const form = useForm<Entry>({
    resolver: zodResolver(EntrySchema)
  });
}
```

### Internationalization

#### Recommended: react-i18next

**Library:** `react-i18next` v13.x + `i18next` v23.x

**Rationale:**
- **Most Popular:** Industry standard for React
- **Mature:** Stable and well-maintained
- **Features:** Pluralization, formatting, namespaces
- **TypeScript:** Type-safe translations
- **Lazy Loading:** Load only needed languages
- **Framework Agnostic:** Core i18next works anywhere

**Setup:**
```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          'entry.add': 'Add Entry',
          'entry.edit': 'Edit Entry',
          'entry.delete': 'Delete Entry'
        }
      },
      es: {
        translation: {
          'entry.add': 'Agregar Entrada',
          'entry.edit': 'Editar Entrada',
          'entry.delete': 'Eliminar Entrada'
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Usage in components
function EntryActions() {
  const { t } = useTranslation();
  return <button>{t('entry.add')}</button>;
}
```

### Build Tooling

#### Recommended: electron-vite

**Library:** `electron-vite` v2.x

**Rationale:**
- **Vite-Powered:** Lightning-fast HMR
- **Electron Optimized:** Handles multi-process architecture
- **TypeScript:** Full TS support out of box
- **Convention-Based:** Minimal configuration
- **Modern:** ESM, tree-shaking, code-splitting
- **DevTools:** Integrated debugging

**Project Structure:**
```
project/
├── src/
│   ├── main/           # Main process (Node.js)
│   ├── preload/        # Preload scripts (bridge)
│   └── renderer/       # Renderer (React app)
├── electron.vite.config.ts
└── package.json
```

**Configuration:**
```typescript
// electron.vite.config.ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom'],
            'antd': ['antd']
          }
        }
      }
    }
  }
});
```

### Type-Safe IPC

#### Recommended: electron-typescript-ipc

**Library:** `electron-typescript-ipc` v2.x

**Rationale:**
- **Type Safety:** Full TypeScript inference
- **Single Definition:** Define API once, use everywhere
- **Compile-Time Checks:** Catch errors before runtime
- **Simple API:** Minimal boilerplate

**Example:**
```typescript
// shared/ipc-api.ts
export interface IpcAPI {
  // Database operations
  'db:getEntries': (filter: EntryFilter) => Promise<Entry[]>;
  'db:saveEntry': (entry: Entry) => Promise<void>;
  'db:deleteEntry': (id: string) => Promise<void>;

  // File operations
  'file:open': () => Promise<string | null>;
  'file:save': (path: string, data: string) => Promise<void>;

  // Sync operations
  'sync:start': () => Promise<void>;
  'sync:status': () => Promise<SyncStatus>;
}

// preload.ts
import { createIpcRenderer } from 'electron-typescript-ipc';
import type { IpcAPI } from './shared/ipc-api';

const api = createIpcRenderer<IpcAPI>();
contextBridge.exposeInMainWorld('api', api);

// renderer (React)
// TypeScript knows all available methods and their signatures!
const entries = await window.api['db:getEntries']({ lexeme: 'test' });
```

### Testing Framework

#### E2E Testing: Playwright

**Library:** `@playwright/test` v1.x

**Rationale:**
- **Official Support:** Electron officially recommends it
- **Spectron Replacement:** Spectron is deprecated
- **Cross-Browser:** Test on multiple platforms
- **Auto-Wait:** Smart waiting for elements
- **Screenshots/Video:** Built-in debugging tools
- **CI/CD Ready:** GitHub Actions integration

**Example:**
```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('can create new entry', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Click "Add Entry" button
  await window.click('button:has-text("Add Entry")');

  // Fill form
  await window.fill('input[name="lexeme"]', 'test');
  await window.fill('input[name="gloss"]', 'a test');

  // Submit
  await window.click('button:has-text("Save")');

  // Verify
  await expect(window.locator('text=test')).toBeVisible();

  await app.close();
});
```

#### Unit Testing: Vitest

**Library:** `vitest` v1.x

**Rationale:**
- **Vite Native:** Same config as build tool
- **Fast:** Parallel execution, smart caching
- **Jest Compatible:** Easy migration
- **ESM First:** Modern module support
- **TypeScript:** Zero config for TS
- **UI:** Built-in test UI

#### Component Testing: React Testing Library

**Library:** `@testing-library/react` v14.x

**Rationale:**
- **Best Practices:** Tests user behavior, not implementation
- **Accessibility:** Encourages accessible components
- **Simple API:** Easy to learn and use
- **React Hooks:** Full support for modern React

### Performance Monitoring

#### Recommended: Sentry

**Library:** `@sentry/electron` v4.x

**Rationale:**
- **Electron Support:** Native Electron integration
- **Error Tracking:** Catch and report crashes
- **Performance:** Monitor app performance
- **Breadcrumbs:** Track user actions before error
- **Source Maps:** Debug minified code
- **Privacy:** On-premise option available

---

## 9. Electron IPC Architecture

### Pattern: Type-Safe Bridge Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Renderer Process                         │
│                        (React App)                            │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  window.api.invoke('db:getEntries', filter)            │  │
│  │         ↓                                               │  │
│  │  TypeScript validates at compile time                  │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────┘
                                │
                    contextBridge (Preload)
                                │
┌───────────────────────────────┴──────────────────────────────┐
│                       Main Process                            │
│                       (Node.js)                               │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ipcMain.handle('db:getEntries', async (_, filter) => │  │
│  │    const db = getDatabase();                           │  │
│  │    return db.query.entries.findMany({ where: filter });│  │
│  │  });                                                    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Security Best Practices

1. **Always use contextBridge** - Never expose entire modules
2. **Validate all inputs** - Use Zod for IPC message validation
3. **Principle of least privilege** - Only expose needed functionality
4. **No remote module** - Deprecated and insecure
5. **Content Security Policy** - Strict CSP headers

**Implementation:**
```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';

const EntryFilterSchema = z.object({
  lexeme: z.string().optional(),
  tag: z.string().optional()
});

contextBridge.exposeInMainWorld('api', {
  getEntries: async (filter: unknown) => {
    // Validate before sending to main
    const validated = EntryFilterSchema.parse(filter);
    return ipcRenderer.invoke('db:getEntries', validated);
  }
});
```

---

## 10. Development & Production Setup

### Development Environment

**Required:**
- Node.js 20+ LTS
- npm/pnpm/yarn
- VSCode (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense

### Package Scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  }
}
```

### Distribution

**Tool:** `electron-builder` v24.x

**Rationale:**
- **Multi-Platform:** Build for Windows, macOS, Linux
- **Auto-Update:** Built-in update framework
- **Code Signing:** Automated signing
- **Installers:** NSIS, DMG, AppImage, DEB, RPM
- **Compression:** 7zip for smaller packages

**Config:**
```javascript
// electron-builder.json
{
  "appId": "org.sil.fieldworks",
  "productName": "Fieldworks",
  "directories": {
    "output": "dist"
  },
  "files": [
    "out/**/*"
  ],
  "mac": {
    "category": "public.app-category.education",
    "target": ["dmg", "zip"]
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Education"
  }
}
```

---

## 11. Complete Dependency List

### Production Dependencies

```json
{
  "dependencies": {
    // Framework
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "electron": "^28.0.0",

    // State Management
    "zustand": "^4.4.7",
    "jotai": "^2.6.0",

    // Database
    "better-sqlite3": "^9.2.2",
    "drizzle-orm": "^0.29.1",
    "dexie": "^4.0.1",
    "dexie-react-hooks": "^1.1.7",

    // Data Validation
    "zod": "^3.22.4",

    // XML Processing
    "fast-xml-parser": "^4.3.2",

    // Sync & CRDT
    "@automerge/automerge": "^2.1.10",
    "@automerge/automerge-repo": "^1.0.0",

    // Version Control
    "isomorphic-git": "^1.25.0",

    // Export
    "docx": "^8.5.0",
    "pdfkit": "^0.14.0",
    "exceljs": "^4.4.0",

    // UI Components
    "antd": "^5.12.0",
    "@tiptap/react": "^2.1.13",
    "@tiptap/starter-kit": "^2.1.13",

    // Internationalization
    "i18next": "^23.7.11",
    "react-i18next": "^13.5.0",

    // Utilities
    "date-fns": "^3.0.6",
    "lodash-es": "^4.17.21",
    "nanoid": "^5.0.4"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    // Build Tools
    "electron-vite": "^2.0.0",
    "electron-builder": "^24.9.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",

    // TypeScript
    "typescript": "^5.3.3",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@types/better-sqlite3": "^7.6.8",
    "@types/pdfkit": "^0.13.4",

    // Testing
    "vitest": "^1.1.0",
    "@playwright/test": "^1.40.1",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",

    // Linting & Formatting
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "@typescript-eslint/parser": "^6.15.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",

    // Type-Safe IPC
    "electron-typescript-ipc": "^2.0.0",

    // Database Tools
    "drizzle-kit": "^0.20.9",

    // Error Tracking
    "@sentry/electron": "^4.17.0"
  }
}
```

---

## 12. Migration Strategy from Fieldworks

### Phase 1: Data Schema Mapping

1. **Analyze FWData XML structure**
   - Parse existing .fwdata files
   - Map XML elements to SQLite schema
   - Identify relationships and constraints

2. **Create migration scripts**
   - XML → SQLite converter
   - Validate data integrity
   - Handle edge cases

### Phase 2: Feature Parity

**Priority Features:**
1. Lexicon management (CRUD operations)
2. Text corpus (import, edit, export)
3. Interlinear glossing
4. Search and filtering
5. Data import/export

**Later Features:**
1. Morphological analysis
2. Reversal indexes
3. Dictionary publishing
4. Collaboration features

### Phase 3: Gradual Migration

1. **Coexistence period**
   - Run both systems
   - Import from Fieldworks
   - Export to Fieldworks format
   - Data validation

2. **User testing**
   - Beta program
   - Gather feedback
   - Iterate on UX

3. **Full migration**
   - Data archival
   - Training materials
   - Support documentation

---

## 13. Performance Targets

### Application Startup
- Cold start: < 2 seconds
- Warm start: < 1 second

### Data Operations
- Load 10,000 entries: < 500ms
- Search 50,000 entries: < 100ms
- Save entry: < 50ms
- Export 1,000 entries to DOCX: < 2s

### UI Responsiveness
- Input lag: < 16ms (60fps)
- List scrolling: Smooth at 60fps
- Search as you type: < 100ms

### Memory Usage
- Base memory: < 200MB
- With 10,000 entries: < 400MB
- Max memory: < 1GB

### Bundle Size
- Main process: < 10MB
- Renderer initial: < 2MB
- Renderer lazy chunks: < 500KB each

---

## 14. Security Considerations

1. **Data Encryption**
   - SQLite encryption: SQLCipher
   - File encryption: Node.js crypto
   - Keychain integration: keytar

2. **Network Security**
   - HTTPS only for sync
   - Certificate pinning
   - OAuth 2.0 for authentication

3. **Electron Security**
   - nodeIntegration: false
   - contextIsolation: true
   - sandbox: true
   - Content Security Policy

4. **Data Privacy**
   - No telemetry by default
   - Opt-in analytics
   - GDPR compliance
   - Local-first architecture

---

## 15. Accessibility

1. **Keyboard Navigation**
   - Full keyboard support
   - Custom shortcuts
   - Focus management

2. **Screen Readers**
   - ARIA labels
   - Semantic HTML
   - Alt text for images

3. **Internationalization**
   - RTL support
   - Unicode handling
   - Locale-aware formatting

---

## Conclusion

This architecture provides a robust, modern, and maintainable foundation for building a cross-platform Fieldworks clone. Key advantages:

✅ **Cross-Platform:** True write-once, run-anywhere with Electron
✅ **Modern Stack:** Latest JavaScript/TypeScript ecosystem
✅ **Type-Safe:** End-to-end TypeScript with runtime validation
✅ **Offline-First:** Full offline functionality with CRDT sync
✅ **Performant:** Optimized for large linguistic datasets
✅ **Maintainable:** Well-structured architecture with clear boundaries
✅ **Extensible:** Plugin architecture for future features
✅ **Well-Supported:** All dependencies actively maintained

### Next Steps

1. **Proof of Concept**
   - Set up electron-vite project
   - Implement basic entry CRUD
   - Test FWData import

2. **Prototype**
   - Build core lexicon editor
   - Implement search
   - Add export functionality

3. **Alpha Release**
   - Feature parity with basic Fieldworks
   - User testing
   - Performance optimization

4. **Beta Release**
   - Advanced features
   - Collaboration
   - Documentation

5. **Production**
   - Stable release
   - Migration tools
   - Support infrastructure

---

## References & Resources

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Automerge Documentation](https://automerge.org/docs)

### Community
- [Electron Discord](https://discord.gg/electron)
- [React Community](https://react.dev/community)
- [SIL Software](https://software.sil.org)

### Similar Projects
- [Notion](https://notion.so) - Offline-first document editor
- [Obsidian](https://obsidian.md) - Local-first knowledge base
- [VSCode](https://code.visualstudio.com) - Electron-based editor

---

*Document Version: 1.0*
*Last Updated: 2025-11-23*
*Authors: Architecture Team*
