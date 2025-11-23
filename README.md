# Fieldworks React/Electron Clone

A modern, cross-platform reimplementation of SIL FieldWorks using React, Electron, and TypeScript.

## Overview

This project provides a complete architecture for building a linguistic data management application that replaces Windows/.NET dependencies with modern JavaScript/TypeScript libraries while maintaining compatibility with FieldWorks data formats.

## Key Features

- ✅ **Cross-Platform:** Windows, macOS, Linux
- ✅ **Offline-First:** Full offline functionality with CRDT sync
- ✅ **Type-Safe:** End-to-end TypeScript
- ✅ **Modern UI:** React with Ant Design
- ✅ **Fast Database:** Better-SQLite3 with Drizzle ORM
- ✅ **FWData Compatible:** Import/export .fwdata files
- ✅ **Version Control:** Git integration via isomorphic-git
- ✅ **Rich Exports:** DOCX, PDF, Excel support

## Architecture Stack

### Core Framework
- **Electron 28** - Cross-platform desktop
- **React 18** - Component-based UI
- **TypeScript 5** - Type safety
- **Vite** - Lightning-fast build tool

### State Management
- **Zustand** - Global state (1KB)
- **Jotai** - Fine-grained state (1.2KB)

### Data Layer
- **better-sqlite3** - Primary database (10-100x faster)
- **Drizzle ORM** - Type-safe queries
- **Dexie.js** - IndexedDB cache for renderer
- **fast-xml-parser** - FWData XML handling
- **Zod** - Runtime validation

### Sync & Offline
- **Automerge** - CRDT-based conflict-free sync
- **isomorphic-git** - Pure JS Git implementation
- **Custom queue** - Offline operation queue

### Export
- **docx** - Native DOCX generation
- **pdfkit** - PDF creation with Unicode fonts
- **exceljs** - Excel spreadsheets

### UI Components
- **Ant Design** - Enterprise component library
- **Tiptap/ProseMirror** - Rich text editing
- **React Hook Form** - Performant forms

### Testing
- **Playwright** - E2E testing (official Electron support)
- **Vitest** - Fast unit testing
- **React Testing Library** - Component testing

## Project Structure

```
fieldworks-react/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── database/      # SQLite setup, schema, services
│   │   ├── ipc/           # IPC handlers
│   │   ├── sync/          # Automerge sync logic
│   │   ├── services/      # FWData import/export
│   │   └── index.ts       # Main entry point
│   │
│   ├── preload/           # Context bridge (security)
│   │   └── index.ts       # IPC API exposure
│   │
│   ├── renderer/          # React application
│   │   ├── app/           # App initialization, providers
│   │   ├── pages/         # Page-level components
│   │   ├── features/      # Feature modules (lexicon, texts, etc.)
│   │   ├── entities/      # Business entities
│   │   └── shared/        # Shared utilities, components
│   │
│   └── shared/            # Code shared between processes
│       ├── types/         # TypeScript types
│       └── schemas/       # Zod schemas
│
├── resources/             # Icons, assets
├── test/
│   ├── unit/              # Vitest unit tests
│   └── e2e/               # Playwright E2E tests
│
├── migrations/            # Drizzle database migrations
├── ARCHITECTURE.md        # Detailed architecture documentation
├── TECH_STACK.md         # Technology stack quick reference
├── IMPLEMENTATION_GUIDE.md # Step-by-step implementation guide
└── package.json
```

## Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm/pnpm/yarn

### Installation

```bash
# Create project
npm create electron-vite@latest fieldworks-react -- --template react-ts
cd fieldworks-react

# Install dependencies
npm install zustand jotai better-sqlite3 drizzle-orm dexie \
  fast-xml-parser zod @automerge/automerge isomorphic-git \
  docx pdfkit exceljs antd @tiptap/react i18next react-i18next

# Install dev dependencies
npm install -D electron-builder @playwright/test vitest \
  drizzle-kit @types/better-sqlite3 @types/pdfkit

# Rebuild native modules for Electron
npx electron-rebuild
```

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm test              # Unit tests
npm run test:e2e      # E2E tests

# Build for production
npm run build

# Build distributables
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive architecture design document
  - Modern replacements for Windows-specific dependencies
  - Modern replacements for .NET/Mono dependencies
  - React component architecture
  - State management solution
  - Database/storage solution for FWData
  - Export functionality architecture
  - Offline-first architecture with sync
  - Complete library recommendations with rationale

- **[TECH_STACK.md](./TECH_STACK.md)** - Quick reference for all technologies
  - Library comparison tables
  - Bundle sizes and performance metrics
  - Configuration examples
  - Installation commands

- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation
  - Project initialization
  - Database setup with Drizzle
  - Type-safe IPC communication
  - State management implementation
  - Core feature development
  - FWData import/export
  - Offline sync with Automerge
  - Testing setup

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        User Interface                          │
│                     (React + Ant Design)                       │
└────────────────────────────────┬───────────────────────────────┘
                                 │
┌────────────────────────────────┼───────────────────────────────┐
│                     Renderer Process                           │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Zustand   │  │    Jotai     │  │  Dexie (IndexedDB)   │  │
│  │ (Global UI) │  │ (Component)  │  │    (Local Cache)     │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│                    ↕ IPC (Type-Safe Bridge)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼───────────────────────────────┐
│                       Main Process                             │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  better-sqlite3  │  │   Automerge     │  │    File I/O   │  │
│  │ + Drizzle ORM    │  │  (CRDT Sync)    │  │  (FWData XML) │  │
│  └──────────────────┘  └─────────────────┘  └──────────────┘  │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  isomorphic-git  │  │  Export (DOCX,  │  │   Electron    │  │
│  │  (Version Ctrl)  │  │   PDF, Excel)   │  │     APIs      │  │
│  └──────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │                         │
              ┌─────▼──────┐          ┌──────▼──────┐
              │ File System│          │   Network   │
              │ (SQLite DB)│          │ (Git Sync)  │
              └────────────┘          └─────────────┘
```

## Data Flow

### Entry Creation Flow
```
1. User clicks "New Entry" → React Component
2. Form submission → React Hook Form + Zod validation
3. IPC call → window.api['entry:create'](data)
4. Preload → contextBridge → Main Process
5. Main Process → DatabaseService.createEntry()
6. SQLite → Insert with better-sqlite3
7. Automerge → Update CRDT document
8. Response → Return to renderer
9. Jotai atom update → UI re-renders
```

### FWData Import Flow
```
1. User selects .fwdata file → Electron dialog
2. Main Process → FWDataImporter.importFile()
3. Parse XML → fast-xml-parser
4. Batch insert → SQLite (100 entries at a time)
5. Progress updates → IPC events to renderer
6. Completion → Refresh UI state
```

### Offline Sync Flow
```
1. Edit entry (offline) → Update Automerge document
2. CRDT changes stored → Local file system
3. Network available → Detect via navigator.onLine
4. Sync queue processes → Background sync
5. Automerge sync protocol → Conflict-free merge
6. Update SQLite → Apply merged changes
7. Update UI → Reflect synced state
```

## Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| Cold start | < 2s | < 3s |
| Warm start | < 1s | < 2s |
| Load 10K entries | < 500ms | < 1s |
| Search 50K entries | < 100ms | < 200ms |
| Save entry | < 50ms | < 100ms |
| Export 1K to DOCX | < 2s | < 5s |
| Memory (base) | < 200MB | < 400MB |
| Memory (10K entries) | < 400MB | < 800MB |

## Security Features

- ✅ **Context Isolation:** Renderer can't access Node.js directly
- ✅ **No nodeIntegration:** Disabled in all windows
- ✅ **Sandboxing:** Renderer runs in sandbox
- ✅ **Input Validation:** Zod validates all IPC messages
- ✅ **CSP:** Content Security Policy configured
- ✅ **No eval():** No dynamic code execution
- ✅ **SQL Injection Protection:** Prepared statements via Drizzle
- ✅ **Data Encryption:** Optional SQLCipher for sensitive data

## Browser/Platform Support

### Electron
- Latest stable (28.x+)
- Auto-updates enabled

### Operating Systems
- ✅ Windows 10/11 (x64, ARM64)
- ✅ macOS 11+ (Intel, Apple Silicon)
- ✅ Linux (Ubuntu 20.04+, Debian, Fedora, Arch)

### Node.js
- Node.js 20.x LTS (bundled with Electron)

## License Compliance

All dependencies use permissive licenses:
- **MIT:** Most libraries
- **ISC:** fast-xml-parser
- **Apache 2.0:** Ant Design
- **BSD:** ProseMirror

**No GPL dependencies** - Safe for commercial use

## Migration from FieldWorks

### Phase 1: Data Import
1. Export your FieldWorks project as .fwdata
2. Import into this application
3. Verify data integrity
4. Run both systems in parallel

### Phase 2: Feature Testing
1. Test core workflows (lexicon editing, glossing)
2. Compare exports with original FieldWorks
3. Validate data accuracy
4. Train team on new interface

### Phase 3: Full Migration
1. Archive FieldWorks data
2. Switch to new system
3. Monitor for issues
4. Provide user support

## Contributing

See IMPLEMENTATION_GUIDE.md for development setup.

## Resources

### Official Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Automerge Docs](https://automerge.org/docs)

### Community
- [Electron Discord](https://discord.gg/electron)
- [React Community](https://react.dev/community)
- [SIL Software](https://software.sil.org)

## Comparison: Original vs Modern

| Aspect | Original FieldWorks | Modern Architecture |
|--------|---------------------|---------------------|
| **Language** | C# / .NET Framework | TypeScript |
| **UI Framework** | Windows Forms | React + Electron |
| **Platforms** | Windows (+ Mono/Linux) | Windows, macOS, Linux |
| **Database** | SQL Server / SQLite | better-sqlite3 |
| **State** | .NET Events | Zustand + Jotai |
| **Sync** | Custom solution | Automerge CRDT |
| **Build** | MSBuild | Vite |
| **Testing** | NUnit | Vitest + Playwright |
| **Package** | InstallShield | electron-builder |
| **Dependencies** | NuGet | npm |

## Why This Stack?

### Performance
- **10-100x faster** database operations (better-sqlite3)
- **87K req/sec** XML parsing (fast-xml-parser)
- **< 1KB bundles** for state management (Zustand)
- **Instant HMR** during development (Vite)

### Developer Experience
- **Type-safe** end-to-end with TypeScript
- **Auto-completion** for all APIs
- **Hot reload** for instant feedback
- **Rich ecosystem** with npm

### Maintainability
- **Active communities** for all libraries
- **Regular updates** and security patches
- **Clear separation** of concerns
- **Well-documented** patterns

### Future-Proof
- **Web standards** based (HTML/CSS/JS)
- **Modern patterns** (hooks, CRDT, offline-first)
- **Cross-platform** by default
- **Easy to extend** with plugins

## Support

For questions or issues:
1. Check the documentation files
2. Review implementation examples
3. Search for similar issues
4. Create a detailed bug report

---

**Status:** Architecture Complete ✅
**Last Updated:** 2025-11-23
**Version:** 1.0.0

**Ready to build!** Follow the IMPLEMENTATION_GUIDE.md to get started.
