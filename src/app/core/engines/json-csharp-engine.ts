export interface JsonToCsharpOptions {
  rootName?: string;
  namespace?: string;
  arrayType?: 'list' | 'array';
}

export async function convertJsonToCsharp(
  nameOrOptions: string | JsonToCsharpOptions,
  value: Record<string, unknown> | string
): Promise<string> {
  const rootName = typeof nameOrOptions === 'string' ? nameOrOptions : (nameOrOptions.rootName || 'Root');
  const namespace = typeof nameOrOptions === 'object' && nameOrOptions.namespace ? nameOrOptions.namespace : 'Workbench.Models';
  const arrayType = typeof nameOrOptions === 'object' && nameOrOptions.arrayType ? nameOrOptions.arrayType : 'list';

  const [{ quicktype }, { InputData, jsonInputForTargetLanguage }] = await Promise.all([
    import('quicktype-core/dist/esm/Run.js'),
    import('quicktype-core/dist/esm/input/Inputs.js'),
  ]);

  const sample = typeof value === 'string' ? value : JSON.stringify(value);
  const jsonInput = jsonInputForTargetLanguage('csharp');
  await jsonInput.addSource({
    name: rootName.trim() || 'Root',
    samples: [sample],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: 'csharp',
    rendererOptions: {
      'just-types': 'true',
      'csharp-version': '6',
      'namespace': namespace.trim() || 'Workbench.Models',
      'array-type': arrayType === 'array' ? 'array' : 'list',
    },
  });

  return result.lines.join('\n').trim();
}
