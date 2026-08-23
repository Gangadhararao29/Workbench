export interface ToolDefinition {
  type: string;
  label: string;
  description: string;
}

export interface ToolGroup {
  id: string;
  label: string;
  icon: string;
  tools: ToolDefinition[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'dotnet', label: '.NET', icon: 'code',
    tools: [
      { type: 'csharp-to-typescript', label: 'C# to TypeScript', description: 'Convert C# classes, records, and enums into TypeScript.' },
      { type: 'csharp-to-json', label: 'C# to JSON', description: 'Create a JSON example from C# model definitions.' },
      { type: 'csharp-formatter', label: 'Formatter', description: 'Format and tidy C# source code.' },
      { type: 'feature-generator', label: 'Feature generator', description: 'Generate a starting point for a .NET feature.' }
    ]
  },
  {
    id: 'ef', label: 'EF Core', icon: 'schema',
    tools: [
      { type: 'ef-configuration', label: 'Entity configuration', description: 'Generate Entity Framework Core configuration.' }
    ]
  },
  {
    id: 'frontend', label: 'Frontend', icon: 'web',
    tools: [
      { type: 'api-generator', label: 'API client generator', description: 'Generate a frontend client from an API shape.' }
    ]
  },
  {
    id: 'api', label: 'API', icon: 'api',
    tools: [
      { type: 'jwt-inspector', label: 'JWT inspector', description: 'Decode and inspect JWT headers, claims, and expiry.' },
      { type: 'curl-converter', label: 'cURL converter', description: 'Convert cURL commands into application code.' },
      { type: 'http-request-builder', label: 'HTTP request builder', description: 'Build and preview HTTP requests.' },
      { type: 'openapi-inspector', label: 'OpenAPI inspector', description: 'Inspect endpoints and schemas from an OpenAPI document.' }
    ]
  },
  {
    id: 'sql', label: 'SQL', icon: 'storage',
    tools: [
      { type: 'sql-formatter', label: 'Formatter', description: 'Format SQL queries for easier reading.' },
      { type: 'sql-to-csharp', label: 'SQL to C#', description: 'Generate C# models from SQL definitions.' },
      { type: 'sql-generator', label: 'CRUD generator', description: 'Generate CRUD SQL and application code.' },
      { type: 'sql-search', label: 'SQL search', description: 'Search and inspect SQL snippets.' },
      { type: 'sql-query-builder', label: 'Query builder', description: 'Build SQL queries interactively.' }
    ]
  },
  {
    id: 'json', label: 'JSON', icon: 'data_object',
    tools: [
      { type: 'json-formatter', label: 'Formatter', description: 'Format, validate, and inspect JSON.' },
      { type: 'json-to-typescript', label: 'JSON to TypeScript', description: 'Generate TypeScript types from JSON data.' },
      { type: 'json-to-csharp', label: 'JSON to C#', description: 'Generate C# models from JSON data.' },
      { type: 'json-diff', label: 'Diff', description: 'Compare two JSON documents and inspect changes.' },
      { type: 'json-path', label: 'Path tester', description: 'Test paths against JSON data.' },
      { type: 'json-validator', label: 'Validator', description: 'Check JSON for valid syntax.' }
    ]
  },
  {
    id: 'general', label: 'General', icon: 'apps',
    tools: [
      { type: 'guid-generator', label: 'GUID generator', description: 'Generate GUIDs in common formats.' },
      { type: 'timestamp-converter', label: 'Timestamp converter', description: 'Convert timestamps between common formats.' },
      { type: 'regex-tester', label: 'Regex tester', description: 'Test regular expressions against sample text.' },
      { type: 'script-runner', label: 'Script runner', description: 'Run utility scripts against supplied input.' },
      { type: 'documentation-hub', label: 'Documentation hub', description: 'Keep useful development documentation close at hand.' },
      { type: 'terminal', label: 'Terminal', description: 'Work with terminal commands and snippets.' },
      { type: 'log-viewer', label: 'Log viewer', description: 'Inspect and filter application logs.' }
    ]
  }
];

export function toolLabelFor(toolType: string): string {
  return TOOL_GROUPS
    .flatMap(group => group.tools)
    .find(tool => tool.type === toolType)?.label ?? toolType;
}
