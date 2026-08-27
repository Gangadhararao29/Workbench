const DEFAULT_CONFIGS: Record<string, Record<string, any>> = {
  'sql-formatter': { dialect: 'Standard SQL', indent: '2 spaces', keywordCase: 'upper', dataTypeCase: 'preserve', functionCase: 'preserve', identifierCase: 'preserve', logicalOperatorNewline: 'before', expressionWidth: 50, linesBetweenQueries: 1, denseOperators: false, newlineBeforeSemicolon: false },
  'json-formatter': { indent: '2 spaces', sortKeys: false },
  'csharp-to-typescript': { outputType: 'interface', naming: 'camel', nullable: 'null', enumOutput: 'enum' },
  'json-to-typescript': { rootName: 'Root', outputType: 'interface' },
  'json-to-csharp': { rootName: 'Root' },
  'sql-to-csharp': { outputType: 'class', className: 'QueryResult' },
  'feature-generator': {
    includeEntity: true,
    includeDto: true,
    includeRepository: true,
    includeService: true,
    includeController: true,
    includeConfiguration: true,
    includeFrontend: true,
    frontendFramework: 'angular'
  }
};

export function defaultConfigFor(toolType: string): Record<string, any> {
  const conf = DEFAULT_CONFIGS[toolType];
  if (!conf) return {};
  return JSON.parse(JSON.stringify(conf));
}