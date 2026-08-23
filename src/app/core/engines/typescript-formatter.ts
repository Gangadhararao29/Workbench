import * as prettier from 'prettier/standalone';
import * as typescriptPlugin from 'prettier/plugins/typescript';
import * as estreePlugin from 'prettier/plugins/estree';

export function formatTypescript(source: string): Promise<string> {
  return prettier.format(source, {
    parser: 'typescript',
    plugins: [typescriptPlugin, estreePlugin]
  });
}
