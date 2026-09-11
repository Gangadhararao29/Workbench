# Workbench Performance Baseline & Roadmap

## 1. Baseline Performance Metrics (v0.1.0)

Recorded on: **2026-09-05**  
Environment: Production build (`ng build`) via `@angular/build:application` (Vite + Rolldown/esbuild under Angular 22).

### 1.1 Bundle Sizes (Initial Load)
| Asset | Raw Size | Estimated Transfer (Gzip / Brotli) | Notes |
|---|---|---|---|
| `main-*.js` | **7.10 MB** | **1.40 MB** | Contains all 31 tools and dependencies |
| `styles-*.css` | **378.89 kB** | **104.29 kB** | Angular Material + Tailwind CSS |
| `chunk-*.js` | **1.21 kB** | **505 B** | Runtime helper |
| **Total Initial Load** | **7.48 MB** | **1.50 MB** | Eagerly fetched on landing |

### 1.2 Build Performance
- **Build Duration**: `54.8 seconds`
- **Lazy Chunks Generated**: 93 chunks (Monaco editor language syntaxes and Tree-sitter WASM artifacts)

---

## 2. Heavy Dependencies Audit

The initial 7.10 MB main bundle is heavily dominated by libraries eagerly imported by tool components:

1. **Monaco Editor (`monaco-editor`)**: Full syntax highlighter, workers, and editor core.
2. **Tree-sitter WASM (`web-tree-sitter`, `tree-sitter-c-sharp`)**: C# AST parsing engine.
3. **TypeScript AST (`ts-morph`)**: Abstract syntax tree manipulation for C# → TypeScript generator.
4. **API Spec Parsers (`@apidevtools/swagger-parser`, `openapi3-ts`)**: JSON Schema and OpenAPI 3.0 resolution.
5. **Formatters (`prettier`, `sql-formatter`)**: Multi-dialect SQL & JavaScript/TypeScript formatters.
6. **Crypto & Token Parsing (`jose`, `jwt-decode`)**: Cryptographic signature validation and JWT decoding.

---

## 3. Optimization Targets

| Metric | Baseline (v0.1.0) | Phase 1-3 Target | Target Status |
|---|---|---|---|
| Initial JS Bundle | 7.10 MB | **< 1.0 MB** | In progress (Tool dynamic loading) |
| Initial Gzip Transfer | 1.50 MB | **< 300 kB** | Planned (Lazy tool chunks) |
| Time to Interactive (TTI) | ~2.5s on desktop | **< 800ms** | Planned |
| Tool Chunk Loading | Eager (All upfront) | **On-demand** (Upon tab open) | Architectural redesign |

---

## 4. Lazy Loading Strategy
1. **Tool Page Dynamic Component Loading**: Convert tool components from static imports to dynamic imports (`() => import(...)`).
2. **Heavy Engine Dynamic Imports**: Load `prettier`, `ts-morph`, and `swagger-parser` inside engine methods via dynamic `import()` rather than module-level static imports.
3. **Monaco & Tree-Sitter Deferral**: Initialize Monaco editor and fetch Tree-sitter WASM only after the host component renders.
