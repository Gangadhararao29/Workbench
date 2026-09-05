# Workbench

Developer Workbench is a full-stack developer workspace for everyday software development tasks. It brings formatters, converters, generators, API utilities, database tools, and other practical utilities into one browser-based interface.

**Hosted site:** [work-bench2.web.app](https://work-bench2.web.app/)

The client is currently implemented with Angular, but the product is intended as a broader workspace for full-stack developers rather than an Angular-specific tool.

## What it includes

The home page groups tools into the following areas:

- **JSON:** Formatter, Diff, JSONPath tester, JSON to TypeScript, and JSON to C#
- **.NET / C#:** C# to TypeScript, C# to JSON, C# Formatter, and Feature generator
- **EF Core:** Entity configuration (Fluent API & annotations), Migration helper (`dotnet ef` CLI & PMC command generator, custom C# migration scripts), LINQ & query assistant, and DbContext generator (DbSets, global filters, audit tracking, DI setup)
- **SQL:** Formatter, SQL to C#, SQL generator (DDL parser, SSMS grid data import, CRUD, UPSERT/MERGE, and batch queries), Search, and Query builder
- **API:** OpenAPI inspector, HTTP request builder, JWT inspector (claims, headers, expiry validation), and cURL converter
- **Frontend:** API client generator (Angular, React, Vue, Fetch/Axios)
- **General:** GUID generator, Timestamp converter (multi-format parsing, live clock/tickers, unit auto-detection), Regex tester (interactive regex testing with cheat sheet and common presets), Script runner, Documentation hub, Terminal command snippets, and Log viewer

Tools open as dedicated tool pages (`/tools/:toolType`) in the central workspace. Multiple scoped instances can be open per tool, tabs can be added, cloned, or renamed, and recently closed instances are preserved in history. The left sidebar supports search and favorites. Tool state, instance configurations, favorites, and light/dark theme preference are persisted in browser storage. An options panel is available for configurable formatting, generation settings, and regex quick-reference.

The home page also tracks planned areas such as database connectivity, Roslyn and solution analysis, migration and CLI support, repository operations, project-wide code generation, an LLM gateway, and account or team synchronization features.

## Requirements

- Node.js compatible with the installed Angular 22 client toolchain
- npm 11 (the project declares `npm@11.17.0` as its package manager)

## Getting started

Install dependencies and start the development server:

```bash
npm install
npm start
```

Open `http://localhost:4200/`. The client reloads automatically when source files change.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Run the local development server |
| `npm run build` | Create a production build in `dist/` |
| `npm test` | Run unit tests with Vitest through Angular CLI |
| `npm run watch` | Build continuously using the development configuration |
| `npm run deploy` | Build and deploy to Firebase |

## Architecture & Documentation

Comprehensive architectural, performance, and security documentation is available in `docs/`:

- [Architecture Guide](docs/architecture.md) — Core abstractions (`ToolDefinition`, `ToolInstance`), decoupled registry pattern, dynamic component rendering, and engine separation.
- [Performance Baseline](docs/performance.md) — Bundle breakdown (v0.1.0 baseline of 7.48 MB), heavy dependency audits, and lazy loading targets.
- [Security Model](docs/security.md) — Client-side isolation, script execution sandboxing roadmap, and local persistence boundaries.

## Project structure

- `docs/` contains architecture, performance baselines, and security specifications.
- `src/app/core/` contains shared services, state management, tool registry, and pure transformation engines.
- `src/app/shell/` contains the application shell, navigation bar, sidebar, and options panel.
- `src/app/home/` contains the home dashboard.
- `src/app/tool-page/` contains the dynamic tool container page and scoped instance tab bar.
- `src/app/tools/` contains individual tool components grouped by domain.
- `src/app/shared/` contains reusable UI components such as the code editor.
- `public/` contains static assets and the web app manifest.

## Adding a new tool

Thanks to the decoupled **Tool Registry** architecture, adding a new tool is declarative and does not require modifying shell pages or switch statements.

1. Create a standalone component under `src/app/tools/<group>/<tool-name>/`. Keep component files together (`.ts`, `.html`, `.css`). The component accepts the workspace instance ID:

	```ts
	@Input({ required: true }) instanceId!: string;
	```

	Inject `InstanceService` when the tool needs to read or update its persisted instance configuration. Reuse shared pure engines in `src/app/core/engines/` and `CodeEditor` where appropriate.

2. Register the tool in [`src/app/core/tool-registry.ts`](src/app/core/tool-registry.ts) using `registerTool()`:

	```ts
	registerTool({
	  type: 'my-tool',
	  groupId: 'general',
	  label: 'My Tool',
	  description: 'What the tool does.',
	  defaultConfig: { exampleSetting: true },
	  loadComponent: () => import('../tools/general/my-tool/my-tool').then((m) => m.MyToolComponent),
	});
	```

	- **`type`**: Unique identifier used for routes (`/tools/my-tool`), persistence keys, and sidebar dispatch.
	- **`loadComponent`**: Dynamic import function that lazy-loads the tool chunk on demand.
	- **`defaultConfig`**: Initial state cloned when a new instance tab is opened.

3. *(Optional)* If user-configurable options are required, add an entry to [`options-panel.html`](src/app/shell/options-panel/options-panel.html) and add the tool type to `TOOLS_WITH_OPTIONS` in [`shell-state.service.ts`](src/app/core/shell-state.service.ts).

4. Add focused unit tests beside your component and engine. Verify the tool appears on the home page and sidebar, opens in its tabbed workspace, and preserves configuration.

After adding a tool, run:

```bash
npm test -- --watch=false
```

## Contributing

Keep tool logic small and composable, prefer existing shared engines and UI components, and avoid putting domain-specific behavior in the application shell. Include tests for new parsing, formatting, conversion, or persistence behavior. Update this README when a new tool group or a significant roadmap capability is introduced.

## License

No license has been declared for this repository yet.
