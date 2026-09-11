import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { formatCsharp, CsharpFormatOptions } from '../../../core/engines/csharp-formatter-engine';

export { formatCsharp, type CsharpFormatOptions };

@Component({
  selector: 'app-csharp-formatter',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, CodeEditor],
  templateUrl: './csharp-formatter.html',
  styleUrls: ['./csharp-formatter.css']
})
export class CsharpFormatter implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal('public class User { public int Id { get; set; } public string Name { get; set; } }');
  result = signal('');
  copied = signal(false);

  constructor(private instanceService: InstanceService) {
    effect(() => {
      this.config();
      this.format();
    });
  }

  config = computed<CsharpFormatOptions>(() => {
    const inst = this.instanceService.instances().find(i => i.id === this.instanceId);
    const style = (inst?.config?.['braceStyle'] as 'allman' | 'kr') || 'allman';
    const indent = inst?.config?.['indent'] === '2 spaces' ? 2 : 4;
    return { braceStyle: style, indentSize: indent };
  });

  ngOnInit() {
    this.format();
  }

  onInputChange(value: string) {
    this.input.set(value);
    this.format();
  }

  clear() {
    this.input.set('');
    this.result.set('');
  }

  copyResult() {
    const text = this.result();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      });
    }
  }

  format() {
    const raw = this.input();
    if (!raw.trim()) {
      this.result.set('');
      return;
    }
    const cfg = this.config();
    this.result.set(formatCsharp(raw, {
      braceStyle: cfg.braceStyle ?? 'allman',
      indentSize: cfg.indentSize ?? 4,
    }));
  }
}
