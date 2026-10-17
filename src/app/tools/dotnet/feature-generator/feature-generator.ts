import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateFeatureFiles,
  formatFeatureBundle,
  FeatureGeneratorOptions,
} from '../../../core/engines/feature-generator-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';

@Component({
  selector: 'app-feature-generator',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './feature-generator.html',
  styleUrls: ['./feature-generator.css'],
})
export class FeatureGenerator {
  private readonly instanceService = inject(InstanceService);
  private readonly injector = inject(Injector);

  readonly instanceId = input.required<string>();
  readonly feature = signal('Product');
  readonly namespace = signal('MyApp');
  readonly copied = signal(false);
  private readonly toolState = signal<ToolState | null>(null);
  private connectedInstanceId: string | null = null;

  readonly options = computed(() =>
    (this.toolState()?.state().options ?? {}) as FeatureGeneratorOptions,
  );

  readonly result = computed(() => {
    const files = generateFeatureFiles(this.feature(), this.namespace(), this.options());
    return formatFeatureBundle(files);
  });

  constructor() {
    effect(() => {
      const instanceId = this.instanceId();
      if (!instanceId || instanceId === this.connectedInstanceId) return;
      this.connectedInstanceId = instanceId;
      const toolState = new ToolState(this.instanceService, instanceId, 'feature-generator');
      this.toolState.set(toolState);
      toolState.connect(
        () => ({
          input: { feature: this.feature(), namespace: this.namespace() },
          output: { document: this.result() },
          options: this.options(),
        }),
        (state) => {
          this.feature.set(state.input['feature']);
          this.namespace.set(state.input['namespace']);
        },
        this.injector,
      );
    });
  }

  copyResult() {
    const text = this.result();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
      });
  }

  generate(): void {
    // result is computed and fully reactive; method kept for template compatibility
  }
}
