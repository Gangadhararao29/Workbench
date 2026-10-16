# AGENTS.md

This repository is the Angular client for the Workbench developer utilities app. Treat the project root as this folder unless a different repository root is explicitly provided.

## Quick start

- Install dependencies: `npm install`
- Start the local app: `npm start`
- Production build: `npm run build`
- Test suite: `npm test -- --watch=false`

## Project shape

- Product overview and contributor guidance: [README.md](README.md)
- Architecture and separation of concerns: [docs/architecture.md](docs/architecture.md)
- Performance baseline and bundle risks: [docs/performance.md](docs/performance.md)
- Security model and client-only boundaries: [docs/security.md](docs/security.md)

## Architecture conventions

- The app is organized around a declarative tool registry, not a large switch statement. See [src/app/core/tool/tool-registry.ts](src/app/core/tool/tool-registry.ts).
- Pure transformation logic should live in shared engines under [src/app/core/engines](src/app/core/engines) rather than inside shell or page components.
- Tool components should stay focused on presentation and user interaction; keep domain logic in reusable engines and small helper methods.
- Keep each tool self-contained within its domain group under [src/app/tools](src/app/tools) and follow the existing patterns for tabbed workspace instances and persisted config.

## When adding or changing a tool

1. Create the tool component in the correct group under [src/app/tools](src/app/tools).
2. Register it in [src/app/core/tool/tool-registry.ts](src/app/core/tool/tool-registry.ts) with a unique type, metadata, and default config.
3. Reuse existing engine utilities before introducing new parsing or formatting logic.
4. Add focused unit tests beside the implementation and run the relevant test target.
5. Avoid spreading tool-specific behavior across the shell or app-wide services.

## Coding expectations

- Prefer small, composable pieces over large application-wide changes.
- Match the existing Angular/TypeScript conventions already used in the repository.
- Keep browser-only behavior in mind: do not assume server-side execution or backend state.
- When a change affects parsing, formatting, conversion, or persistence behavior, include tests that validate the real behavior.

## Useful rule of thumb

If the change is a general-purpose transformation, it belongs in the engine layer. If it is a UI interaction or workspace state concern, it belongs in the tool component or core shell layer.
