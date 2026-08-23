const DEFAULT_CONFIGS: Record<string, Record<string, any>> = {
  'sql-formatter': { dialect: 'Standard SQL', indent: '2 spaces', uppercaseKeywords: true, breakOnCommas: true },
  'json-formatter': { indent: '2 spaces', sortKeys: false },
  'csharp-to-typescript': { outputType: 'interface', naming: 'camel', nullable: 'null', enumOutput: 'enum' },
  'json-to-typescript': { rootName: 'Root', outputType: 'interface' },
  'json-to-csharp': { rootName: 'Root' },
  'sql-to-csharp': { outputType: 'class', className: 'QueryResult' }
};

export function defaultConfigFor(toolType: string): Record<string, any> {
  return { ...(DEFAULT_CONFIGS[toolType] ?? {}) };
}