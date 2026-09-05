# Workbench Architecture

## 1. Overview & Vision
Workbench is an open-source, client-side developer workbench designed to provide high-performance, privacy-first developer utilities directly in the browser. 

Unlike traditional multi-page web tools or SaaS utilities that transmit proprietary source code, credentials, and payloads to remote servers, Workbench processes transformations entirely client-side using WebAssembly, TypeScript AST analysis, Monaco Editor, and pure JavaScript parsing engines.

---

## 2. Architecture: Current vs Target

### Current State (Baseline v0.1.0)
```text
                         ┌───────────────────────┐
                         │   Angular Shell (App) │
                         └───────────┬───────────┘
                                     │
                         ┌───────────▼───────────┐
                         │       Tool Page       │
                         │ (Imports all 31 tools)│
                         └───────────┬───────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │ Static @switch          │                         │
    ┌──────▼───────┐          ┌──────▼───────┐          ┌──────▼───────┐
    │ SqlFormatter │          │ JsonFormatter│          │  ...31 tools │
    └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     │
                         ┌───────────▼───────────┐
                         │    InstanceService    │
                         │(State & LocalStorage) │
                         └───────────────────────┘
```

#### Bottlenecks in Baseline
- **Monolithic Component Imports**: `ToolPage` statically imports all 31 tool components, inflating the initial bundle to **7.48 MB**.
- **Switch Statement Explosion**: Adding a new tool required modifying 5+ files across tool registry, default configurations, router, tool page switch statement, and options panel switch statement.
- **Tight Coupling**: Tool components mix state synchronization, engine calls, and UI presentation.

---

### Target State (Phase 1 & Beyond)
```text
                       ┌──────────────┐
                       │     Shell    │
                       └───────┬──────┘
                               │
                       ┌───────▼──────┐
                       │   Workspace  │
                       └───────┬──────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
           ┌──────▼───────┐         ┌──────▼───────┐
           │ Tool Registry│         │Instance State│
           │(Self-registry│         │ (Versioning &│
           │ & Lazy Load) │         │  Migrations) │
           └──────┬───────┘         └──────┬───────┘
                  │                         │
                  └────────────┬────────────┘
                               │
                        ┌──────▼──────┐
                        │ Tool Engine │
                        │(Pure domain)│
                        └──────┬──────┘
                               │
                     ┌─────────▼─────────┐
                     │ IndexedDB / Dexie │
                     └───────────────────┘
```

---

## 3. Core Domain Abstractions

### 3.1 `ToolDefinition`
A declaration of a tool's capabilities, metadata, and lazy-loading boundaries:
```ts
export interface ToolDefinition<TConfig = Record<string, any>> {
  type: string;
  label: string;
  description: string;
  groupId: string;
  icon?: string;
  keywords?: string[];
  defaultConfig?: TConfig;
  loadComponent: () => Promise<Type<any>> | Type<any>;
  loadOptionsComponent?: () => Promise<Type<any>> | Type<any>;
}
```

### 3.2 `ToolInstance`
An active or archived tab instance in the workspace:
```ts
export interface ToolInstance<TConfig = Record<string, any>> {
  id: string;               // Unique instance ID (UUID v4)
  toolType: string;         // Target ToolDefinition.type
  label: string;            // Tab label (user-editable)
  groupId: string;          // Category / group identifier
  config: TConfig;          // Tool configuration snapshot
  version?: number;         // Schema version for future state migrations
  createdAt?: number;       // Unix epoch creation timestamp
  closedAt?: number;        // Epoch when tab was closed/archived
}
```

### 3.3 `ToolRegistry`
Central catalog implementing registration and discovery:
- Allows any tool module to self-register: `registerTool(definition)`
- Resolves definitions and groups dynamically
- Facilitates code-splitting: tool components and heavy libraries are loaded only when an instance of that tool is opened.

---

## 4. Separation of Concerns: UI vs Engines
1. **Engines (`src/app/core/engines/`)**:
   Pure, framework-agnostic TypeScript functions/classes responsible for parsing, transformations, and formatting. Tested in isolation without Angular dependencies.
2. **Components (`src/app/tools/**/`)**:
   Responsible strictly for user interactions, Monaco Editor instances, error banners, and reactivity with Angular Signals.
3. **Shell & Workspace (`src/app/shell/`, `src/app/core/`)**:
   Manages tab lifecycles, sidebar navigation, options drawers, and persistence to `IndexedDB` / `localStorage`.
