import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstanceService } from '../../../core/tool/tool-instance';
import { SqlSearch } from './sql-search';

describe('SQL Search state', () => {
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SqlSearch] }).compileComponents();
    instanceService = TestBed.inject(InstanceService);
  });

  it('initializes and persists favorites without a state feedback loop', () => {
    const instance = instanceService.open('sql-search');
    const fixture: ComponentFixture<SqlSearch> = TestBed.createComponent(SqlSearch);
    fixture.componentRef.setInput('instanceId', instance.id);
    fixture.detectChanges();

    expect(fixture.componentInstance.results().length).toBeGreaterThan(0);

    fixture.componentInstance.toggleFavorite('Find a table or column');
    fixture.detectChanges();

    expect(instanceService.getState(instance.id)?.options['favorites']).toEqual([
      'Find a table or column',
    ]);
  });
});