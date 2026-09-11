import { describe, it, expect, beforeEach } from 'vitest';
import { ToolInstanceService } from './tool-instance';
import { WorkspaceStorage } from '../workspace-storage';

describe('ToolInstanceService', () => {
  let service: ToolInstanceService;

  beforeEach(() => {
    try { window?.localStorage?.clear(); } catch {}
    service = new ToolInstanceService(new WorkspaceStorage());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('opens and selects a tool instance with default configuration and sidebar state', () => {
    service.open('sql-formatter', 'sql');

    expect(service.instances()).toHaveLength(1);
    expect(service.activeInstance()?.toolType).toBe('sql-formatter');
    expect(service.activeInstance()?.config['keywordCase']).toBe('upper');
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

  it('updates configuration without replacing the instance', () => {
    service.open('json-formatter', 'json');
    const id = service.activeInstance()!.id;

    service.updateConfig(id, { sortKeys: true });

    expect(service.activeInstance()?.config).toEqual({ indent: '2 spaces', sortKeys: true });
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
    expect(created.label).toContain('Formatter 1');
  });

  it('clones an instance with copied configuration and distinct identity', () => {
    const original = service.open('json-formatter', 'json');
    service.updateConfig(original.id, { indent: '4 spaces', sortKeys: true });

    const cloned = service.clone(original.id);

    expect(cloned).not.toBeNull();
    expect(cloned!.id).not.toBe(original.id);
    expect(cloned!.toolType).toBe('json-formatter');
    expect(cloned!.groupId).toBe('json');
    expect(cloned!.label).toContain('Formatter 2');
    expect(cloned!.config).toEqual({ indent: '4 spaces', sortKeys: true });

    // Verify mutating cloned config does not affect original
    service.updateConfig(cloned!.id, { indent: 'tab' });
    const updatedOriginal = service.instances().find(i => i.id === original.id);
    const updatedCloned = service.instances().find(i => i.id === cloned!.id);

    expect(updatedOriginal?.config['indent']).toBe('4 spaces');
    expect(updatedCloned?.config['indent']).toBe('tab');
  });

  it('updates and retrieves instance state', () => {
    const inst = service.open('sql-formatter', 'sql');
    service.updateState(inst.id, { query: 'SELECT * FROM users', cursorPosition: 12 });

    const state = service.getState<{ query: string; cursorPosition: number }>(inst.id);
    expect(state).toBeDefined();
    expect(state?.query).toBe('SELECT * FROM users');
    expect(state?.cursorPosition).toBe(12);

    // Partial update merges into state
    service.updateState(inst.id, { cursorPosition: 20 });
    const updatedState = service.getState<{ query: string; cursorPosition: number }>(inst.id);
    expect(updatedState?.query).toBe('SELECT * FROM users');
    expect(updatedState?.cursorPosition).toBe(20);
  });

  it('clones an instance with copied state', () => {
    const original = service.open('sql-formatter', 'sql');
    service.updateState(original.id, { editorText: 'SELECT 1;', mode: 'pretty' });

    const cloned = service.clone(original.id);
    expect(cloned).not.toBeNull();
    expect(cloned!.state).toEqual({ editorText: 'SELECT 1;', mode: 'pretty' });

    // Mutating cloned state does not affect original state
    service.updateState(cloned!.id, { editorText: 'SELECT 2;' });
    expect(service.getState(original.id)?.['editorText']).toBe('SELECT 1;');
    expect(service.getState(cloned!.id)?.['editorText']).toBe('SELECT 2;');
  });

  it('returns null when cloning a non-existent instance', () => {
    const result = service.clone('non-existent-id');
    expect(result).toBeNull();
  });
});
