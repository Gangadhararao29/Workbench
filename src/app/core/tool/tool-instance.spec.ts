import { describe, it, expect, beforeEach } from 'vitest';
import { ToolInstanceService } from './tool-instance';
import { WorkspaceStorage } from '../workspace-storage';
import { ToolState } from './tool-state';

describe('ToolInstanceService', () => {
  let service: ToolInstanceService;

  beforeEach(async () => {
    try { window?.localStorage?.clear(); } catch {}
    const storage = new WorkspaceStorage();
    service = new ToolInstanceService(storage);
    await service.ready;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('ignores legacy saved state and starts fresh when recreating the service', () => {
    const storage = new WorkspaceStorage();
    const savedInstance = {
      id: 'saved-instance',
      toolType: 'json-formatter',
      label: 'JSON Formatter',
      groupId: 'json',
      config: {},
      state: {
        input: { document: '{"saved":true}' },
        output: { document: '' },
        options: { indent: '4 spaces', sortKeys: false },
      },
    };
    storage.set('workbench.instances', [savedInstance]);
    storage.set('workbench.active-instance', savedInstance.id);

    const restoredService = new ToolInstanceService(storage);

    expect(restoredService.instances()).toEqual([]);
    expect(restoredService.activeInstance()).toBeNull();
  });

  it('hydrates instances and selection from IndexedDB when the sync cache is empty', async () => {
    const storage = new WorkspaceStorage();
    const savedInstance = {
      id: 'indexeddb-instance',
      toolType: 'json-formatter',
      label: 'JSON Formatter',
      groupId: 'json',
      config: {},
      state: {
        input: { document: '{"from":"indexeddb"}' },
        output: { document: '' },
        options: { indent: '4 spaces', sortKeys: false },
      },
    };
    vi.spyOn(storage, 'getAsync').mockImplementation(async <T>(key: string, fallback: T): Promise<T> => {
      const value = key === 'workbench.instances'
        ? [savedInstance]
        : key === 'workbench.active-instance'
          ? savedInstance.id
          : fallback;
      return value as T;
    });

    const restoredService = new ToolInstanceService(storage);
    await restoredService.ready;

    expect(restoredService.instances()).toEqual([savedInstance]);
    expect(restoredService.activeInstance()?.id).toBe(savedInstance.id);
  });

  it('discards persisted instances for removed tools during hydration', async () => {
    const storage = new WorkspaceStorage();
    const savedInstances = [
      {
        id: 'current-instance',
        toolType: 'json-formatter',
        label: 'JSON Formatter',
        groupId: 'json',
        config: {},
        state: { input: {}, output: {}, options: {} },
      },
      {
        id: 'removed-instance',
        toolType: 'ef-linq',
        label: 'LINQ & query assistant',
        groupId: 'ef',
        config: {},
        state: { input: {}, output: {}, options: {} },
      },
    ];
    vi.spyOn(storage, 'getAsync').mockImplementation(async <T>(key: string, fallback: T): Promise<T> => {
      const value = key === 'workbench.instances'
        ? savedInstances
        : key === 'workbench.active-instance'
          ? 'removed-instance'
          : fallback;
      return value as T;
    });

    const restoredService = new ToolInstanceService(storage);
    await restoredService.ready;

    expect(restoredService.instances().map((instance) => instance.id)).toEqual(['current-instance']);
    expect(restoredService.activeInstance()).toBeNull();
  });

  it('opens and selects a tool instance with default configuration and sidebar state', () => {
    service.open('sql-formatter', 'sql');

    expect(service.instances()).toHaveLength(1);
    expect(service.activeInstance()?.toolType).toBe('sql-formatter');
    expect(service.activeInstance()?.state?.['options']['keywordCase']).toBe('upper');
    expect(service.hasOptions()).toBe(true);
    expect(service.rightDrawerOpened()).toBe(true);
  });

  it('handles tools without options and closes sidebar', () => {
    service.open('guid-generator', 'general');

    expect(service.hasOptions()).toBe(false);
    expect(service.rightDrawerOpened()).toBe(false);
  });

  it('manages searchQuery correctly', () => {
    expect(service.searchQuery()).toBe('');
    service.searchQuery.set('formatter');
    expect(service.searchQuery()).toBe('formatter');
  });

  it('updates options in ToolState without replacing the instance', () => {
    service.open('json-formatter', 'json');
    const id = service.activeInstance()!.id;

    new ToolState(service, id).updateOptions({ sortKeys: true });

    expect(service.activeInstance()?.state?.['options']).toEqual({ indent: '2 spaces', sortKeys: true });
  });

  it('archives and reopens an instance', () => {
    service.open('guid-generator', 'general');
    const id = service.activeInstance()!.id;

    service.close(id);
    expect(service.instances()).toHaveLength(0);
    expect(service.archived()).toHaveLength(1);

    service.reopen(id);
    expect(service.instances()).toHaveLength(1);
    expect(service.activeInstance()?.id).toBe(id);
  });

  it('closes all open instances and clears the active instance', () => {
    service.open('json-formatter', 'json');
    service.open('sql-formatter', 'sql');

    service.closeAll();

    expect(service.instances()).toHaveLength(0);
    expect(service.activeInstance()).toBeNull();
    expect(service.archived()).toHaveLength(2);
  });

  it('open returns the created ToolInstance', () => {
    const created = service.open('json-formatter', 'json');

    expect(created).toBeDefined();
    expect(created.id).toBeTruthy();
    expect(created.toolType).toBe('json-formatter');
    expect(created.groupId).toBe('json');
    expect(created.label).toBe('Formatter');
  });

  it('clones an instance with copied options and distinct identity', () => {
    const original = service.open('json-formatter', 'json');
    new ToolState(service, original.id).updateOptions({ indent: '4 spaces', sortKeys: true });

    const cloned = service.clone(original.id);

    expect(cloned).not.toBeNull();
    expect(cloned!.id).not.toBe(original.id);
    expect(cloned!.toolType).toBe('json-formatter');
    expect(cloned!.groupId).toBe('json');
    expect(cloned!.label).toContain('Formatter 2');
    expect(cloned!.state?.['options']).toEqual({ indent: '4 spaces', sortKeys: true });

    // Verify mutating cloned options does not affect original
    new ToolState(service, cloned!.id).updateOptions({ indent: 'tab' });
    const updatedOriginal = service.instances().find(i => i.id === original.id);
    const updatedCloned = service.instances().find(i => i.id === cloned!.id);

    expect(updatedOriginal?.state?.['options']['indent']).toBe('4 spaces');
    expect(updatedCloned?.state?.['options']['indent']).toBe('tab');
  });

  it('updates and retrieves instance state', () => {
    const inst = service.open('sql-formatter', 'sql');
    const toolState = new ToolState(service, inst.id);
    toolState.updateInput({ document: 'SELECT * FROM users', cursorPosition: 12 });

    expect(toolState.state().input['document']).toBe('SELECT * FROM users');
    expect(toolState.state().input['cursorPosition']).toBe(12);

    // Partial update merges into state
    toolState.updateInput({ cursorPosition: 20 });
    expect(toolState.state().input['document']).toBe('SELECT * FROM users');
    expect(toolState.state().input['cursorPosition']).toBe(20);
  });

  it('clones an instance with copied state', () => {
    const original = service.open('sql-formatter', 'sql');
    new ToolState(service, original.id).updateInput({ document: 'SELECT 1;' });

    const cloned = service.clone(original.id);
    expect(cloned).not.toBeNull();
    expect(cloned!.state?.['input']['document']).toBe('SELECT 1;');

    // Mutating cloned state does not affect original state
    new ToolState(service, cloned!.id).updateInput({ document: 'SELECT 2;' });
    expect(service.getState(original.id)?.['input']['document']).toBe('SELECT 1;');
    expect(service.getState(cloned!.id)?.['input']['document']).toBe('SELECT 2;');
  });

  it('returns null when cloning a non-existent instance', () => {
    const result = service.clone('non-existent-id');
    expect(result).toBeNull();
  });
});
