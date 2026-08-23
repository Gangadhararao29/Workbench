import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SqlFormatter } from './sql-formatter';

describe('SqlFormatter', () => {
  let component: SqlFormatter;
  let fixture: ComponentFixture<SqlFormatter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlFormatter],
    }).compileComponents();

    fixture = TestBed.createComponent(SqlFormatter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
