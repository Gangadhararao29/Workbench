import { Component, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { convertCsharpToJson } from '../../../core/engines/csharp-json-engine';

@Component({
  selector: 'app-csharp-to-json',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './csharp-to-json.html',
  styleUrls: ['./csharp-to-json.css']
})
export class CsharpToJson {
  @Input({ required: true }) instanceId!: string;
  input = signal('public class UserDto\n{\n  public int Id { get; set; }\n  public string Name { get; set; }\n  public DateTime CreatedAt { get; set; }\n  public bool IsActive { get; set; }\n}');
  result = signal('');
  copied = signal(false);
  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  convert() {
    try {
      this.result.set(convertCsharpToJson(this.input()));
    } catch (error) {
      this.result.set((error as Error).message);
    }
  }
}
