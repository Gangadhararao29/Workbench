import { Type } from '@angular/core';

export interface ToolDefinition<TConfig = Record<string, any>> {
  type: string;
  name: string;
  label: string;
  description: string;
  groupId: string;
  icon?: string;
  keywords?: string[];
  defaultConfig?: TConfig;
  hasSidebarOptions?: boolean;
  defaultSidebarOpen?: boolean;
  loadComponent: () => Promise<Type<any>> | Type<any>;
}

export interface ToolGroup {
  id: string;
  label: string;
  icon: string;
  tools: ToolDefinition[];
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

const TOOL_REGISTRY = new Map<string, ToolDefinition>();
const COMPONENT_CACHE = new Map<string, Type<any>>();

export const GROUP_METADATA: Record<string, { label: string; icon: string; order: number }> = {
  json: { label: 'JSON', icon: 'data_object', order: 1 },
  dotnet: { label: '.NET / C#', icon: 'code', order: 2 },
  ef: { label: 'EF Core', icon: 'schema', order: 3 },
  sql: { label: 'SQL', icon: 'storage', order: 4 },
  api: { label: 'API', icon: 'api', order: 5 },
  frontend: { label: 'Frontend', icon: 'web', order: 6 },
  general: { label: 'General', icon: 'apps', order: 7 },
};

export function registerTool(tool: ToolDefinition): void {
  if (!tool.label && tool.name) tool.label = tool.name;
  if (!tool.name && tool.label) tool.name = tool.label;
  TOOL_REGISTRY.set(tool.type, tool);
}

export function getToolDefinition(toolType: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.get(toolType);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(TOOL_REGISTRY.values());
}

export function getLoadedComponent(toolType: string): Type<any> | undefined {
  return COMPONENT_CACHE.get(toolType);
}

export function setLoadedComponent(toolType: string, component: Type<any>): void {
  COMPONENT_CACHE.set(toolType, component);
}

export async function resolveToolComponent(toolType: string): Promise<Type<any> | null> {
  if (COMPONENT_CACHE.has(toolType)) {
    return COMPONENT_CACHE.get(toolType)!;
  }
  const tool = TOOL_REGISTRY.get(toolType);
  if (!tool) return null;

  const resolved = await tool.loadComponent();
  COMPONENT_CACHE.set(toolType, resolved);
  return resolved;
}

export function defaultConfigFor(toolType: string): Record<string, any> {
  const tool = getToolDefinition(toolType);
  if (!tool || !tool.defaultConfig) return {};
  return JSON.parse(JSON.stringify(tool.defaultConfig));
}

export function hasSidebarOptions(toolType: string): boolean {
  return getToolDefinition(toolType)?.hasSidebarOptions ?? false;
}

export function isSidebarOpenByDefault(toolType: string): boolean {
  return getToolDefinition(toolType)?.defaultSidebarOpen ?? false;
}

// Pre-register all workbench tools with complete definitions in one place
const INITIAL_TOOLS: ToolDefinition[] = [
  // JSON Group
  {
    type: 'json-formatter',
    groupId: 'json',
    name: 'Formatter',
    label: 'Formatter',
    description: 'Format, validate, and inspect JSON.',
    keywords: ['json', 'format', 'beautify', 'minify', 'pretty', 'validate', 'lint', 'indent', 'clean'],
    defaultConfig: { indent: '2 spaces', sortKeys: false },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/json/json-formatter/json-formatter').then((m) => m.JsonFormatter),
  },
  {
    type: 'json-diff',
    groupId: 'json',
    name: 'Diff',
    label: 'Diff',
    description: 'Compare two JSON documents and inspect changes.',
    keywords: ['json', 'diff', 'compare', 'difference', 'patch', 'changes', 'merge'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () => import('../../tools/json/json-diff/json-diff').then((m) => m.JsonDiff),
  },
  {
    type: 'json-path',
    groupId: 'json',
    name: 'Path tester',
    label: 'Path tester',
    description: 'Test paths against JSON data.',
    keywords: ['json', 'path', 'jsonpath', 'query', 'filter', 'extract', 'tester', 'expression'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () => import('../../tools/json/json-path/json-path').then((m) => m.JsonPath),
  },
  {
    type: 'json-to-typescript',
    groupId: 'json',
    name: 'JSON → TypeScript',
    label: 'JSON → TypeScript',
    description: 'Generate TypeScript types from JSON data.',
    keywords: ['json', 'typescript', 'ts', 'interface', 'type', 'convert', 'generate', 'schema', 'models'],
    defaultConfig: { rootName: 'Root', outputType: 'interface' },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/json/json-to-typescript/json-to-typescript').then((m) => m.JsonToTypescript),
  },
  {
    type: 'json-to-csharp',
    groupId: 'json',
    name: 'JSON → C#',
    label: 'JSON → C#',
    description: 'Generate C# models from JSON data.',
    keywords: ['json', 'c#', 'csharp', 'dotnet', 'class', 'record', 'dto', 'convert', 'generate', 'model', 'poco'],
    defaultConfig: { rootName: 'Root' },
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/json/json-to-csharp/json-to-csharp').then((m) => m.JsonToCsharp),
  },
  {
    type: 'json-to-yaml',
    groupId: 'json',
    name: 'JSON ↔ YAML',
    label: 'JSON ↔ YAML',
    description: 'Convert bi-directionally between JSON and YAML.',
    keywords: ['json', 'yaml', 'yml', 'convert', 'converter', 'serialization', 'parse', 'k8s', 'kubernetes'],
    defaultConfig: {
      mode: 'json-to-yaml',
      indent: '2 spaces',
      sortKeys: false,
      quotingType: 'none',
      flowLevel: -1,
      forceQuotes: false,
      compactJson: false,
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/json/json-to-yaml/json-to-yaml').then((m) => m.JsonToYaml),
  },

  // .NET / C# Group
  {
    type: 'csharp-to-typescript',
    groupId: 'dotnet',
    name: 'C# → TypeScript',
    label: 'C# → TypeScript',
    description: 'Convert C# classes, records, and enums into TypeScript.',
    keywords: ['c#', 'csharp', 'typescript', 'ts', 'interface', 'type', 'convert', 'models', 'dto', 'enum'],
    defaultConfig: {
      outputType: 'interface',
      naming: 'camel',
      nullable: 'null',
      enumOutput: 'enum',
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/dotnet/csharp-to-typescript/csharp-to-typescript').then(
        (m) => m.CsharpToTypescript,
      ),
  },
  {
    type: 'csharp-to-json',
    groupId: 'dotnet',
    name: 'C# → JSON',
    label: 'C# → JSON',
    description: 'Create a JSON example from C# model definitions.',
    keywords: ['c#', 'csharp', 'json', 'mock', 'sample', 'example', 'generator', 'dto', 'model', 'dummy data'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/dotnet/csharp-to-json/csharp-to-json').then((m) => m.CsharpToJson),
  },
  {
    type: 'csharp-formatter',
    groupId: 'dotnet',
    name: 'Formatter',
    label: 'Formatter',
    description: 'Format and tidy C# source code.',
    keywords: ['c#', 'csharp', 'format', 'tidy', 'beautify', 'indent', 'clean', 'source code', 'style'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/dotnet/csharp-formatter/csharp-formatter').then((m) => m.CsharpFormatter),
  },
  {
    type: 'feature-generator',
    groupId: 'dotnet',
    name: 'Feature generator',
    label: 'Feature generator',
    description: 'Generate a starting point for a .NET feature.',
    keywords: ['dotnet', 'c#', 'csharp', 'scaffold', 'clean architecture', 'cqrs', 'repository', 'controller', 'service', 'dto', 'api', 'boilerplate', 'feature'],
    defaultConfig: {
      includeEntity: true,
      includeDto: true,
      includeRepository: true,
      includeService: true,
      includeController: true,
      includeConfiguration: true,
      includeFrontend: true,
      frontendFramework: 'angular',
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/dotnet/feature-generator/feature-generator').then((m) => m.FeatureGenerator),
  },

  // EF Core Group
  {
    type: 'ef-configuration',
    groupId: 'ef',
    name: 'Entity configuration',
    label: 'Entity configuration',
    description: 'Generate Entity Framework Core Fluent API & annotations configuration.',
    keywords: ['entity framework', 'ef core', 'fluent api', 'data annotations', 'model builder', 'mapping', 'orm', 'entity', 'dbcontext'],
    defaultConfig: {
      tableNaming: 'plural',
      schema: '',
      defaultStringLength: 200,
      deleteBehavior: 'Restrict',
      enableSoftDelete: true,
      enablePrecision: true,
      enableEnumConversion: true,
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/ef/ef-configuration/ef-configuration').then((m) => m.EfConfiguration),
  },
  {
    type: 'ef-migrations',
    groupId: 'ef',
    name: 'Migration helper',
    label: 'Migration helper',
    description: 'Generate dotnet ef CLI commands and custom migration scripts.',
    keywords: ['entity framework', 'ef core', 'migrations', 'dotnet ef', 'database update', 'script', 'cli', 'schema migration', 'up', 'down'],
    defaultConfig: {
      project: 'src/Infrastructure',
      startupProject: 'src/WebApi',
      contextName: 'AppDbContext',
      provider: 'Microsoft.EntityFrameworkCore.SqlServer',
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/ef/ef-migrations/ef-migrations').then((m) => m.EfMigrations),
  },
  {
    type: 'ef-linq',
    groupId: 'ef',
    name: 'LINQ & query assistant',
    label: 'LINQ & query assistant',
    description: 'Draft LINQ queries, EF Core performance patterns, and SQL translations.',
    keywords: ['linq', 'ef core', 'query', 'sql', 'expression', 'assistant', 'orm', 'c#', 'csharp', 'performance', 'include'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () => import('../../tools/ef/ef-linq/ef-linq').then((m) => m.EfLinq),
  },
  {
    type: 'ef-dbcontext',
    groupId: 'ef',
    name: 'DbContext generator',
    label: 'DbContext generator',
    description: 'Generate production-ready DbContext with DbSets, audit filters, and DI.',
    keywords: ['entity framework', 'ef core', 'dbcontext', 'dbset', 'onmodelcreating', 'dependency injection', 'database context', 'orm'],
    defaultConfig: {
      contextName: 'AppDbContext',
      namespace: 'MyApp.Infrastructure.Data',
      provider: 'SqlServer',
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () => import('../../tools/ef/ef-dbcontext/ef-dbcontext').then((m) => m.EfDbContext),
  },

  // SQL Group
  {
    type: 'sql-formatter',
    groupId: 'sql',
    name: 'Formatter',
    label: 'Formatter',
    description: 'Format SQL queries for easier reading.',
    keywords: ['sql', 'format', 'beautify', 'query', 'tsql', 'postgres', 'mysql', 'clean', 'indent', 'uppercase'],
    defaultConfig: {
      dialect: 'Standard SQL',
      indent: '2 spaces',
      keywordCase: 'upper',
      dataTypeCase: 'preserve',
      functionCase: 'preserve',
      identifierCase: 'preserve',
      logicalOperatorNewline: 'before',
      expressionWidth: 50,
      linesBetweenQueries: 1,
      denseOperators: false,
      newlineBeforeSemicolon: false,
    },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/sql/sql-formatter/sql-formatter').then((m) => m.SqlFormatter),
  },
  {
    type: 'sql-to-csharp',
    groupId: 'sql',
    name: 'SQL → C#',
    label: 'SQL → C#',
    description: 'Generate C# models from SQL definitions.',
    keywords: ['sql', 'c#', 'csharp', 'poco', 'model', 'class', 'query result', 'convert', 'entities', 'dapper'],
    defaultConfig: { outputType: 'class', className: 'QueryResult' },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/sql/sql-to-csharp/sql-to-csharp').then((m) => m.SqlToCsharp),
  },
  {
    type: 'sql-generator',
    groupId: 'sql',
    name: 'Sql generator',
    label: 'Sql generator',
    description: 'Parse DDL & SSMS grid data to generate CRUD SQL, batch queries & variables.',
    keywords: ['sql', 'ddl', 'crud', 'insert', 'update', 'select', 'table', 'ssms', 'generate', 'batch', 'grid', 'values'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/sql/sql-generator/sql-generator').then((m) => m.SqlGenerator),
  },
  {
    type: 'sql-search',
    groupId: 'sql',
    name: 'Search',
    label: 'Search',
    description: 'Search and inspect SQL snippets.',
    keywords: ['sql', 'search', 'snippets', 'stored procedures', 'indexes', 'queries', 'cheat sheet', 'foreign keys', 'metadata', 'find'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () => import('../../tools/sql/sql-search/sql-search').then((m) => m.SqlSearch),
  },
  {
    type: 'sql-query-builder',
    groupId: 'sql',
    name: 'Query builder',
    label: 'Query builder',
    description: 'Build SQL queries interactively.',
    keywords: ['sql', 'query builder', 'visual', 'interactive', 'join', 'filter', 'group by', 'select', 'insert', 'update'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/sql/sql-query-builder/sql-query-builder').then((m) => m.SqlQueryBuilder),
  },

  // API Group
  {
    type: 'openapi-inspector',
    groupId: 'api',
    name: 'OpenAPI inspector',
    label: 'OpenAPI inspector',
    description: 'Inspect endpoints and schemas from an OpenAPI document. Generate cURL commands.',
    keywords: ['openapi', 'swagger', 'api', 'endpoints', 'spec', 'documentation', 'curl', 'schema', 'rest', 'json'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/api/openapi-inspector/openapi-inspector').then((m) => m.OpenapiInspector),
  },
  {
    type: 'http-request-builder',
    groupId: 'api',
    name: 'HTTP request builder',
    label: 'HTTP request builder',
    description: 'Build, import cURL, and preview HTTP requests.',
    keywords: ['http', 'api', 'request', 'postman', 'rest', 'curl', 'fetch', 'client', 'webhook', 'headers', 'params', 'import curl', 'export curl'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/api/http-request-builder/http-request-builder').then(
        (m) => m.HttpRequestBuilder,
      ),
  },
  {
    type: 'jwt-inspector',
    groupId: 'api',
    name: 'JWT inspector',
    label: 'JWT inspector',
    description: 'Decode and inspect JWT headers, claims, and expiry.',
    keywords: ['jwt', 'token', 'bearer', 'auth', 'authentication', 'decode', 'claims', 'base64', 'header', 'payload', 'signature', 'expiry'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/api/jwt-inspector/jwt-inspector').then((m) => m.JwtInspector),
  },
  {
    type: 'curl-converter',
    groupId: 'api',
    name: 'cURL converter',
    label: 'cURL converter',
    description: 'Convert cURL commands into application code.',
    keywords: ['curl', 'bash', 'convert', 'http', 'fetch', 'c#', 'csharp', 'python', 'javascript', 'typescript', 'request', 'api'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/api/curl-converter/curl-converter').then((m) => m.CurlConverter),
  },

  // Frontend Group
  {
    type: 'api-generator',
    groupId: 'frontend',
    name: 'API client generator',
    label: 'API client generator',
    description: 'Generate a frontend client from an API shape.',
    keywords: ['api', 'client', 'frontend', 'fetch', 'axios', 'angular', 'react', 'service', 'http', 'rest', 'sdk'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/frontend/api-generator/api-generator').then((m) => m.ApiGenerator),
  },

  // General Group
  {
    type: 'guid-generator',
    groupId: 'general',
    name: 'GUID generator',
    label: 'GUID generator',
    description: 'Generate GUIDs in common formats.',
    keywords: ['guid', 'uuid', 'v4', 'random', 'unique', 'identifier', 'generate', 'id'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/general/guid-generator/guid-generator').then((m) => m.GuidGenerator),
  },
  {
    type: 'timestamp-converter',
    groupId: 'general',
    name: 'Timestamp converter',
    label: 'Timestamp converter',
    description: 'Convert timestamps between common formats.',
    keywords: ['timestamp', 'unix', 'epoch', 'datetime', 'iso', 'utc', 'timezone', 'date', 'time', 'clock', 'milliseconds'],
    defaultConfig: { defaultUnit: 'auto', hourFormat: '12h', autoTicker: true },
    hasSidebarOptions: true,
    defaultSidebarOpen: true,
    loadComponent: () =>
      import('../../tools/general/timestamp-converter/timestamp-converter').then(
        (m) => m.TimestampConverter,
      ),
  },
  {
    type: 'regex-tester',
    groupId: 'general',
    name: 'Regex tester',
    label: 'Regex tester',
    description: 'Test regular expressions against sample text.',
    keywords: ['regex', 'regular expression', 'pattern', 'test', 'matcher', 'match', 'extract', 'replace', 'groups'],
    hasSidebarOptions: true,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/general/regex-tester/regex-tester').then((m) => m.RegexTester),
  },
  {
    type: 'script-runner',
    groupId: 'general',
    name: 'Script runner',
    label: 'Script runner',
    description: 'Run utility scripts against supplied input.',
    keywords: ['script', 'runner', 'code', 'javascript', 'transform', 'eval', 'snippet', 'utility', 'automation', 'process'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/general/script-runner/script-runner').then((m) => m.ScriptRunner),
  },
  {
    type: 'documentation-hub',
    groupId: 'general',
    name: 'Documentation hub',
    label: 'Documentation hub',
    description: 'Keep useful development documentation close at hand.',
    keywords: ['docs', 'documentation', 'cheatsheet', 'reference', 'markdown', 'links', 'guide', 'manual', 'handbook'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () =>
      import('../../tools/general/documentation-hub/documentation-hub').then(
        (m) => m.DocumentationHub,
      ),
  },
  {
    type: 'terminal',
    groupId: 'general',
    name: 'Terminal',
    label: 'Terminal',
    description: 'Work with terminal commands and snippets including cURL, Git, and Docker.',
    keywords: ['terminal', 'console', 'cli', 'bash', 'shell', 'commands', 'curl', 'git', 'docker', 'powershell', 'snippets'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () => import('../../tools/general/terminal/terminal').then((m) => m.TerminalTool),
  },
  {
    type: 'log-viewer',
    groupId: 'general',
    name: 'Log viewer',
    label: 'Log viewer',
    description: 'Inspect and filter application logs.',
    keywords: ['logs', 'viewer', 'filter', 'parse', 'json logs', 'tail', 'trace', 'debug', 'grep', 'events'],
    hasSidebarOptions: false,
    defaultSidebarOpen: false,
    loadComponent: () => import('../../tools/general/log-viewer/log-viewer').then((m) => m.LogViewer),
  },
];

INITIAL_TOOLS.forEach(registerTool);

/**
 * Checks if a tool matches a search query across its label, name, description,
 * keywords, tool type, and parent group label.
 */
export function matchesToolSearch(tool: ToolDefinition, query: string, groupLabel?: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const terms = normalized.split(/\s+/).filter(Boolean);
  const searchableText = [
    tool.name ?? '',
    tool.label ?? '',
    tool.description,
    tool.type,
    tool.type.replace(/-/g, ' '),
    groupLabel ?? '',
    ...(tool.keywords ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return terms.every((term) => searchableText.includes(term));
}

/**
 * Returns contextual snippet/hint for search results.
 */
export function getToolSearchSnippet(tool: ToolDefinition, query: string): string {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tool.description;

  const terms = normalized.split(/\s+/).filter(Boolean);
  const matchedKeywords = (tool.keywords ?? []).filter((kw) =>
    terms.some((t) => kw.toLowerCase().includes(t)),
  );

  const labelLower = (tool.label || tool.name || '').toLowerCase();
  const isOnlyInLabel = terms.every((t) => labelLower.includes(t));

  if (matchedKeywords.length > 0 && !isOnlyInLabel) {
    return `Matches: ${matchedKeywords.slice(0, 3).join(', ')}`;
  }
  return tool.description;
}

export function getToolGroups(): ToolGroup[] {
  const groupMap = new Map<string, ToolDefinition[]>();
  for (const tool of TOOL_REGISTRY.values()) {
    const list = groupMap.get(tool.groupId) ?? [];
    list.push(tool);
    groupMap.set(tool.groupId, list);
  }

  return Object.entries(GROUP_METADATA)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, meta]) => ({
      id,
      label: meta.label,
      icon: meta.icon,
      tools: groupMap.get(id) ?? [],
    }))
    .filter((g) => g.tools.length > 0);
}

export const TOOL_GROUPS: ToolGroup[] = getToolGroups();

export function toolLabelFor(toolType: string): string {
  const tool = TOOL_REGISTRY.get(toolType);
  return tool ? (tool.label || tool.name) : toolType;
}

export function isValidToolType(toolType: string): boolean {
  return TOOL_REGISTRY.has(toolType);
}

export function findToolDefinition(
  toolType: string,
): { tool: ToolDefinition; group: ToolGroup } | null {
  const tool = TOOL_REGISTRY.get(toolType);
  if (!tool) return null;

  const meta = GROUP_METADATA[tool.groupId] ?? { label: tool.groupId, icon: 'apps', order: 99 };
  const group: ToolGroup = {
    id: tool.groupId,
    label: meta.label,
    icon: meta.icon,
    tools: Array.from(TOOL_REGISTRY.values()).filter((t) => t.groupId === tool.groupId),
  };

  return { tool, group };
}

export const UPCOMING_GROUPS: UpcomingGroup[] = [
  {
    id: 'database',
    label: 'Database',
    icon: 'storage',
    features: [
      {
        label: 'Query Runner',
        description: 'Connect to SQL Server/PostgreSQL/MySQL, execute queries, and return results.',
      },
      {
        label: 'Database Explorer',
        description:
          'Explore tables, views, procedures, functions, columns, keys, indexes, and database metadata.',
      },
      {
        label: 'Schema Search',
        description:
          'Search tables, columns, procedures, functions in a live DB with fuzzy search across database metadata.',
      },
    ],
  },
  {
    id: 'dotnet',
    label: '.NET',
    icon: 'code',
    features: [
      {
        label: 'Roslyn Analyzer',
        description: 'Semantic C# analysis to find classes, interfaces, references, and usages.',
      },
      {
        label: 'Solution Analyzer',
        description: 'Analyze .sln / .csproj files and perform project dependency analysis.',
      },
      {
        label: 'EF Core Tools',
        description: 'Inspect DbContext, EF entities/configurations, and EF metadata.',
      },
      {
        label: 'Migration Runner',
        description: 'Create, apply, or revert EF migrations in a project + database environment.',
      },
      {
        label: 'dotnet CLI',
        description:
          'Create/modify .csproj, .sln, source files, and run builds/tests via dotnet CLI.',
      },
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: 'play_arrow',
    features: [
      {
        label: 'Server Script Runner',
        description:
          'Execute C#, PowerShell, or shell/dotnet scripts with sandboxed execution, process execution, and environment variables.',
      },
    ],
  },
  {
    id: 'git-projects',
    label: 'Git / Projects',
    icon: 'account_tree',
    features: [
      {
        label: 'Repository + filesystem operations',
        description:
          'Clone/access repositories, search source code, analyze commits/branches, and generate changes/PRs.',
      },
      {
        label: 'Project-wide code generation',
        description:
          'Generate files directly into a .NET/Angular/React/Vue project, modify existing files, and run format/build/test afterward.',
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'psychology',
    features: [
      {
        label: 'LLM Gateway',
        description:
          'LLM calls through the backend for prompt/model management, usage limits, user/team quotas, keeping API keys private.',
      },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: 'cloud',
    features: [
      {
        label: 'Auth',
        description: 'User accounts, authentication, saved tools, and configuration settings.',
      },
      {
        label: 'Sync',
        description: 'Saved tools, script/template synchronization across devices.',
      },
      {
        label: 'Team Workspaces',
        description:
          'Shared/team script & template repository with versioning, permissions, and private/public libraries.',
      },
    ],
  },
];
