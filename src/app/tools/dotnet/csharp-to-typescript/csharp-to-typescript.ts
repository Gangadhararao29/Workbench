import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { InstanceService } from '../../../core/instance-service';
import { convertCsharpToTypescript } from '../../../core/engines/csharp-typescript-engine';
import { formatTypescript } from '../../../core/engines/typescript-formatter';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-csharp-to-typescript',
  standalone: true,
  imports: [CommonModule, MatButtonModule, CodeEditor],
  templateUrl: './csharp-to-typescript.html',
  styleUrls: ['./csharp-to-typescript.css']
})
export class CsharpToTypescript {
  @Input({ required: true }) instanceId!: string;

  input = signal(`public class UserDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; }
}`);
  result = signal('');

  constructor(private instanceService: InstanceService) {}

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  async format() {
    const result = convertCsharpToTypescript(this.input(), this.config());
    if (!result) {
      this.result.set('No C# classes, records, or enums found.');
      return;
    }
    this.result.set(await formatTypescript(result));
  }
}

