import { Component, computed, inject, input, signal } from '@angular/core';
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

@Component({
  selector: 'app-feature-generator',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './feature-generator.html',
  styleUrls: ['./feature-generator.css'],
})
export class FeatureGenerator {
  private readonly instanceService = inject(InstanceService);

  readonly instanceId = input.required<string>();
  readonly feature = signal('Product');
  readonly namespace = signal('MyApp');
  readonly copied = signal(false);

  readonly config = computed(
    () =>
      (this.instanceService.instances().find((i) => i.id === this.instanceId())?.config ??
        {}) as FeatureGeneratorOptions,
  );

  readonly result = computed(() => {
    const files = generateFeatureFiles(this.feature(), this.namespace(), this.config());
    return formatFeatureBundle(files);
  });

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
