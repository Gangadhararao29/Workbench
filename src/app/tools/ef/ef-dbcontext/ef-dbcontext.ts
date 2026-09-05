import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateEfDbContext,
  DatabaseProvider,
  EfDbContextOptions,
} from '../../../core/engines/ef-dbcontext-engine';

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

  constructor(private instanceService: InstanceService) {
    effect(() => {
      this.config();
      this.generate();
    });
  }

  config = computed(
    () =>
      (this.instanceService.instances().find((i) => i.id === this.instanceId)?.config ??
        {}) as EfDbContextOptions,
  );

  ngOnInit(): void {
    const conf = this.config();
    if (conf.contextName) this.contextName = conf.contextName;
    if (conf.namespace) this.namespace = conf.namespace;
    if (conf.provider) this.provider = conf.provider;

    this.generate();
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
  }
}
