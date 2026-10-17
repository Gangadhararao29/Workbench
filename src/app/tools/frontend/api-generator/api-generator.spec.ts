import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ApiGenerator } from './api-generator';

describe('ApiGenerator state restoration', () => {
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ApiGenerator] }).compileComponents();
    instanceService = TestBed.inject(InstanceService);
  });

  it('keeps the existing Angular Signals Resource default for new instances', () => {
    const instance = instanceService.open('api-generator');
    const fixture: ComponentFixture<ApiGenerator> = TestBed.createComponent(ApiGenerator);
    fixture.componentRef.setInput('instanceId', instance.id);
    fixture.detectChanges();

    expect(fixture.componentInstance.framework()).toBe('angular');
    expect(fixture.componentInstance.pattern()).toBe('signals-resource');
  });

  it('restores generator inputs and options, then saves changes', () => {
    const instance = instanceService.open('api-generator');
    instanceService.updateState(instance.id, {
      input: { resourceName: 'Customer', endpoint: '/v2/customers/{id}', method: 'PATCH' },
      options: {
        framework: 'react',
        pattern: 'custom-hook',
        mode: 'single',
        includeErrorHandling: false,
        includeCancellation: true,
        includeAuth: false,
        includePagination: false,
        includeTsDoc: false,
        activeTab: 'tests',
      },
    });

    const fixture: ComponentFixture<ApiGenerator> = TestBed.createComponent(ApiGenerator);
    fixture.componentRef.setInput('instanceId', instance.id);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.framework()).toBe('react');
    expect(component.pattern()).toBe('custom-hook');
    expect(component.mode()).toBe('single');
    expect(component.resourceName()).toBe('Customer');
    expect(component.endpoint()).toBe('/v2/customers/{id}');
    expect(component.method()).toBe('PATCH');
    expect(component.activeTab()).toBe('tests');
    expect(component.includeErrorHandling()).toBe(false);
    expect(component.activeCode()).toContain('Customer');

    component.setMode('crud');
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.options['mode']).toBe('crud');
  });
});
