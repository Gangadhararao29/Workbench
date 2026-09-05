import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateEfConfiguration,
  PRESET_CUSTOMER_ORDERS,
  PRESET_BLOG_POST,
  EfConfigurationOptions,
} from '../../../core/engines/ef-configuration-engine';

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
        {}) as EfConfigurationOptions,
  );

  ngOnInit(): void {
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
    this.generate();
  }

  generate(): void {
    const generated = generateEfConfiguration(this.input(), this.config(), this.activeTab());
    this.result.set(generated);
  }
}
