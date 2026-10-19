import { Component, Injector, Input, OnInit, computed, effect, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateEfConfiguration,
  PRESET_CUSTOMER_ORDERS,
  PRESET_BLOG_POST,
  EfConfigurationOptions,
} from '../../../core/engines/ef-configuration-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

@Component({
  selector: 'app-ef-configuration',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './ef-configuration.html',
  styleUrls: ['./ef-configuration.css'],
})
export class EfConfiguration implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal(PRESET_CUSTOMER_ORDERS);
  result = signal('');
  activeTab = signal<'fluent' | 'annotations' | 'both'>('fluent');
  copied = signal(false);
  private toolState = signal<ToolState | null>(null);
  private lastGenerationSignature: string | null = null;

  constructor(private instanceService: InstanceService, private injector: Injector) {
    effect(() => {
      // Re-run whenever config changes in the options panel
      this.options();
      untracked(() => this.generate());
    });
  }

  options = computed<EfConfigurationOptions>(
    () => (this.toolState()?.state().options ?? defaultToolStateFor('ef-configuration')!.options) as EfConfigurationOptions,
  );

  ngOnInit(): void {
    const toolState = new ToolState(this.instanceService, this.instanceId, 'ef-configuration');
    this.toolState.set(toolState);
    toolState.connect(
      () => ({
        input: { document: this.input() },
        output: { document: this.result() },
        options: { ...this.options(), activeTab: this.activeTab() },
      }),
      (state) => {
        this.input.set(state.input['document']);
        this.result.set(state.output['document']);
        this.activeTab.set(state.options['activeTab']);
      },
      this.injector,
    );
    this.generate(true);
  }

  onInputChange(val: string): void {
    this.input.set(val);
    this.toolState()?.updateInput({ document: val });
    this.generate();
  }

  loadPreset(preset: 'customer' | 'blog' | 'simple'): void {
    if (preset === 'customer') {
      this.input.set(PRESET_CUSTOMER_ORDERS);
    } else if (preset === 'blog') {
      this.input.set(PRESET_BLOG_POST);
    } else {
      this.input.set(
        `public class Product\n{\n    public int Id { get; set; }\n    public string Name { get; set; } = string.Empty;\n    public string Sku { get; set; } = string.Empty;\n    public decimal Price { get; set; }\n    public bool IsActive { get; set; } = true;\n    public DateTime CreatedAt { get; set; }\n}`,
      );
    }
    this.generate();
  }

  setTab(tab: 'fluent' | 'annotations' | 'both'): void {
    this.activeTab.set(tab);
    this.toolState()?.updateOptions({ activeTab: tab });
    this.generate();
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

  generate(force = false): void {
    const signature = JSON.stringify([this.input(), this.options(), this.activeTab()]);
    if (!force && signature === this.lastGenerationSignature) return;
    this.lastGenerationSignature = signature;

    const generated = generateEfConfiguration(this.input(), this.options(), this.activeTab());
    this.result.set(generated);
    this.toolState()?.updateOutput({ document: generated });
  }
}
