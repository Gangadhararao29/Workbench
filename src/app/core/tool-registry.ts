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
    id: 'json', label: 'JSON', icon: 'data_object',
    tools: [
      { type: 'json-formatter', label: 'Formatter', description: 'Format, validate, and inspect JSON.' },
      { type: 'json-diff', label: 'Diff', description: 'Compare two JSON documents and inspect changes.' },
      { type: 'json-path', label: 'Path tester', description: 'Test paths against JSON data.' },
      { type: 'json-to-typescript', label: 'JSON → TypeScript', description: 'Generate TypeScript types from JSON data.' },
      { type: 'json-to-csharp', label: 'JSON → C#', description: 'Generate C# models from JSON data.' },
      { type: 'json-to-yaml', label: 'JSON ↔ YAML', description: 'Convert bi-directionally between JSON and YAML.' },
    ]
  },
  {
    id: 'dotnet', label: '.NET / C#', icon: 'code',
    tools: [
      { type: 'csharp-to-typescript', label: 'C# → TypeScript', description: 'Convert C# classes, records, and enums into TypeScript.' },
      { type: 'csharp-to-json', label: 'C# → JSON', description: 'Create a JSON example from C# model definitions.' },
      { type: 'csharp-formatter', label: 'Formatter', description: 'Format and tidy C# source code.' },
      { type: 'feature-generator', label: 'Feature generator', description: 'Generate a starting point for a .NET feature.' },
    ]
  },
  {
    id: 'ef', label: 'EF Core', icon: 'schema',
    tools: [
      { type: 'ef-configuration', label: 'Entity configuration', description: 'Generate Entity Framework Core Fluent API & annotations configuration.' },
      { type: 'ef-migrations', label: 'Migration helper', description: 'Generate dotnet ef CLI commands and custom migration scripts.' },
      { type: 'ef-linq', label: 'LINQ & query assistant', description: 'Draft LINQ queries, EF Core performance patterns, and SQL translations.' },
      { type: 'ef-dbcontext', label: 'DbContext generator', description: 'Generate production-ready DbContext with DbSets, audit filters, and DI.' },
    ]
  },
  {
    id: 'sql', label: 'SQL', icon: 'storage',
    tools: [
      { type: 'sql-formatter', label: 'Formatter', description: 'Format SQL queries for easier reading.' },
      { type: 'sql-to-csharp', label: 'SQL → C#', description: 'Generate C# models from SQL definitions.' },
      { type: 'sql-generator', label: 'Sql generator', description: 'Parse DDL & SSMS grid data to generate CRUD SQL, batch queries & variables.' },
      { type: 'sql-search', label: 'Search', description: 'Search and inspect SQL snippets.' },
      { type: 'sql-query-builder', label: 'Query builder', description: 'Build SQL queries interactively.' },
    ]
  },
  {
    id: 'api', label: 'API', icon: 'api',
    tools: [
      { type: 'openapi-inspector', label: 'OpenAPI inspector', description: 'Inspect endpoints and schemas from an OpenAPI document.' },
      { type: 'http-request-builder', label: 'HTTP request builder', description: 'Build and preview HTTP requests.' },
      { type: 'jwt-inspector', label: 'JWT inspector', description: 'Decode and inspect JWT headers, claims, and expiry.' },
      { type: 'curl-converter', label: 'cURL converter', description: 'Convert cURL commands into application code.' },
    ]
  },
  {
    id: 'frontend', label: 'Frontend', icon: 'web',
    tools: [
      { type: 'api-generator', label: 'API client generator', description: 'Generate a frontend client from an API shape.' },
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
      { type: 'log-viewer', label: 'Log viewer', description: 'Inspect and filter application logs.' },
    ]
  }
];

export function toolLabelFor(toolType: string): string {
  return TOOL_GROUPS
    .flatMap(group => group.tools)
    .find(tool => tool.type === toolType)?.label ?? toolType;
}

export function isValidToolType(toolType: string): boolean {
  return TOOL_GROUPS.some(group => group.tools.some(tool => tool.type === toolType));
}

export function findToolDefinition(toolType: string): { tool: ToolDefinition; group: ToolGroup } | null {
  for (const group of TOOL_GROUPS) {
    const tool = group.tools.find(t => t.type === toolType);
    if (tool) {
      return { tool, group };
    }
  }
  return null;
}

export interface UpcomingFeature {
  label: string;
  description: string;
}

export interface UpcomingGroup {
  id: string;
  label: string;
  icon: string;
  features: UpcomingFeature[];
}

export const UPCOMING_GROUPS: UpcomingGroup[] = [
  {
    id: 'database',
    label: 'Database',
    icon: 'storage',
    features: [
      { label: 'Query Runner', description: 'Connect to SQL Server/PostgreSQL/MySQL, execute queries, and return results.' },
      { label: 'Database Explorer', description: 'Explore tables, views, procedures, functions, columns, keys, indexes, and database metadata.' },
      { label: 'Schema Search', description: 'Search tables, columns, procedures, functions in a live DB with fuzzy search across database metadata.' }
    ]
  },
  {
    id: 'dotnet',
    label: '.NET',
    icon: 'code',
    features: [
      { label: 'Roslyn Analyzer', description: 'Semantic C# analysis to find classes, interfaces, references, and usages.' },
      { label: 'Solution Analyzer', description: 'Analyze .sln / .csproj files and perform project dependency analysis.' },
      { label: 'EF Core Tools', description: 'Inspect DbContext, EF entities/configurations, and EF metadata.' },
      { label: 'Migration Runner', description: 'Create, apply, or revert EF migrations in a project + database environment.' },
      { label: 'dotnet CLI', description: 'Create/modify .csproj, .sln, source files, and run builds/tests via dotnet CLI.' }
    ]
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: 'play_arrow',
    features: [
      { label: 'Server Script Runner', description: 'Execute C#, PowerShell, or shell/dotnet scripts with sandboxed execution, process execution, and environment variables.' }
    ]
  },
  {
    id: 'git-projects',
    label: 'Git / Projects',
    icon: 'account_tree',
    features: [
      { label: 'Repository + filesystem operations', description: 'Clone/access repositories, search source code, analyze commits/branches, and generate changes/PRs.' },
      { label: 'Project-wide code generation', description: 'Generate files directly into a .NET/Angular/React/Vue project, modify existing files, and run format/build/test afterward.' }
    ]
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'psychology',
    features: [
      { label: 'LLM Gateway', description: 'LLM calls through the backend for prompt/model management, usage limits, user/team quotas, keeping API keys private.' }
    ]
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: 'cloud',
    features: [
      { label: 'Auth', description: 'User accounts, authentication, saved tools, and configuration settings.' },
      { label: 'Sync', description: 'Saved tools, script/template synchronization across devices.' },
      { label: 'Team Workspaces', description: 'Shared/team script & template repository with versioning, permissions, and private/public libraries.' }
    ]
  }
];

