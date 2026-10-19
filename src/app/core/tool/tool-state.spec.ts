import { describe, expect, it } from 'vitest';
import { WorkspaceStorage } from '../workspace-storage';
import { ToolInstanceService } from './tool-instance';
import { defaultToolStateFor } from './tool-state-defaults';
import { ToolState } from './tool-state';

describe('ToolState', () => {
  it('provides complete defaults for every migrated JSON, C#, and SQL tool', () => {
    const toolTypes = [
      'json-formatter',
      'json-diff',
      'json-path',
      'json-to-typescript',
      'json-to-csharp',
      'json-to-yaml',
      'sql-formatter',
      'csharp-to-typescript',
      'csharp-to-json',
      'csharp-formatter',
      'feature-generator',
      'sql-to-csharp',
      'sql-generator',
      'sql-search',
      'sql-query-builder',
      'ef-configuration',
      'ef-migrations',
    ];

    for (const toolType of toolTypes) {
      const state = defaultToolStateFor(toolType);
      expect(state).not.toBeNull();
      expect(state).toHaveProperty('input');
      expect(state).toHaveProperty('output');
      expect(state).toHaveProperty('options');
    }
  });

  it('restores defaults and persists input, output, and options updates per instance', () => {
    const service = new ToolInstanceService(new WorkspaceStorage());
    const instance = service.open('json-formatter');
    const toolState = new ToolState(service, instance.id);

    expect(toolState.state().input['document']).toContain('"id"');
    expect(toolState.state().options['indent']).toBe('2 spaces');

    toolState.updateInput({ document: '{"saved":true}' });
    toolState.updateOutput({ document: '{\n  "saved": true\n}' });
    toolState.updateOptions({ indent: '4 spaces' });

    expect(toolState.state()).toEqual({
      input: { document: '{"saved":true}' },
      output: { document: '{\n  "saved": true\n}' },
      options: { indent: '4 spaces', sortKeys: false },
    });
    expect(service.getState(instance.id)).toEqual(toolState.state());
  });
});
