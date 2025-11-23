# System Architecture Diagrams

## High-Level System Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[React Components<br/>Ant Design]
    end

    subgraph "Renderer Process"
        UI --> SM[State Management]
        SM --> ZS[Zustand<br/>Global State]
        SM --> JT[Jotai<br/>Atomic State]
        SM --> DX[Dexie.js<br/>IndexedDB Cache]
    end

    subgraph "IPC Bridge"
        SM <--> IPC[Type-Safe IPC<br/>electron-typescript-ipc]
    end

    subgraph "Main Process"
        IPC <--> SVC[Services Layer]

        SVC --> DB[DatabaseService<br/>better-sqlite3]
        SVC --> SYNC[SyncService<br/>Automerge]
        SVC --> FILE[FileService<br/>Import/Export]
        SVC --> GIT[GitService<br/>isomorphic-git]

        DB --> SQL[(SQLite Database)]
        SYNC --> FS1[File System<br/>Automerge Storage]
        FILE --> XML[XML Parser<br/>fast-xml-parser]
        FILE --> EXP[Export<br/>DOCX/PDF/Excel]
        GIT --> FS2[Git Repository]
    end

    subgraph "External"
        SYNC <-.-> NET[Network Sync<br/>WebSocket/WebRTC]
        GIT <-.-> REMOTE[Remote Git Server<br/>GitHub/GitLab]
    end

    style UI fill:#4CAF50
    style SM fill:#2196F3
    style IPC fill:#FF9800
    style SVC fill:#9C27B0
    style SQL fill:#F44336
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant React
    participant Zustand
    participant IPC
    participant Main
    participant SQLite
    participant Automerge

    User->>React: Create Entry
    React->>Zustand: Update UI State
    React->>IPC: invoke('entry:create', data)
    IPC->>Main: Handle Request
    Main->>SQLite: INSERT entry
    SQLite-->>Main: Entry Created
    Main->>Automerge: Update CRDT Document
    Automerge-->>Main: Document Updated
    Main-->>IPC: Return Result
    IPC-->>React: Update Complete
    React->>Zustand: Sync State
    Zustand-->>User: UI Updates
```

## State Management Architecture

```mermaid
graph LR
    subgraph "Component Tree"
        C1[Entry List]
        C2[Entry Editor]
        C3[Sense Editor]
        C4[Search Bar]
    end

    subgraph "Zustand Stores"
        PS[Project Store]
        US[UI Store]
        DS[Data Store]
    end

    subgraph "Jotai Atoms"
        EA[entries Atom]
        SA[search Atom]
        FA[filtered Atom]
        SEA[selected Atom]
    end

    C1 --> FA
    C2 --> SEA
    C3 --> SEA
    C4 --> SA

    FA --> EA
    FA --> SA
    SEA --> EA

    C1 --> US
    C2 --> PS
    C4 --> DS

    style PS fill:#FFB74D
    style US fill:#4DD0E1
    style DS fill:#AED581
    style EA fill:#BA68C8
    style FA fill:#BA68C8
```

## Database Schema

```mermaid
erDiagram
    ENTRIES ||--o{ SENSES : has
    SENSES ||--o{ EXAMPLES : contains
    ENTRIES ||--o{ ENTRY_TAGS : has
    TAGS ||--o{ ENTRY_TAGS : assigned_to

    ENTRIES {
        text id PK
        text guid UK
        text lexeme
        text citation_form
        integer created_at
        integer modified_at
        boolean is_deleted
    }

    SENSES {
        text id PK
        text entry_id FK
        text gloss
        text definition
        text part_of_speech
        integer order
    }

    EXAMPLES {
        text id PK
        text sense_id FK
        text content
        text translation
        text reference
        integer order
    }

    TAGS {
        text id PK
        text name UK
        text color
    }

    ENTRY_TAGS {
        text entry_id FK
        text tag_id FK
    }
```

## Sync Architecture (Automerge CRDT)

```mermaid
graph TB
    subgraph "Device A"
        A1[Edit Entry<br/>Offline]
        A2[Automerge Doc A]
        A1 --> A2
    end

    subgraph "Device B"
        B1[Edit Same Entry<br/>Offline]
        B2[Automerge Doc B]
        B1 --> B2
    end

    subgraph "Sync Layer"
        A2 <--> SYNC[Automerge Sync Protocol]
        B2 <--> SYNC
    end

    subgraph "Merged State"
        SYNC --> MERGE[Conflict-Free Merge]
        MERGE --> FINAL[Final Document State]
    end

    FINAL --> A2
    FINAL --> B2

    style A2 fill:#81C784
    style B2 fill:#64B5F6
    style MERGE fill:#FFD54F
    style FINAL fill:#E57373
```

## FWData Import/Export Pipeline

```mermaid
flowchart LR
    subgraph "Import"
        FW1[.fwdata File] --> XML1[XML Parser]
        XML1 --> VAL1[Validate]
        VAL1 --> TRANS1[Transform]
        TRANS1 --> DB1[(SQLite)]
        TRANS1 --> AM1[Automerge]
    end

    subgraph "Export"
        DB2[(SQLite)] --> QUERY[Query Data]
        AM2[Automerge] --> QUERY
        QUERY --> TRANS2[Transform]
        TRANS2 --> BUILD[XML Builder]
        BUILD --> FW2[.fwdata File]
    end

    style FW1 fill:#FFAB91
    style FW2 fill:#FFAB91
    style DB1 fill:#A5D6A7
    style DB2 fill:#A5D6A7
```

## Export Format Pipeline

```mermaid
graph TB
    DB[(SQLite Database)] --> QRY[Query Entries]

    QRY --> DOCX[DOCX Generator<br/>docx library]
    QRY --> PDF[PDF Generator<br/>pdfkit]
    QRY --> XLS[Excel Generator<br/>exceljs]
    QRY --> XML[XML Generator<br/>fast-xml-parser]

    DOCX --> FILE1[.docx File]
    PDF --> FILE2[.pdf File]
    XLS --> FILE3[.xlsx File]
    XML --> FILE4[.fwdata File]

    style DB fill:#F48FB1
    style DOCX fill:#80CBC4
    style PDF fill:#80CBC4
    style XLS fill:#80CBC4
    style XML fill:#80CBC4
```

## Component Architecture (Feature-Sliced Design)

```mermaid
graph TB
    subgraph "App Layer"
        APP[App.tsx]
        PROV[Providers]
        ROUTES[Routes]
    end

    subgraph "Pages Layer"
        LEX[Lexicon Page]
        TXT[Texts Page]
        GRAM[Grammar Page]
        SET[Settings Page]
    end

    subgraph "Widgets Layer"
        ED[Entry Editor]
        SE[Sense Editor]
        GL[Glossing Tool]
    end

    subgraph "Features Layer"
        ENT[Entry Management]
        SRCH[Search]
        TAG[Tagging]
    end

    subgraph "Entities Layer"
        E[Entry Entity]
        S[Sense Entity]
        X[Example Entity]
    end

    subgraph "Shared Layer"
        UI[UI Components]
        LIB[Utilities]
        API[API Client]
    end

    APP --> PROV
    APP --> ROUTES
    ROUTES --> LEX
    ROUTES --> TXT

    LEX --> ED
    ED --> ENT
    ED --> SE

    ENT --> E
    ENT --> S
    SE --> X

    ENT --> API
    SRCH --> API

    ED --> UI
    SE --> UI

    style APP fill:#E1BEE7
    style LEX fill:#BBDEFB
    style ED fill:#C5E1A5
    style ENT fill:#FFE082
    style E fill:#FFCCBC
    style UI fill:#F8BBD0
```

## Security Architecture

```mermaid
graph TB
    subgraph "Renderer Process (Untrusted)"
        WEB[Web Content<br/>React App]
        CSP[Content Security Policy]
        WEB --> CSP
    end

    subgraph "Preload Script (Bridge)"
        CB[contextBridge]
        VAL[Input Validation<br/>Zod Schemas]
        CB --> VAL
    end

    subgraph "Main Process (Trusted)"
        IPC[IPC Handlers]
        PRIV[Privileged APIs]
        FS[File System]
        NET[Network]

        IPC --> PRIV
        PRIV --> FS
        PRIV --> NET
    end

    CSP --> CB
    VAL --> IPC

    subgraph "Security Settings"
        NODE[nodeIntegration: false]
        CTX[contextIsolation: true]
        SAND[sandbox: true]
    end

    style CSP fill:#EF9A9A
    style VAL fill:#FFCC80
    style NODE fill:#A5D6A7
    style CTX fill:#A5D6A7
    style SAND fill:#A5D6A7
```

## Offline-First Architecture

```mermaid
stateDiagram-v2
    [*] --> Offline
    Offline --> CheckNetwork: Network Available
    CheckNetwork --> Online: Connected
    Online --> Offline: Network Lost

    state Offline {
        [*] --> LocalEdit
        LocalEdit --> QueueSync
        QueueSync --> StoreCRDT
        StoreCRDT --> UpdateUI
    }

    state Online {
        [*] --> ProcessQueue
        ProcessQueue --> SyncCRDT
        SyncCRDT --> MergeChanges
        MergeChanges --> UpdateDB
        UpdateDB --> NotifyUI
    }
```

## Build & Distribution Pipeline

```mermaid
flowchart LR
    subgraph "Development"
        SRC[Source Code<br/>TypeScript]
        VITE[Vite Build]
        SRC --> VITE
    end

    subgraph "Compilation"
        VITE --> MAIN[Main Process<br/>Bundle]
        VITE --> REND[Renderer<br/>Bundle]
        VITE --> LOAD[Preload<br/>Bundle]
    end

    subgraph "Packaging"
        MAIN --> EB[electron-builder]
        REND --> EB
        LOAD --> EB

        EB --> WIN[Windows<br/>.exe/.msi]
        EB --> MAC[macOS<br/>.dmg/.zip]
        EB --> LIN[Linux<br/>.AppImage/.deb]
    end

    subgraph "Distribution"
        WIN --> GH[GitHub Releases]
        MAC --> GH
        LIN --> GH

        GH --> AUTO[Auto-Update<br/>Server]
    end

    style SRC fill:#B39DDB
    style VITE fill:#4DD0E1
    style EB fill:#FFB74D
    style GH fill:#81C784
```

## Testing Strategy

```mermaid
graph TB
    subgraph "Unit Tests (Vitest)"
        UT1[Database Service Tests]
        UT2[Utility Function Tests]
        UT3[Business Logic Tests]
    end

    subgraph "Component Tests (RTL)"
        CT1[Entry List Tests]
        CT2[Editor Tests]
        CT3[Form Tests]
    end

    subgraph "Integration Tests"
        IT1[IPC Communication Tests]
        IT2[Sync Logic Tests]
        IT3[Import/Export Tests]
    end

    subgraph "E2E Tests (Playwright)"
        E2E1[Create Entry Flow]
        E2E2[Search Flow]
        E2E3[Export Flow]
    end

    CODE[Source Code] --> UT1
    CODE --> UT2
    CODE --> UT3

    COMP[Components] --> CT1
    COMP --> CT2
    COMP --> CT3

    SYS[System] --> IT1
    SYS --> IT2
    SYS --> IT3

    APP[Full App] --> E2E1
    APP --> E2E2
    APP --> E2E3

    style UT1 fill:#C5E1A5
    style CT1 fill:#80DEEA
    style IT1 fill:#FFAB91
    style E2E1 fill:#CE93D8
```

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "UI Layer"
        VIRT[Virtualization<br/>React Virtual]
        MEMO[Memoization<br/>React.memo]
        LAZY[Code Splitting<br/>React.lazy]
    end

    subgraph "State Layer"
        ATOM[Atomic Updates<br/>Jotai]
        SEL[Selective Subscriptions<br/>Zustand]
    end

    subgraph "Data Layer"
        IDX[Database Indexes]
        CACHE[Query Caching]
        BATCH[Batch Operations]
    end

    subgraph "Build Layer"
        TREE[Tree Shaking]
        MIN[Minification]
        CHUNK[Code Chunks]
    end

    VIRT --> FAST[Fast Rendering]
    MEMO --> FAST
    LAZY --> FAST

    ATOM --> NOLAG[No UI Lag]
    SEL --> NOLAG

    IDX --> QUICK[Quick Queries]
    CACHE --> QUICK
    BATCH --> QUICK

    TREE --> SMALL[Small Bundle]
    MIN --> SMALL
    CHUNK --> SMALL

    style FAST fill:#81C784
    style NOLAG fill:#64B5F6
    style QUICK fill:#FFD54F
    style SMALL fill:#E57373
```

---

## Legend

### Color Coding
- 🟢 Green - Data/Storage Layer
- 🔵 Blue - State Management
- 🟠 Orange - Communication/IPC
- 🟣 Purple - Services/Business Logic
- 🔴 Red - Database
- 🟡 Yellow - Build/Tooling

### Abbreviations
- **IPC** - Inter-Process Communication
- **CRDT** - Conflict-Free Replicated Data Type
- **RTL** - React Testing Library
- **E2E** - End-to-End
- **CSP** - Content Security Policy
- **FSM** - Finite State Machine

---

*For implementation details, see ARCHITECTURE.md and IMPLEMENTATION_GUIDE.md*
