import { TestBed } from '@angular/core/testing';
import { InstanceService } from './instance-service';

describe('InstanceService', () => {
  let service: InstanceService;

  beforeEach(() => {
    try { window?.localStorage?.clear(); } catch {}
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('opens and selects a tool instance with default configuration', () => {
    service.open('sql-formatter', 'sql');

    expect(service.instances()).toHaveLength(1);
    expect(service.activeInstance()?.toolType).toBe('sql-formatter');
    expect(service.activeInstance()?.config['keywordCase']).toBe('upper');
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

  it('returns null when cloning a non-existent instance', () => {
    const result = service.clone('non-existent-id');
    expect(result).toBeNull();
  });
});
