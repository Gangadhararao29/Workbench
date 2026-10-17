import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstanceService } from '../../core/tool/tool-instance';
import { GuidGenerator } from './guid-generator/guid-generator';
import { LogViewer } from './log-viewer/log-viewer';
import { RegexTester } from './regex-tester/regex-tester';
import { ScriptRunner } from './script-runner/script-runner';
import { TerminalTool } from './terminal/terminal';
import { TimestampConverter } from './timestamp-converter/timestamp-converter';

describe('General tool state restoration', () => {
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidGenerator, LogViewer, RegexTester, ScriptRunner, TerminalTool, TimestampConverter],
    }).compileComponents();
    instanceService = TestBed.inject(InstanceService);
  });

  it('restores timestamp inputs and saves selected tabs and units', () => {
    const instance = instanceService.open('timestamp-converter');
    instanceService.updateState(instance.id, {
      input: { timestamp: '2025-01-02T03:04:05Z', diffDateB: '+3d' },
      options: { activeTab: 'math', unit: 'iso' },
    });

    const fixture = createFixture(TimestampConverter, instance.id);
    const component = fixture.componentInstance;
    expect(component.input()).toBe('2025-01-02T03:04:05Z');
    expect(component.diffDateB()).toBe('+3d');
    expect(component.activeTab()).toBe('math');
    expect(component.unit()).toBe('iso');
    component.unit.set('seconds');
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.options['unit']).toBe('seconds');
    fixture.destroy();
  });

  it('restores regex pattern and test cases, then saves edits', () => {
    const instance = instanceService.open('regex-tester');
    instanceService.updateState(instance.id, {
      input: { pattern: 'item-(\\d+)', flags: 'i', testCases: [{ id: 'case-1', text: 'item-42' }] },
    });

    const fixture = createFixture(RegexTester, instance.id);
    const component = fixture.componentInstance;
    expect(component.pattern()).toBe('item-(\\d+)');
    expect(component.testCases()[0].text).toBe('item-42');
    component.replacement.set('id-$1');
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.input['replacement']).toBe('id-$1');
  });

  it('restores terminal category, command, and parameter values', () => {
    const instance = instanceService.open('terminal');
    instanceService.updateState(instance.id, {
      input: {
        searchQuery: 'container',
        selectedCommandName: 'Run Container',
        paramValues: { hostPort: '9000', containerPort: '8080', name: 'api', image: 'nginx:alpine' },
      },
      options: { activeCategory: 'docker', activeLevel: 'basic' },
    });

    const fixture = createFixture(TerminalTool, instance.id);
    const component = fixture.componentInstance;
    expect(component.activeCategory()).toBe('docker');
    expect(component.selectedCommand()?.name).toBe('Run Container');
    expect(component.paramValues()['hostPort']).toBe('9000');
    expect(component.generatedCommand()).toContain('nginx:alpine');
  });

  it('restores log source and filters, then saves edited log text', () => {
    const instance = instanceService.open('log-viewer');
    instanceService.updateState(instance.id, {
      input: { rawLogs: '2025-01-01T00:00:00Z [ERROR] restored failure' },
      options: { activeLevel: 'error', searchQuery: 'failure', selectedFormat: 'plaintext' },
    });

    const fixture = createFixture(LogViewer, instance.id);
    const component = fixture.componentInstance;
    expect(component.rawLogs).toContain('restored failure');
    expect(component.activeLevel()).toBe('error');
    expect(component.searchQuery()).toBe('failure');
    expect(component.selectedFormat()).toBe('plaintext');
    component.loadRawLogs('new log line');
    expect(instanceService.getState(instance.id)?.input['rawLogs']).toBe('new log line');
  });

  it('restores script definition and execution result', () => {
    const instance = instanceService.open('script-runner');
    instanceService.updateState(instance.id, {
      input: { inputs: '{"value":2}', script: 'return inputs.value * 2;', scriptName: 'Double', definition: '{}' },
      output: { result: '4', status: 'success' },
      options: { inputType: 'json' },
    });

    const fixture = createFixture(ScriptRunner, instance.id);
    const component = fixture.componentInstance;
    expect(component.inputs).toBe('{"value":2}');
    expect(component.script).toBe('return inputs.value * 2;');
    expect(component.scriptName).toBe('Double');
    expect(component.result()).toBe('4');
    component.setScript('return inputs.value + 1;');
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.input['script']).toBe('return inputs.value + 1;');
  });

  it('restores GUID options and generated output', () => {
    const instance = instanceService.open('guid-generator');
    instanceService.updateState(instance.id, {
      input: { count: 4 },
      output: { result: 'restored-guid-list' },
      options: { casing: 'upper', format: 'json' },
    });

    const fixture = createFixture(GuidGenerator, instance.id);
    const component = fixture.componentInstance;
    expect(component.count).toBe(4);
    expect(component.casing).toBe('upper');
    expect(component.format).toBe('json');
    expect(component.result()).toBe('restored-guid-list');
    component.setCount(5);
    fixture.detectChanges();
    expect(instanceService.getState(instance.id)?.input['count']).toBe(5);
  });

  function createFixture<T>(component: Type<T>, instanceId: string): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    fixture.componentRef.setInput('instanceId', instanceId);
    fixture.detectChanges();
    return fixture;
  }
});