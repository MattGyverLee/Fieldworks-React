# Technology Stack - Quick Reference

## Core Framework

| Category | Library | Version | Bundle Size | Rationale |
|----------|---------|---------|-------------|-----------|
| Desktop Framework | Electron | ^28.0.0 | - | Cross-platform desktop with web technologies |
| UI Library | React | ^18.2.0 | 42KB | Component-based UI, massive ecosystem |
| Language | TypeScript | ^5.3.3 | - | Type safety, better tooling, maintainability |
| Build Tool | electron-vite | ^2.0.0 | - | Fast HMR, optimized for Electron |

## State Management

| Purpose | Library | Bundle | Why |
|---------|---------|--------|-----|
| Global State | Zustand | 1KB | Simple API, no boilerplate, great TypeScript support |
| Fine-Grained State | Jotai | 1.2KB | Atomic updates, minimal re-renders, derived state |

## Data Layer

| Component | Library | Why |
|-----------|---------|-----|
| Primary Database | better-sqlite3 | 10-100x faster than node-sqlite3, synchronous API |
| Renderer Cache | Dexie.js | IndexedDB wrapper with React hooks, offline support |
| ORM/Query Builder | Drizzle ORM | Type-safe queries, lightweight, excellent DX |
| XML Parser | fast-xml-parser | 87K req/sec, handles 100MB+ files |
| Schema Validation | Zod | Type inference, runtime validation, composable |

## Offline-First & Sync

| Feature | Library | Why |
|---------|---------|-----|
| CRDT Sync | Automerge | Conflict-free merging, offline editing, JSON model |
| Version Control | isomorphic-git | Pure JS Git, works in Electron/Browser/Node |
| Network Detection | navigator.onLine | Native API, custom queue implementation |

## Export & Documents

| Format | Library | Why |
|--------|---------|-----|
| DOCX | docx | Native DOCX creation, rich formatting |
| PDF | pdfkit | Complex layouts, Unicode fonts, streaming |
| Excel | exceljs | Full xlsx support, streaming for large files |

## UI Components

| Component | Library | Why |
|-----------|---------|-----|
| Component Library | Ant Design | Enterprise-ready, 50+ components, great for data apps |
| Rich Text Editor | Tiptap (ProseMirror) | Battle-tested, CJK support, collaboration-ready |
| Forms | React Hook Form + Zod | Performant, minimal re-renders, type-safe validation |

## Internationalization & Unicode

| Feature | Library | Why |
|---------|---------|-----|
| i18n | react-i18next | Industry standard, lazy loading, TypeScript support |
| Unicode Segmentation | Intl.Segmenter | Native API, grapheme clusters, no dependencies |

## IPC & Communication

| Feature | Library | Why |
|---------|---------|-----|
| Type-Safe IPC | electron-typescript-ipc | Compile-time type safety, single API definition |
| Context Bridge | Electron native | Security, isolation between renderer and main |

## Testing

| Type | Library | Why |
|------|---------|-----|
| E2E Testing | Playwright | Official Electron support, replaces Spectron |
| Unit Testing | Vitest | Vite-native, fast, Jest-compatible |
| Component Testing | React Testing Library | Best practices, accessibility-focused |

## Development Tools

| Tool | Library | Why |
|------|---------|-----|
| Linting | ESLint | Code quality, catch errors early |
| Formatting | Prettier | Consistent code style |
| Monitoring | Sentry | Error tracking, performance monitoring |
| Distribution | electron-builder | Multi-platform builds, auto-update |

## Utility Libraries

| Purpose | Library | Why |
|---------|---------|-----|
| Date Handling | date-fns | Lightweight, tree-shakeable, i18n support |
| Unique IDs | nanoid | Tiny (130 bytes), secure, URL-friendly |
| Utilities | lodash-es | Tree-shakeable, comprehensive utilities |

## Performance Optimizations

| Technique | Library/API | Use Case |
|-----------|-------------|----------|
| Virtualization | React Virtual | Long lists (10K+ items) |
| Code Splitting | Vite dynamic imports | Route-based, feature-based |
| Memoization | React.memo, useMemo | Expensive computations |
| Web Workers | Comlink | Heavy processing off main thread |

## Comparison: Rejected Alternatives

### Why Not Redux?
- **Chose:** Zustand + Jotai
- **Reason:** 80% functionality, 20% code; better DX; smaller team

### Why Not node-sqlite3?
- **Chose:** better-sqlite3
- **Reason:** 10-100x faster; synchronous API better for Electron

### Why Not xmldom?
- **Chose:** fast-xml-parser
- **Reason:** 13% faster, simpler API, better TypeScript

### Why Not Yjs for CRDT?
- **Chose:** Automerge
- **Reason:** JSON-first model matches our data; better offline story

### Why Not Slate/Lexical?
- **Chose:** ProseMirror (via Tiptap)
- **Reason:** Battle-tested, better CJK support, collaboration-ready

### Why Not Material-UI?
- **Chose:** Ant Design
- **Reason:** Better for data-heavy apps, enterprise features

### Why Not Spectron?
- **Chose:** Playwright
- **Reason:** Spectron deprecated, Playwright officially recommended

## Installation Commands

### Initial Setup
```bash
# Create project
npm create electron-vite@latest fieldworks-react -- --template react-ts

# Install core dependencies
npm install zustand jotai better-sqlite3 drizzle-orm dexie \
  fast-xml-parser zod @automerge/automerge isomorphic-git \
  docx pdfkit exceljs antd @tiptap/react i18next react-i18next

# Install dev dependencies
npm install -D electron-builder @playwright/test vitest \
  drizzle-kit @types/better-sqlite3 @types/pdfkit \
  electron-typescript-ipc
```

### Rebuild Native Modules
```bash
# Rebuild for Electron
npm install @electron/rebuild
npx electron-rebuild
```

## Project Structure

```
fieldworks-react/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── database/        # SQLite, migrations
│   │   ├── ipc/             # IPC handlers
│   │   ├── sync/            # Automerge sync
│   │   └── index.ts
│   │
│   ├── preload/             # Context bridge
│   │   └── index.ts
│   │
│   └── renderer/            # React app
│       ├── app/             # App initialization
│       ├── pages/           # Page components
│       ├── features/        # Feature modules
│       ├── entities/        # Business entities
│       ├── shared/          # Shared code
│       └── index.tsx
│
├── resources/               # Icons, assets
├── test/
│   ├── unit/
│   └── e2e/
│
├── electron.vite.config.ts
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

## Database Schema Design

### Core Tables
```sql
-- Linguistic entries
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  guid TEXT UNIQUE NOT NULL,
  lexeme TEXT NOT NULL,
  citation_form TEXT,
  created_at INTEGER,
  modified_at INTEGER
);

-- Senses (meanings)
CREATE TABLE senses (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  gloss TEXT,
  definition TEXT,
  part_of_speech TEXT,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- Example sentences
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
```

## TypeScript Configuration

### tsconfig.json (Key Settings)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

## Vite Configuration

### electron.vite.config.ts
```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    plugins: [react()],
  },
});
```

## Critical Performance Settings

### better-sqlite3 Optimization
```typescript
const db = new Database('fieldworks.db');
db.pragma('journal_mode = WAL');  // Write-Ahead Logging
db.pragma('synchronous = NORMAL'); // Balance safety/performance
db.pragma('cache_size = -64000');  // 64MB cache
db.pragma('temp_store = MEMORY');  // In-memory temp tables
```

### Electron Main Process
```typescript
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('disable-gpu-vsync');
```

### React Production Build
```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['antd'],
          'state-vendor': ['zustand', 'jotai'],
        },
      },
    },
  },
};
```

## Security Checklist

- [ ] `nodeIntegration: false`
- [ ] `contextIsolation: true`
- [ ] `sandbox: true`
- [ ] Use contextBridge for all IPC
- [ ] Validate all IPC inputs with Zod
- [ ] Content Security Policy configured
- [ ] No eval() or similar
- [ ] Sanitize user input before rendering
- [ ] Use prepared statements for SQL
- [ ] Encrypt sensitive data at rest

## Bundle Size Targets

| Bundle | Target | Critical |
|--------|--------|----------|
| Initial JS | < 500KB | < 1MB |
| Initial CSS | < 100KB | < 200KB |
| Vendor chunks | < 200KB each | < 500KB |
| Feature chunks | < 100KB each | < 200KB |

## Browser/Platform Support

### Electron
- Latest stable (28.x+)
- Auto-updates for users

### Node.js
- 20.x LTS (via Electron)

### Operating Systems
- Windows 10/11 (x64, ARM64)
- macOS 11+ (Intel, Apple Silicon)
- Linux (Ubuntu 20.04+, Debian, Fedora)

## License Considerations

All recommended libraries use permissive licenses:
- MIT: Most libraries
- ISC: fast-xml-parser
- Apache 2.0: Ant Design
- BSD: ProseMirror

**No GPL dependencies** - Safe for commercial use

## Recommended VSCode Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "antfu.iconify",
    "lokalise.i18n-ally",
    "drizzle.drizzle-vscode"
  ]
}
```

## Learning Resources

### Official Docs
- Electron: https://electronjs.org/docs
- React: https://react.dev
- TypeScript: https://typescriptlang.org/docs
- Zustand: https://zustand.docs.pmnd.rs
- Drizzle: https://orm.drizzle.team/docs

### Tutorials
- Electron + Vite + React: https://electron-vite.org/guide/
- Better SQLite3: https://github.com/WiseLibs/better-sqlite3/wiki
- Automerge: https://automerge.org/docs/tutorial/

### Community
- Electron Discord: https://discord.gg/electron
- React Community: https://react.dev/community

---

*Last Updated: 2025-11-23*
