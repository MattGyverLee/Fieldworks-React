# Documentation Index

## Overview

This repository contains a complete architectural design for a modern, cross-platform React/Electron clone of SIL FieldWorks. The architecture replaces Windows-specific and .NET dependencies with modern JavaScript/TypeScript libraries while maintaining compatibility with FieldWorks data formats.

## 📚 Documentation Files

### 1. **README.md** (15KB)
**Start here!** High-level overview of the entire project.

**Contents:**
- Project overview and key features
- Technology stack summary
- Quick start guide
- Architecture diagrams
- Performance targets
- Security features
- Migration strategy from original FieldWorks
- Comparison table: Original vs Modern

**Best for:** Getting an overall understanding of the project

---

### 2. **ARCHITECTURE.md** (42KB)
**Comprehensive technical architecture document.**

**Contents:**
1. **Modern Replacements for Windows Dependencies**
   - UI Framework (Windows Forms → Electron + React)
   - File System (Windows APIs → Node.js)
   - Configuration (Registry → electron-store)
   - Native Dialogs (Win32 → Electron dialog API)

2. **Modern Replacements for .NET/Mono Dependencies**
   - Runtime (C#/.NET → TypeScript/Node.js)
   - Data Model (LCModel → TypeScript classes + Zod)
   - ORM (Entity Framework → Drizzle ORM)

3. **React Component Architecture**
   - Feature-Sliced Design pattern
   - Folder structure
   - Component design principles
   - Performance optimizations

4. **State Management Solution**
   - Zustand for global state (1KB)
   - Jotai for fine-grained state (1.2KB)
   - Decision matrix and rationale

5. **Database/Storage Solution**
   - better-sqlite3 (primary database)
   - Dexie.js (renderer cache)
   - fast-xml-parser (FWData XML)
   - Database schema design
   - Migration strategy

6. **Export Functionality**
   - DOCX export (docx library)
   - PDF export (pdfkit)
   - Excel export (exceljs)
   - HTML export

7. **Offline-First Architecture**
   - Automerge CRDT sync
   - isomorphic-git for version control
   - Offline queue implementation
   - Conflict resolution

8. **Additional Libraries**
   - Unicode support (Intl.Segmenter)
   - UI components (Ant Design)
   - Rich text (Tiptap/ProseMirror)
   - Schema validation (Zod)
   - i18n (react-i18next)
   - Build tools (electron-vite)
   - Type-safe IPC
   - Testing (Playwright, Vitest)

9. **Development & Production Setup**
10. **Complete Dependency List**
11. **Migration Strategy**
12. **Performance Targets**
13. **Security Considerations**
14. **Accessibility**

**Best for:** Understanding technical decisions and library choices

---

### 3. **TECH_STACK.md** (11KB)
**Quick reference guide for all technologies.**

**Contents:**
- Summary tables of all libraries with versions, bundle sizes, rationale
- Comparison of rejected alternatives
- Installation commands
- Project structure
- Database schema examples
- TypeScript & Vite configuration
- Performance optimization settings
- Security checklist
- Bundle size targets
- Platform support
- License information
- VSCode extensions
- Learning resources

**Best for:** Quick lookups and decision references

---

### 4. **IMPLEMENTATION_GUIDE.md** (34KB)
**Step-by-step practical implementation guide.**

**Contents:**

**Section 1: Project Initialization**
- Creating the project
- Installing dependencies
- Rebuilding native modules
- Project structure setup

**Section 2: Database Setup**
- Defining schema with Drizzle ORM
- Creating database connection
- Setting up migrations
- Building database service with CRUD operations

**Section 3: IPC Communication**
- Defining shared types
- Creating type-safe IPC API
- Setting up IPC handlers in main process
- Configuring preload script
- Type safety implementation

**Section 4: State Management**
- Creating Zustand stores (project, UI)
- Creating Jotai atoms (entries, search, filters)
- Implementing derived state
- Async data fetching

**Section 5: Core Features**
- Entry list component
- Entry editor component
- Sense editor
- Form handling

**Section 6: FWData Import/Export**
- Import service with XML parsing
- Export service with XML building
- Batch processing
- Error handling

**Section 7: Offline Sync**
- Automerge setup
- Sync service implementation
- Bidirectional sync (DB ↔ CRDT)

**Section 8: Testing**
- Vitest setup for unit tests
- Unit test examples
- Playwright setup for E2E
- E2E test examples

**Best for:** Actually implementing the system

---

### 5. **ARCHITECTURE_DIAGRAM.md** (11KB)
**Visual architecture diagrams using Mermaid.**

**Diagrams Included:**

1. **High-Level System Architecture**
   - UI → Renderer → IPC → Main → Storage
   - Complete system overview

2. **Data Flow Architecture**
   - Sequence diagram showing entry creation flow
   - User → React → IPC → SQLite → Automerge

3. **State Management Architecture**
   - Component tree connections
   - Zustand stores
   - Jotai atoms and derivations

4. **Database Schema**
   - Entity-relationship diagram
   - Tables: entries, senses, examples, tags
   - Foreign key relationships

5. **Sync Architecture (Automerge CRDT)**
   - Multi-device offline editing
   - Conflict-free merge process

6. **FWData Import/Export Pipeline**
   - XML → SQLite flow
   - SQLite → XML flow

7. **Export Format Pipeline**
   - Database → DOCX/PDF/Excel/XML

8. **Component Architecture (Feature-Sliced)**
   - Layer hierarchy
   - Dependencies between layers

9. **Security Architecture**
   - Renderer (untrusted) → Preload → Main (trusted)
   - Security settings visualization

10. **Offline-First Architecture**
    - State machine diagram
    - Offline/online transitions

11. **Build & Distribution Pipeline**
    - Source → Build → Package → Distribute

12. **Testing Strategy**
    - Unit, component, integration, E2E tests

13. **Performance Optimization Strategy**
    - UI, state, data, build optimizations

**Best for:** Visual learners and presentations

---

### 6. **package.json.template** (5.4KB)
**Complete package.json with all dependencies and scripts.**

**Contents:**
- All production dependencies (exact versions)
- All development dependencies
- NPM scripts for dev, build, test, release
- Electron-builder configuration
  - Windows (NSIS, portable)
  - macOS (DMG, ZIP, universal)
  - Linux (AppImage, DEB, RPM)
- Auto-update configuration
- Engine requirements

**Best for:** Setting up your project quickly

---

## 🎯 Recommended Reading Order

### For Decision Makers
1. **README.md** - Understand the overall project
2. **ARCHITECTURE.md** - Sections 1-2 (Replacements)
3. **TECH_STACK.md** - Quick reference of choices

### For Architects
1. **README.md** - Overview
2. **ARCHITECTURE.md** - Complete read
3. **ARCHITECTURE_DIAGRAM.md** - Visual understanding
4. **TECH_STACK.md** - Technical details

### For Developers
1. **README.md** - Quick orientation
2. **IMPLEMENTATION_GUIDE.md** - Practical implementation
3. **TECH_STACK.md** - Quick references during coding
4. **ARCHITECTURE.md** - Deep dives as needed

### For First-Time Contributors
1. **README.md** - Start here
2. **IMPLEMENTATION_GUIDE.md** - Section 1 (Setup)
3. **TECH_STACK.md** - Understand the stack
4. **IMPLEMENTATION_GUIDE.md** - Continue implementation

---

## 📊 Key Statistics

### Documentation Size
- **Total Documentation:** ~118 KB
- **Code Examples:** 50+ complete examples
- **Diagrams:** 13 Mermaid diagrams
- **Libraries Covered:** 40+ libraries

### Coverage
- ✅ Complete architecture for all 7 requirements
- ✅ Specific library recommendations for every component
- ✅ Rationale for every major decision
- ✅ Code examples for all critical paths
- ✅ Testing strategy
- ✅ Security considerations
- ✅ Performance optimization
- ✅ Migration path from original FieldWorks

---

## 🔑 Key Decisions Summary

### Why This Stack?

1. **Electron + React**
   - True cross-platform (Windows, macOS, Linux)
   - Native-like performance
   - Web technologies everyone knows
   - Massive ecosystem

2. **TypeScript**
   - Type safety reduces bugs
   - Better tooling (autocomplete, refactoring)
   - Self-documenting code
   - Runtime validation with Zod

3. **better-sqlite3 over node-sqlite3**
   - 10-100x faster for Electron use case
   - Synchronous API (simpler code)
   - More reliable in production

4. **Zustand + Jotai over Redux**
   - 95% less boilerplate
   - Smaller bundles (1-3KB vs 15KB)
   - Easier to learn
   - Perfect for our team size

5. **Automerge for Sync**
   - Conflict-free merging
   - True offline-first
   - JSON data model fits our needs
   - Battle-tested in production

6. **Ant Design for UI**
   - Built for data-heavy applications
   - Enterprise-ready components
   - Excellent TypeScript support
   - Great documentation

7. **Vite for Build**
   - Lightning-fast HMR
   - Modern ESM support
   - Tree-shaking out of the box
   - electron-vite integration

---

## 🚀 Quick Start Checklist

- [ ] Read README.md (15 min)
- [ ] Skim ARCHITECTURE.md sections 1-7 (30 min)
- [ ] Review ARCHITECTURE_DIAGRAM.md (10 min)
- [ ] Follow IMPLEMENTATION_GUIDE.md Section 1 (30 min)
- [ ] Set up development environment
- [ ] Create first entry CRUD (2 hours)
- [ ] Implement FWData import (4 hours)
- [ ] Set up testing (2 hours)
- [ ] Build first prototype (40 hours)

**Total time to working prototype: ~1-2 weeks**

---

## 📖 Additional Resources

### Official Documentation
- [Electron](https://www.electronjs.org/docs)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Automerge](https://automerge.org/docs)
- [Zustand](https://zustand.docs.pmnd.rs)
- [Ant Design](https://ant.design/components/overview)

### Community
- [Electron Discord](https://discord.gg/electron)
- [React Community](https://react.dev/community)
- [TypeScript Discord](https://discord.gg/typescript)

### Related Projects
- [Original FieldWorks](https://software.sil.org/fieldworks/)
- [FieldWorks GitHub](https://github.com/sillsdev/liblcm)

---

## 🔍 Document Search Guide

**Looking for...**

| Topic | Document | Section |
|-------|----------|---------|
| Overall project info | README.md | All |
| Why these libraries? | ARCHITECTURE.md | Sections 1-8 |
| How to implement X? | IMPLEMENTATION_GUIDE.md | Corresponding section |
| What's the version of X? | TECH_STACK.md | Core Framework table |
| How does X work? | ARCHITECTURE_DIAGRAM.md | Find relevant diagram |
| Package.json setup | package.json.template | All |
| Database schema | IMPLEMENTATION_GUIDE.md | Section 2 |
| State management setup | IMPLEMENTATION_GUIDE.md | Section 4 |
| IPC setup | IMPLEMENTATION_GUIDE.md | Section 3 |
| Testing setup | IMPLEMENTATION_GUIDE.md | Section 8 |
| FWData import/export | IMPLEMENTATION_GUIDE.md | Section 6 |
| Sync setup | IMPLEMENTATION_GUIDE.md | Section 7 |
| Security info | ARCHITECTURE.md | Section 14 |
| Performance targets | ARCHITECTURE.md | Section 13 |
| Bundle sizes | TECH_STACK.md | Bundle size targets |

---

## ✨ What's Included

### Architecture Design ✅
- [x] Modern replacements for Windows dependencies
- [x] Modern replacements for .NET/Mono dependencies
- [x] React component architecture
- [x] State management solution
- [x] Database/storage solution
- [x] Export functionality architecture
- [x] Offline-first with sync

### Library Recommendations ✅
- [x] Linguistic data processing (TypeScript + Zod)
- [x] XML/database libraries (fast-xml-parser + better-sqlite3)
- [x] UI components (Ant Design)
- [x] State management (Zustand + Jotai)
- [x] Electron IPC (electron-typescript-ipc)
- [x] Local storage (SQLite + IndexedDB)
- [x] File export (docx, pdfkit, exceljs)
- [x] Version control (isomorphic-git)

### Implementation Guides ✅
- [x] Project setup
- [x] Database configuration
- [x] IPC setup
- [x] State management
- [x] Core features
- [x] Import/Export
- [x] Sync implementation
- [x] Testing

### Visual Documentation ✅
- [x] System architecture diagrams
- [x] Data flow diagrams
- [x] State management diagrams
- [x] Database schema
- [x] Security architecture

---

## 💡 Next Steps

1. **Review** all documentation (2-4 hours)
2. **Set up** development environment (1 hour)
3. **Implement** proof of concept (1 week)
4. **Test** with real FWData (2-3 days)
5. **Iterate** based on findings
6. **Build** full prototype (4-8 weeks)

---

## 📞 Support

For questions about:
- **Architecture decisions** → See ARCHITECTURE.md
- **Implementation details** → See IMPLEMENTATION_GUIDE.md
- **Library choices** → See TECH_STACK.md
- **Visual overview** → See ARCHITECTURE_DIAGRAM.md

---

**Total Documentation: 6 Files | ~118 KB | 100% Coverage**

*Created: 2025-11-23*
*Status: Complete and Ready for Implementation* ✅
