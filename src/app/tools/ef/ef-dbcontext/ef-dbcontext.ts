import { Component, Injector, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateEfDbContext,
  DatabaseProvider,
  EfDbContextOptions,
} from '../../../core/engines/ef-dbcontext-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

@Component({
  selector: 'app-ef-dbcontext',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatSlideToggleModule,
    CodeEditor,
  ],
  templateUrl: './ef-dbcontext.html',
  styleUrls: ['./ef-dbcontext.css'],
})
export class EfDbContext implements OnInit {
  @Input({ required: true }) instanceId!: string;

  contextName = 'AppDbContext';
  namespace = 'MyApp.Infrastructure.Data';
  entitiesText = 'Customer\nOrder\nProduct\nCategory\nOrderItem\nUser\nRole';
  provider: DatabaseProvider = 'SqlServer';

  // Features
  useAssemblyConfigurations = true;
  includeAuditInterceptor = true;
  includeSoftDeleteFilter = true;
  includeDiExtension = true;
  includeDesignTimeFactory = true;
  useDbContextPool = true;

  result = signal('');
  copied = signal(false);
  private toolState = signal<ToolState | null>(null);

  constructor(private instanceService: InstanceService, private injector: Injector) {
    effect(() => {
      this.options();
      this.generate();
    });
  }

  options = computed<EfDbContextOptions>(
    () => (this.toolState()?.state().options ?? defaultToolStateFor('ef-dbcontext')!.options) as EfDbContextOptions,
  );

  ngOnInit(): void {
    const toolState = new ToolState(this.instanceService, this.instanceId, 'ef-dbcontext');
    this.toolState.set(toolState);
    toolState.connect(
      () => this.readToolState(),
      (state) => this.restoreToolState(state),
      this.injector,
    );
    this.generate();
  }

  onParamChange(): void {
    this.toolState()?.updateOptions({
      contextName: this.contextName,
      namespace: this.namespace,
      provider: this.provider,
    });
    this.generate();
  }

  private readToolState(): ToolStateSnapshot {
    return {
      input: { entitiesText: this.entitiesText },
      output: { document: this.result() },
      options: {
        ...this.options(),
        useAssemblyConfigurations: this.useAssemblyConfigurations,
        includeAuditInterceptor: this.includeAuditInterceptor,
        includeSoftDeleteFilter: this.includeSoftDeleteFilter,
        includeDiExtension: this.includeDiExtension,
        includeDesignTimeFactory: this.includeDesignTimeFactory,
        useDbContextPool: this.useDbContextPool,
      },
    };
  }

  private restoreToolState(state: ToolStateSnapshot): void {
    this.entitiesText = state.input['entitiesText'];
    this.contextName = state.options['contextName'];
    this.namespace = state.options['namespace'];
    this.provider = state.options['provider'];
    this.useAssemblyConfigurations = state.options['useAssemblyConfigurations'];
    this.includeAuditInterceptor = state.options['includeAuditInterceptor'];
    this.includeSoftDeleteFilter = state.options['includeSoftDeleteFilter'];
    this.includeDiExtension = state.options['includeDiExtension'];
    this.includeDesignTimeFactory = state.options['includeDesignTimeFactory'];
    this.useDbContextPool = state.options['useDbContextPool'];
    this.result.set(state.output['document']);
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

  generate(): void {
    const generated = generateEfDbContext(this.entitiesText, {
      contextName: this.contextName,
      namespace: this.namespace,
      provider: this.provider,
      useAssemblyConfigurations: this.useAssemblyConfigurations,
      includeAuditInterceptor: this.includeAuditInterceptor,
      includeSoftDeleteFilter: this.includeSoftDeleteFilter,
      includeDiExtension: this.includeDiExtension,
      includeDesignTimeFactory: this.includeDesignTimeFactory,
      useDbContextPool: this.useDbContextPool,
    });
    this.result.set(generated);
    this.toolState()?.save(this.readToolState());
  }
}
