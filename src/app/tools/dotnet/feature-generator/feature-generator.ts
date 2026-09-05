import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateFeatureFiles,
  formatFeatureBundle,
  FeatureGeneratorOptions,
} from '../../../core/engines/feature-generator-engine';

@Component({
  selector: 'app-feature-generator',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './feature-generator.html',
  styleUrls: ['./feature-generator.css'],
})
export class FeatureGenerator implements OnInit {
  @Input({ required: true }) instanceId!: string;
  feature = 'Product';
  namespace = 'MyApp';
  result = signal('');
  copied = signal(false);

  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  constructor(private instanceService: InstanceService) {
    effect(() => {
      // Re-run whenever config changes in the options panel
      this.config();
      this.generate();
    });
  }

  config = computed(
    () =>
      (this.instanceService.instances().find((i) => i.id === this.instanceId)?.config ??
        {}) as FeatureGeneratorOptions,
  );

  ngOnInit(): void {
    this.generate();
  }

  generate(): void {
    const files = generateFeatureFiles(this.feature, this.namespace, this.config());
    this.result.set(formatFeatureBundle(files));
  }
}
