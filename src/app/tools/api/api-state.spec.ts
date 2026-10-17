import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { InstanceService } from '../../core/tool/tool-instance';
import { HttpRequestBuilder } from './http-request-builder/http-request-builder';
import { JwtInspector } from './jwt-inspector/jwt-inspector';
import { OpenapiInspector } from './openapi-inspector/openapi-inspector';

describe('API tool state restoration', () => {
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpRequestBuilder, JwtInspector, OpenapiInspector],
    }).compileComponents();
    instanceService = TestBed.inject(InstanceService);
  });

  it('restores OpenAPI input and view options, then saves option changes', () => {
    const instance = instanceService.open('openapi-inspector');
    instanceService.updateState(instance.id, {
      input: { document: 'openapi: 3.0.0\ninfo:\n  title: Restored API\n  version: 1.0.0\npaths: {}' },
      options: { activeTab: 'overview', groupBy: 'method', searchQuery: 'users' },
    });

    const fixture = createFixture(OpenapiInspector, instance.id);
    const component = fixture.componentInstance;
    expect(component.input()).toContain('Restored API');
    expect(component.activeTab()).toBe('overview');
    expect(component.groupBy()).toBe('method');
    expect(component.searchQuery()).toBe('users');

    component.setGroupBy('path');
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.options['groupBy']).toBe('path');
  });

  it('restores JWT inputs and selected workspace tab', () => {
    const instance = instanceService.open('jwt-inspector');
    instanceService.updateState(instance.id, {
      input: { inspectToken: '', buildSecret: 'local-secret', verifyTokenInput: 'token-to-verify' },
      options: { activeTab: 'verify' },
    });

    const component = createFixture(JwtInspector, instance.id).componentInstance;
    expect(component.inspectInput()).toBe('');
    expect(component.buildSecret()).toBe('local-secret');
    expect(component.verifyTokenInput()).toBe('token-to-verify');
    expect(component.activeTab()).toBe('verify');
  });

  it('restores HTTP request configuration and persists nested header edits', () => {
    const instance = instanceService.open('http-request-builder');
    instanceService.updateState(instance.id, {
      input: {
        method: 'POST',
        url: 'https://api.example.test/items?source=url',
        params: [{ key: 'saved', value: 'keep', enabled: false }],
        headers: [{ key: 'X-Test', value: 'before', enabled: true }],
      },
      options: { authType: 'bearer', activeRequestTab: 'headers' },
    });

    const fixture = createFixture(HttpRequestBuilder, instance.id);
    const component = fixture.componentInstance;
    expect(component.method).toBe('POST');
    expect(component.url).toBe('https://api.example.test/items?source=url');
    expect(component.authType).toBe('bearer');
    expect(component.activeRequestTab).toBe('headers');
    expect(component.params).toEqual([{ key: 'saved', value: 'keep', enabled: false }]);

    component.headers[0].value = 'after';
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.input['headers'][0].value).toBe('after');
  });

  function createFixture<T>(component: Type<T>, instanceId: string): ComponentFixture<T> {
    const fixture = TestBed.createComponent<T>(component);
    fixture.componentRef.setInput('instanceId', instanceId);
    fixture.detectChanges();
    return fixture;
  }
});