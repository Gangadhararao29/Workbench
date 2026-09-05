import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';

type CliAction = 'add' | 'update' | 'script' | 'remove' | 'scaffold' | 'bundle' | 'custom-cs';
type CliMode = 'dotnet' | 'pmc';

@Component({
  selector: 'app-ef-migrations',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatSlideToggleModule,
    CodeEditor
  ],
  templateUrl: './ef-migrations.html',
  styleUrls: ['./ef-migrations.css']
})
export class EfMigrations implements OnInit {
  @Input({ required: true }) instanceId!: string;

  activeAction = signal<CliAction>('add');
  cliMode = signal<CliMode>('dotnet'); // 'dotnet' (dotnet ef) or 'pmc' (PowerShell Add-Migration)

  // Form Fields
  migrationName = 'AddCustomerAddressAndIndexes';
  targetMigration = '';
  fromMigration = '';
  toMigration = '';
  project = 'src/Infrastructure';
  startupProject = 'src/WebApi';
  contextName = 'AppDbContext';
  outputDir = 'Data/Migrations';
  connectionString = 'Server=localhost;Database=AppDb;Trusted_Connection=True;TrustServerCertificate=True;';
  provider = 'Microsoft.EntityFrameworkCore.SqlServer';
  runtime = 'linux-x64';
  scriptOutputFile = 'migrations.sql';
  bundleOutputFile = 'efbundle.exe';

  // Flags
  idempotent = true;
  noBuild = false;
  verbose = false;
  force = false;
  useDataAnnotations = false;

  // Custom C# Snippet builder
  customSnippetType = 'sql'; // sql | index | add-column | view | seed
  customSqlUp = 'UPDATE Customers SET Status = 1 WHERE Status IS NULL;';
  customSqlDown = 'UPDATE Customers SET Status = NULL WHERE Status = 1;';
  customTable = 'Customers';
  customColumn = 'Status';
  customType = 'int';

  result = signal('');

  constructor(private instanceService: InstanceService) {
    effect(() => {
      this.config();
      this.generate();
    });
  }

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  ngOnInit() {
    // Populate defaults from instance config if present
    const conf = this.config();
    if (conf['project']) this.project = conf['project'];
    if (conf['startupProject']) this.startupProject = conf['startupProject'];
    if (conf['contextName']) this.contextName = conf['contextName'];
    if (conf['provider']) this.provider = conf['provider'];
    if (conf['connectionString']) this.connectionString = conf['connectionString'];

    this.generate();
  }

  setAction(action: CliAction) {
    this.activeAction.set(action);
    this.generate();
  }

  setMode(mode: CliMode) {
    this.cliMode.set(mode);
    this.generate();
  }

  generate() {
    const action = this.activeAction();
    const mode = this.cliMode();

    if (action === 'custom-cs') {
      this.generateCustomCs();
      return;
    }

    if (mode === 'dotnet') {
      this.generateDotnetCli(action);
    } else {
      this.generatePmc(action);
    }
  }

  private generateDotnetCli(action: CliAction) {
    const p = this.project.trim() ? `-p "${this.project.trim()}"` : '';
    const s = this.startupProject.trim() ? `-s "${this.startupProject.trim()}"` : '';
    const c = this.contextName.trim() ? `-c ${this.contextName.trim()}` : '';
    const nb = this.noBuild ? '--no-build' : '';
    const v = this.verbose ? '-v' : '';
    const common = [p, s, c, nb, v].filter(Boolean).join(' ');

    const commands: string[] = [];

    switch (action) {
      case 'add': {
        const name = this.migrationName.trim() || 'InitialMigration';
        const o = this.outputDir.trim() ? `-o "${this.outputDir.trim()}"` : '';
        commands.push(`# Add a new migration`);
        commands.push(`dotnet ef migrations add ${name} ${[common, o].filter(Boolean).join(' ')}`);
        commands.push('');
        commands.push(`# Verify build and pending migrations list:`);
        commands.push(`dotnet ef migrations list ${common}`);
        break;
      }
      case 'update': {
        const target = this.targetMigration.trim();
        const conn = this.connectionString.trim() ? `--connection "${this.connectionString.trim()}"` : '';
        commands.push(`# Update database to the latest (or specific) migration`);
        commands.push(`dotnet ef database update ${target ? target + ' ' : ''}${[common, conn].filter(Boolean).join(' ')}`);
        commands.push('');
        commands.push(`# Useful Rollback Tips:`);
        commands.push(`# Rollback to initial empty DB: dotnet ef database update 0 ${common}`);
        if (target) {
          commands.push(`# Rollback to target '${target}': dotnet ef database update ${target} ${common}`);
        }
        break;
      }
      case 'script': {
        const out = this.scriptOutputFile.trim() ? `-o "${this.scriptOutputFile.trim()}"` : '';
        const idemp = this.idempotent ? '--idempotent' : '';
        const from = this.fromMigration.trim() ? this.fromMigration.trim() : '';
        const to = this.toMigration.trim() ? this.toMigration.trim() : '';
        const range = from && to ? `${from} ${to}` : from ? `${from}` : '';

        commands.push(`# Generate idempotent SQL deployment script for CI/CD or DBA review`);
        commands.push(`dotnet ef migrations script ${range ? range + ' ' : ''}${[idemp, out, common].filter(Boolean).join(' ')}`);
        break;
      }
      case 'remove': {
        const f = this.force ? '--force' : '';
        commands.push(`# Revert the last created migration (before applying to DB)`);
        commands.push(`dotnet ef migrations remove ${[f, common].filter(Boolean).join(' ')}`);
        break;
      }
      case 'scaffold': {
        const conn = `"${this.connectionString.trim() || 'Server=localhost;Database=AppDb;'}"`;
        const prov = this.provider.trim() || 'Microsoft.EntityFrameworkCore.SqlServer';
        const o = this.outputDir.trim() ? `-o "${this.outputDir.trim()}"` : '-o Models';
        const cOpt = this.contextName.trim() ? `-c ${this.contextName.trim()}` : '';
        const da = this.useDataAnnotations ? '--data-annotations' : '';
        const f = this.force ? '--force' : '';

        commands.push(`# Reverse Engineer (Scaffold) entities & DbContext from existing database`);
        commands.push(`dotnet ef dbcontext scaffold ${conn} ${prov} ${[o, cOpt, p, s, da, f].filter(Boolean).join(' ')}`);
        break;
      }
      case 'bundle': {
        const out = this.bundleOutputFile.trim() ? `-o "${this.bundleOutputFile.trim()}"` : '';
        const r = this.runtime.trim() ? `-r ${this.runtime.trim()}` : '';
        const f = this.force ? '--force' : '';

        commands.push(`# Create a self-contained migration executable bundle (perfect for container startup / pipelines)`);
        commands.push(`dotnet ef migrations bundle ${[out, r, f, common].filter(Boolean).join(' ')}`);
        commands.push('');
        commands.push(`# Run the generated bundle against target database:`);
        commands.push(`./${this.bundleOutputFile.trim() || 'efbundle'} --connection "${this.connectionString.trim()}"`);
        break;
      }
    }

    this.result.set(commands.join('\n'));
  }

  private generatePmc(action: CliAction) {
    const p = this.project.trim() ? `-Project "${this.project.trim()}"` : '';
    const s = this.startupProject.trim() ? `-StartupProject "${this.startupProject.trim()}"` : '';
    const c = this.contextName.trim() ? `-Context "${this.contextName.trim()}"` : '';
    const v = this.verbose ? '-Verbose' : '';
    const common = [p, s, c, v].filter(Boolean).join(' ');

    const commands: string[] = [];

    switch (action) {
      case 'add': {
        const name = this.migrationName.trim() || 'InitialMigration';
        const o = this.outputDir.trim() ? `-OutputDir "${this.outputDir.trim()}"` : '';
        commands.push(`# Package Manager Console (PMC) - Add Migration`);
        commands.push(`Add-Migration ${name} ${[common, o].filter(Boolean).join(' ')}`);
        break;
      }
      case 'update': {
        const target = this.targetMigration.trim();
        const conn = this.connectionString.trim() ? `-Connection "${this.connectionString.trim()}"` : '';
        commands.push(`# Package Manager Console (PMC) - Update Database`);
        commands.push(`Update-Database ${target ? '-TargetMigration "' + target + '" ' : ''}${[common, conn].filter(Boolean).join(' ')}`);
        break;
      }
      case 'script': {
        const out = this.scriptOutputFile.trim() ? `-Output "${this.scriptOutputFile.trim()}"` : '';
        const idemp = this.idempotent ? '-Idempotent' : '';
        const from = this.fromMigration.trim() ? `-From "${this.fromMigration.trim()}"` : '';
        const to = this.toMigration.trim() ? `-To "${this.toMigration.trim()}"` : '';
        commands.push(`# Package Manager Console (PMC) - Script Migration`);
        commands.push(`Script-Migration ${[from, to, idemp, out, common].filter(Boolean).join(' ')}`);
        break;
      }
      case 'remove': {
        const f = this.force ? '-Force' : '';
        commands.push(`# Package Manager Console (PMC) - Remove Migration`);
        commands.push(`Remove-Migration ${[f, common].filter(Boolean).join(' ')}`);
        break;
      }
      case 'scaffold': {
        const conn = `"${this.connectionString.trim() || 'Server=localhost;Database=AppDb;'}"`;
        const prov = `"${this.provider.trim() || 'Microsoft.EntityFrameworkCore.SqlServer'}"`;
        const o = this.outputDir.trim() ? `-OutputDir "${this.outputDir.trim()}"` : '-OutputDir "Models"';
        const da = this.useDataAnnotations ? '-DataAnnotations' : '';
        commands.push(`# Package Manager Console (PMC) - Scaffold DbContext`);
        commands.push(`Scaffold-DbContext ${conn} ${prov} ${[o, c, p, s, da].filter(Boolean).join(' ')}`);
        break;
      }
      case 'bundle': {
        commands.push(`# Note: Migration bundles are created via dotnet CLI.`);
        commands.push(`dotnet ef migrations bundle -p "${this.project}" -s "${this.startupProject}" -c ${this.contextName}`);
        break;
      }
    }

    this.result.set(commands.join('\n'));
  }

  private generateCustomCs() {
    const lines: string[] = [
      'using Microsoft.EntityFrameworkCore.Migrations;',
      '',
      '#nullable disable',
      '',
      `public partial class CustomOperations_${Date.now()} : Migration`,
      '{',
      '    protected override void Up(MigrationBuilder migrationBuilder)',
      '    {'
    ];

    if (this.customSnippetType === 'sql') {
      lines.push(`        migrationBuilder.Sql(@"`);
      lines.push(`            ${this.customSqlUp.replace(/\n/g, '\n            ')}`);
      lines.push('        ");');
    } else if (this.customSnippetType === 'index') {
      lines.push(`        migrationBuilder.CreateIndex(`);
      lines.push(`            name: "IX_${this.customTable}_${this.customColumn}",`);
      lines.push(`            table: "${this.customTable}",`);
      lines.push(`            column: "${this.customColumn}",`);
      lines.push(`            unique: true,`);
      lines.push(`            filter: "[IsDeleted] = 0");`);
    } else if (this.customSnippetType === 'add-column') {
      lines.push(`        migrationBuilder.AddColumn<${this.customType}>(`);
      lines.push(`            name: "${this.customColumn}",`);
      lines.push(`            table: "${this.customTable}",`);
      lines.push(`            type: "${this.customType === 'int' ? 'int' : this.customType === 'string' ? 'nvarchar(200)' : 'bit'}",`);
      lines.push(`            nullable: true);`);
    } else if (this.customSnippetType === 'view') {
      lines.push(`        migrationBuilder.Sql(@"`);
      lines.push(`            CREATE OR ALTER VIEW Vw_ActiveCustomers AS`);
      lines.push(`            SELECT Id, FirstName, LastName, Email`);
      lines.push(`            FROM Customers`);
      lines.push(`            WHERE IsDeleted = 0;`);
      lines.push('        ");');
    }

    lines.push('    }');
    lines.push('');
    lines.push('    protected override void Down(MigrationBuilder migrationBuilder)');
    lines.push('    {');

    if (this.customSnippetType === 'sql') {
      lines.push(`        migrationBuilder.Sql(@"`);
      lines.push(`            ${this.customSqlDown.replace(/\n/g, '\n            ')}`);
      lines.push('        ");');
    } else if (this.customSnippetType === 'index') {
      lines.push(`        migrationBuilder.DropIndex(`);
      lines.push(`            name: "IX_${this.customTable}_${this.customColumn}",`);
      lines.push(`            table: "${this.customTable}");`);
    } else if (this.customSnippetType === 'add-column') {
      lines.push(`        migrationBuilder.DropColumn(`);
      lines.push(`            name: "${this.customColumn}",`);
      lines.push(`            table: "${this.customTable}");`);
    } else if (this.customSnippetType === 'view') {
      lines.push(`        migrationBuilder.Sql(@"`);
      lines.push(`            DROP VIEW IF EXISTS Vw_ActiveCustomers;`);
      lines.push('        ");');
    }

    lines.push('    }');
    lines.push('}');

    this.result.set(lines.join('\n'));
  }
}
