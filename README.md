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

## Project structure

- `src/app/core/` contains shared services, state management, tool registration, defaults, storage, and reusable engines.
- `src/app/shell/` contains the application shell, navigation bar, sidebar, and options panel.
- `src/app/home/` contains the home dashboard.
- `src/app/tool-page/` contains the dedicated tool container page and scoped instance tab bar.
- `src/app/tools/` contains individual tool components grouped by domain.
- `src/app/shared/` contains reusable UI components such as the code editor.
- `public/` contains static assets and the web app manifest.

## Adding a new tool

Each tool currently has three integration points: metadata, rendering, and optional configuration.

1. Create a standalone component under the appropriate folder in `src/app/tools/`. Keep the usual component files together: `.ts`, `.html`, and `.css`. The component should accept the workspace instance ID:

	```ts
	@Input({ required: true }) instanceId!: string;
	```

	Inject `InstanceService` when the tool needs to read or update its persisted instance configuration. Reuse shared engines and `CodeEditor` where appropriate.

2. Add the tool metadata to the relevant group in [`tool-registry.ts`](src/app/core/tool-registry.ts):

	```ts
	{ type: 'my-tool', label: 'My tool', description: 'What the tool does.' }
	```

	The `type` must be unique. It is used as the instance key, route parameter (`/tools/my-tool`), sidebar search value, and dispatch value.

3. Import the component in [`tool-page.ts`](src/app/tool-page/tool-page.ts), add it to the standalone component `imports` array, and add a matching `@case` to [`tool-page.html`](src/app/tool-page/tool-page.html):

	```html
	@case ('my-tool') {
	  <app-my-tool [instanceId]="selectedInstance()!.id" />
	}
	```

4. If the tool needs initial settings, add a matching entry to [`tool-defaults.ts`](src/app/core/tool-defaults.ts). The default object is copied for each new instance.

5. If it has user-facing settings, add an `@case ('my-tool')` to [`options-panel.html`](src/app/shell/options-panel/options-panel.html), and update the tool to read those values from its instance configuration. Add the tool type to `TOOLS_WITH_OPTIONS` in [`shell-state.service.ts`](src/app/core/shell-state.service.ts) so the panel opens automatically.

6. Add or update focused unit tests beside the component. Verify the tool appears on the home page and sidebar, opens in its tool page, preserves its state after reload, and handles invalid input where applicable.

After adding a tool, run:

```bash
npm test
npm run build
```

## Contributing

Keep tool logic small and composable, prefer existing shared engines and UI components, and avoid putting domain-specific behavior in the application shell. Include tests for new parsing, formatting, conversion, or persistence behavior. Update this README when a new tool group or a significant roadmap capability is introduced.

## License

No license has been declared for this repository yet.
