# Workbench Security Audit & Architecture

## 1. Security Philosophy
Workbench operates on a **Local-First / Zero-Exfiltration** model:
- No user code, database schemas, SQL queries, or JWT credentials leave the browser.
- Network requests are restricted to user-initiated HTTP builder calls or documentation downloads.
- Storage is localized to the client device (`IndexedDB` via Dexie and `localStorage`).

---

## 2. Baseline Audit (v0.1.0)

### 2.1 Build Warnings
- **Eval warnings**: Detected in build bundler outputs originating from `@apidevtools/swagger-parser` / `call-me-maybe` dependencies.
  - *Risk*: Dynamic code execution during OpenAPI schema parsing.
  - *Mitigation*: Replace direct eval or isolate schema dereferencing in isolated environments or workers.

### 2.2 Script Runner Isolation
- **Current Behavior**: The `script-runner` tool executes user-provided JavaScript inside the main UI thread via `Function` or `eval`.
  - *Risk*: User-supplied scripts have full access to `window`, `document.cookie`, `localStorage`, and DOM elements.
  - *Mitigation (Phase 6 Target)*: Migrate script execution to a sandboxed **Web Worker** with:
    - Null origin
    - No DOM access
    - Blocked storage APIs
    - CPU/execution timeout limits

### 2.3 JWT & Secret Handling
- JWT Inspector decodes header and payload claims entirely in-memory using `jwt-decode` and `jose`.
- Private keys or secrets entered by the user are never persisted to long-term analytics or transmitted over network.

### 2.4 Storage & Workspace Export/Import
- Workspace export serializes instance configuration to JSON.
- Workspace import parses JSON without `eval`. Validation ensures `instances` is an array before setting state.
- Additional sanitization is planned to enforce schema validation on all imported configurations.

---

## 3. Security Roadmap
- [ ] **Phase 6.1**: Isolate Script Runner in a dedicated, sandboxed Web Worker.
- [ ] **Phase 6.2**: Add Content Security Policy (CSP) headers in `firebase.json` to enforce script-src, worker-src, and object-src restrictions.
- [ ] **Phase 6.3**: Schema validation (using Zod or standard JSON schema) for workspace import/export.
- [ ] **Phase 6.4**: Audit all dynamic HTML bindings for XSS protection.
