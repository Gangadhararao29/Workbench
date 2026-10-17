import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonFormatter } from './json-formatter';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('JsonFormatter', () => {
  let component: JsonFormatter;
  let fixture: ComponentFixture<JsonFormatter>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonFormatter],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(JsonFormatter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('restores saved editor input and persists subsequent edits', () => {
    const instance = instanceService.open('json-formatter');
    instanceService.updateState(instance.id, {
      input: { document: '{"restored":true}' },
      output: { document: '' },
      options: { indent: '2 spaces', sortKeys: false },
    });
    component.instanceId = instance.id;
    component.ngOnInit();

    expect(component.input()).toBe('{"restored":true}');

    component.onInputChange('{"updated":true}');
    expect(instanceService.getState(instance.id)).toEqual({
      input: { document: '{"updated":true}' },
      output: { document: '' },
      options: { indent: '2 spaces', sortKeys: false },
    });
  });
});
