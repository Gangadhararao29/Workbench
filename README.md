# Workbench

Developer Workbench is a full-stack developer workspace for everyday software development tasks. It brings formatters, converters, generators, API utilities, database tools, and other practical utilities into one browser-based interface.

**Hosted site:** [work-bench2.web.app](https://work-bench2.web.app/)

The client is currently implemented with Angular, but the product is intended as a broader workspace for full-stack developers rather than an Angular-specific tool.

## What it includes

The home page groups tools into the following areas:

- **JSON:** formatter, diff, JSONPath tester, JSON to TypeScript, and JSON to C#
- **.NET / C#:** C# to TypeScript, C# to JSON, C# formatter, and feature generator
- **EF Core:** entity configuration generator
- **SQL:** formatter, SQL to C#, CRUD generator, search, and query builder
- **API:** OpenAPI inspector, JWT inspector, HTTP request builder, and cURL converter
- **Frontend:** API client generator
- **General:** GUID generator, timestamp converter, regex tester, script runner, documentation hub, terminal, and log viewer

Tools open as tabs in the central workspace. Multiple instances can be open at once, tabs can be renamed or closed, and recently closed instances can be restored. The left sidebar supports search and favorites. Tool state, tab state, favorites, and the selected light or dark theme are persisted in browser storage. The options panel appears for tools that expose configurable formatting or generation settings.

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

- `src/app/core/` contains shared services, tool registration, defaults, storage, and reusable engines.
- `src/app/shell/` contains the application shell, tabs, sidebar, and options panel.
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

	The `type` must be unique. It is used as the instance key, sidebar search value, and dispatch value.

3. Import the component in [`app.ts`](src/app/app.ts), add it to the standalone component `imports` array, and add a matching `@case` to [`app.html`](src/app/app.html):

	```html
	@case ('my-tool') {
	  <app-my-tool [instanceId]="activeInstance()!.id" />
	}
	```

4. If the tool needs initial settings, add a matching entry to [`tool-defaults.ts`](src/app/core/tool-defaults.ts). The default object is copied for each new instance.

5. If it has user-facing settings, add an `@case ('my-tool')` to [`options-panel.html`](src/app/shell/options-panel/options-panel.html), and update the tool to read those values from its instance configuration. Add the tool type to `TOOLS_WITH_OPTIONS` in [`app.ts`](src/app/app.ts) so the panel opens automatically.

6. Add or update focused unit tests beside the component. Verify the tool appears on the home page and sidebar, opens in a tab, preserves its state after reload, and handles invalid input where applicable.

After adding a tool, run:

```bash
npm test
npm run build
```

## Contributing

Keep tool logic small and composable, prefer existing shared engines and UI components, and avoid putting domain-specific behavior in the application shell. Include tests for new parsing, formatting, conversion, or persistence behavior. Update this README when a new tool group or a significant roadmap capability is introduced.

## License

No license has been declared for this repository yet.
