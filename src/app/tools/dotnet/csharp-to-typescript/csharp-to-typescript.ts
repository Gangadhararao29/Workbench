import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { convertCsharpToTypescript } from '../../../core/engines/csharp-typescript-engine';
import { formatTypescript } from '../../../core/engines/typescript-formatter';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';

@Component({
  selector: 'app-csharp-to-typescript',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, CodeEditor],
  templateUrl: './csharp-to-typescript.html',
  styleUrls: ['./csharp-to-typescript.css']
})
export class CsharpToTypescript implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal(`public class UserDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; }
}`);
  result = signal('');
  error = signal('');
  copied = signal(false);

  private runId = 0;

  constructor(private instanceService: InstanceService) {
    effect(() => {
      // Re-run whenever sidebar options change
      this.config();
      this.format();
    });
  }

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

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
    this.error.set('');
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

  async format() {
    const raw = this.input().trim();
    if (!raw) {
      this.result.set('');
      this.error.set('');
      return;
    }

    const currentRun = ++this.runId;
    try {
      const result = await convertCsharpToTypescript(raw, this.config());
      if (currentRun !== this.runId) return;

      if (!result.trim()) {
        this.error.set('No C# classes, records, or enums found.');
        return;
      }

      this.error.set('');
      this.result.set(await formatTypescript(result));
    } catch (error) {
      if (currentRun !== this.runId) return;
      this.error.set((error as Error).message);
    }
  }
}
