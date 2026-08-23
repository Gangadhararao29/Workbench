import { TestBed } from '@angular/core/testing';
import { InstanceService } from './instance-service';

describe('InstanceService', () => {
  let service: InstanceService;

  beforeEach(() => {
    localStorage.clear();
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
    expect(service.activeInstance()?.config['uppercaseKeywords']).toBe(true);
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
});
