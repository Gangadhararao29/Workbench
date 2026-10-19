import { Component, Injector, Input, OnInit, computed, effect, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

type CliAction = 'add' | 'update' | 'script' | 'remove' | 'scaffold' | 'bundle';
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
    MatSlideToggleModule
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

  result = signal('');
  commandOutputLines = computed(() => this.result().split('\n'));
  copied = signal(false);
  private toolState = signal<ToolState | null>(null);
  private lastGenerationSignature: string | null = null;

  constructor(private instanceService: InstanceService, private injector: Injector) {
    effect(() => {
      const options = this.options();
      untracked(() => {
        this.applyOptions(options);
        this.generate();
      });
    });
  }

  options = computed(() =>
    this.toolState()?.state().options ?? defaultToolStateFor('ef-migrations')!.options
  );

  ngOnInit() {
    const toolState = new ToolState(this.instanceService, this.instanceId, 'ef-migrations');
    this.toolState.set(toolState);
    toolState.connect(
      () => this.readToolState(),
      (state) => this.restoreToolState(state),
      this.injector,
    );
    this.applyOptions(this.options());
    this.generate();
  }

  syncOptions(): void {
    this.toolState()?.updateOptions({
      project: this.project,
      startupProject: this.startupProject,
      contextName: this.contextName,
      provider: this.provider,
    });
    this.generate();
  }

  private readToolState(): ToolStateSnapshot {
    return {
      input: {
        migrationName: this.migrationName,
        targetMigration: this.targetMigration,
        fromMigration: this.fromMigration,
        toMigration: this.toMigration,
        outputDir: this.outputDir,
        connectionString: this.connectionString,
        runtime: this.runtime,
        scriptOutputFile: this.scriptOutputFile,
        bundleOutputFile: this.bundleOutputFile,
      },
      output: { document: this.result() },
      options: {
        ...this.options(),
        activeAction: this.activeAction(),
        cliMode: this.cliMode(),
        idempotent: this.idempotent,
        noBuild: this.noBuild,
        verbose: this.verbose,
        force: this.force,
        useDataAnnotations: this.useDataAnnotations,
      },
    };
  }

  private restoreToolState(state: ToolStateSnapshot): void {
    this.migrationName = state.input['migrationName'];
    this.targetMigration = state.input['targetMigration'];
    this.fromMigration = state.input['fromMigration'];
    this.toMigration = state.input['toMigration'];
    this.outputDir = state.input['outputDir'];
    this.connectionString = state.input['connectionString'];
    this.runtime = state.input['runtime'];
    this.scriptOutputFile = state.input['scriptOutputFile'];
    this.bundleOutputFile = state.input['bundleOutputFile'];
    const savedAction = state.options['activeAction'];
    this.activeAction.set(
      ['add', 'update', 'script', 'remove', 'scaffold', 'bundle'].includes(savedAction)
        ? savedAction
        : 'add',
    );
    this.cliMode.set(state.options['cliMode']);
    this.idempotent = state.options['idempotent'];
    this.noBuild = state.options['noBuild'];
    this.verbose = state.options['verbose'];
    this.force = state.options['force'];
    this.useDataAnnotations = state.options['useDataAnnotations'];
    this.result.set(state.output['document']);
  }

  private applyOptions(options: Record<string, any>): void {
    this.project = options['project'] ?? this.project;
    this.startupProject = options['startupProject'] ?? this.startupProject;
    this.contextName = options['contextName'] ?? this.contextName;
    this.provider = options['provider'] ?? this.provider;
  }

  copyResult(): void {
    const text = this.result();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      });
    }
  }

  setAction(action: CliAction) {
    this.activeAction.set(action);
    this.generate();
  }

  setMode(mode: CliMode) {
    this.cliMode.set(mode);
    this.generate();
  }

  isCommentLine(line: string): boolean {
    return line.trimStart().startsWith('#');
  }

  generate() {
    const snapshot = untracked(() => this.readToolState());
    const signature = JSON.stringify([snapshot.input, snapshot.options]);
    if (signature === this.lastGenerationSignature) return;
    this.lastGenerationSignature = signature;

    const action = this.activeAction();
    const mode = this.cliMode();

    if (mode === 'dotnet') {
      this.generateDotnetCli(action);
    } else {
      this.generatePmc(action);
    }
    this.toolState()?.save(this.readToolState());
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
        const range = from && to ? `${from} ${to}` : from ? from : to ? `0 ${to}` : '';

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
        const f = this.force ? '-Force' : '';
        commands.push(`# Package Manager Console (PMC) - Scaffold DbContext`);
        commands.push(`Scaffold-DbContext ${conn} ${prov} ${[o, c, p, s, da, f].filter(Boolean).join(' ')}`);
        break;
      }
      case 'bundle': {
        const out = this.bundleOutputFile.trim() ? `-o "${this.bundleOutputFile.trim()}"` : '';
        const r = this.runtime.trim() ? `-r ${this.runtime.trim()}` : '';
        const f = this.force ? '--force' : '';
        const pCli = this.project.trim() ? `-p "${this.project.trim()}"` : '';
        const sCli = this.startupProject.trim() ? `-s "${this.startupProject.trim()}"` : '';
        const cCli = this.contextName.trim() ? `-c ${this.contextName.trim()}` : '';
        commands.push(`# Note: Migration bundles are created via the dotnet CLI tool:`);
        commands.push(`dotnet ef migrations bundle ${[out, r, f, pCli, sCli, cCli].filter(Boolean).join(' ')}`);
        break;
      }
    }

    this.result.set(commands.join('\n'));
  }

}
