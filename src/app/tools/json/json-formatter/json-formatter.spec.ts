import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonFormatter } from './json-formatter';

describe('JsonFormatter', () => {
  let component: JsonFormatter;
  let fixture: ComponentFixture<JsonFormatter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonFormatter],
    }).compileComponents();

    fixture = TestBed.createComponent(JsonFormatter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
