import { formatTypescript } from './typescript-formatter';

export interface JsonToTypescriptOptions {
  rootName?: string;
  asType?: boolean;
}

export async function convertJsonToTypescript(
  nameOrOptions: string | JsonToTypescriptOptions,
  value: Record<string, unknown> | string,
  asTypeLegacy?: boolean
): Promise<string> {
  const rootName = typeof nameOrOptions === 'string' ? nameOrOptions : (nameOrOptions.rootName || 'Root');
  const asType = typeof nameOrOptions === 'string' ? Boolean(asTypeLegacy) : Boolean(nameOrOptions.asType);

  const [{ quicktype }, { InputData, jsonInputForTargetLanguage }] = await Promise.all([
    import('quicktype-core/dist/esm/Run.js'),
    import('quicktype-core/dist/esm/input/Inputs.js'),
  ]);

  const sample = typeof value === 'string' ? value : JSON.stringify(value);
  const jsonInput = jsonInputForTargetLanguage('typescript');
  await jsonInput.addSource({
    name: rootName.trim() || 'Root',
    samples: [sample],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: 'typescript',
    rendererOptions: {
      'just-types': 'true',
      ...(asType ? { 'prefer-types': 'true' } : {}),
    },
  });

  const rawCode = result.lines.join('\n').trim();
  return formatTypescript(rawCode);
}
