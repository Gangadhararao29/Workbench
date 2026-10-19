import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstanceService } from '../../../core/tool/tool-instance';
import { SqlGenerator } from './sql-generator';

describe('SqlGenerator', () => {
  let component: SqlGenerator;
  let fixture: ComponentFixture<SqlGenerator>;
  let instanceService: InstanceService;

  const ddl = `CREATE TABLE dbo.Users (
  Id INT NOT NULL PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Note VARCHAR(200) NULL DEFAULT 'Hello World'
);`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SqlGenerator] }).compileComponents();
    instanceService = TestBed.inject(InstanceService);
    await instanceService.ready;
    const instance = instanceService.open('sql-generator');
    fixture = TestBed.createComponent(SqlGenerator);
    component = fixture.componentInstance;
    component.instanceId = instance.id;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function parseTestDdl(): void {
    component.ddlInput.set(ddl);
    component.parseDdl();
  }

  it('preserves quoted defaults containing spaces', () => {
    parseTestDdl();

    expect(component.columns()[2].defaultValue).toBe("'Hello World'");
    expect(component.columns()[2].sampleValue).toBe('Hello World');
  });

  it('blocks UPDATE and DELETE when no WHERE key is selected', () => {
    parseTestDdl();
    component.toggleAllWhere(false);

    component.setOutputTab('update');
    expect(component.activeRawSql()).toContain('BLOCKED');

    component.setOutputTab('delete');
    expect(component.activeRawSql()).toContain('BLOCKED');
  });

  it('declares referenced T-SQL variables for SELECT and INSERT', () => {
    parseTestDdl();

    expect(component.activeRawSql()).toContain('DECLARE @Id');
    expect(component.activeRawSql()).toContain('DECLARE @Name');

    component.setOutputTab('insert');
    expect(component.activeRawSql()).toContain('DECLARE @Id');
    expect(component.activeRawSql()).toContain('DECLARE @Name');
  });

  it('uses dialect-specific pagination with numeric bounds', () => {
    parseTestDdl();
    component.includePagination.set(true);
    component.pageSize.set(12);
    component.offsetValue.set(4);

    component.setDialect('tsql');
    expect(component.selectSql()).toContain('OFFSET 4 ROWS\nFETCH NEXT 12 ROWS ONLY');

    component.setDialect('postgres');
    expect(component.selectSql()).toContain('LIMIT 12 OFFSET 4');

    component.pageSize.set(0);
    component.offsetValue.set(-2);
    expect(component.selectSql()).toContain('LIMIT 1 OFFSET 0');
  });

  it('generates guarded INSERT syntax for each supported dialect', () => {
    parseTestDdl();
    component.setOutputTab('insert');
    component.guardCondition.set('if_not_exists');

    component.setDialect('tsql');
    expect(component.insertSql()).toContain('IF NOT EXISTS');

    component.setDialect('postgres');
    expect(component.insertSql()).toContain('ON CONFLICT ("Id") DO NOTHING');

    component.setDialect('mysql');
    expect(component.insertSql()).toContain('INSERT IGNORE INTO');

    component.setDialect('sqlite');
    expect(component.insertSql()).toContain('INSERT OR IGNORE INTO');
  });

  it('uses MySQL syntax for default-only inserts and escaped backslashes', () => {
    parseTestDdl();
    component.toggleAllInsert(false);
    component.setDialect('mysql');
    expect(component.insertSql()).toContain('INSERT INTO `Users` () VALUES ();');

    component.onSsmsInputChange('Id,Name\n1,"C:\\docs"');
    expect(component.ssmsBatchSql()).toContain(String.raw`'C:\\docs'`);
  });

  it('parses quoted CSV fields and escaped quotes without shifting columns', () => {
    component.onSsmsInputChange('Id,Name,Note\n1,"Doe, Jane","He said ""hi"""');

    expect(component.parsedSsmsData().rows).toEqual([['1', 'Doe, Jane', 'He said "hi"']]);
    expect(component.ssmsBatchSql()).toContain("'Doe, Jane'");
    expect(component.ssmsBatchSql()).toContain(`'He said "hi"'`);
  });
});