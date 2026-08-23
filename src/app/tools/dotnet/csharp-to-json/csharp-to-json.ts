import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-csharp-to-json', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './csharp-to-json.html', styleUrls: ['./csharp-to-json.css']
})
export class CsharpToJson {
  @Input({ required: true }) instanceId!: string;
  input = signal('public class UserDto\n{\n  public int Id { get; set; }\n  public string Name { get; set; }\n  public DateTime CreatedAt { get; set; }\n  public bool IsActive { get; set; }\n}');
  result = signal('');
  convert() {
    const classMatch = this.input().match(/(?:class|record)\s+(\w+)[^{]*\{([\s\S]*?)\}/i);
    if (!classMatch) { this.result.set('No C# class or record found.'); return; }
    const values: Record<string, unknown> = {};
    const properties = /(?:public|internal|private)?\s*(\w+(?:<[^>]+>)?(?:\[\])?)(\?)?\s+(\w+)\s*(?:\{|;)/g;
    let match: RegExpExecArray | null;
    while ((match = properties.exec(classMatch[2]))) values[match[3].charAt(0).toLowerCase() + match[3].slice(1)] = sampleValue(match[1], Boolean(match[2]));
    this.result.set(JSON.stringify(values, null, 2));
  }
}
function sampleValue(type: string, nullable: boolean): unknown {
  if (nullable) return null;
  const collection = type.match(/^(?:List|ICollection|IEnumerable)<(.+)>$/);
  if (collection) return [sampleValue(collection[1], false)];
  if (type.endsWith('[]')) return [sampleValue(type.slice(0, -2), false)];
  if (/^(bool|boolean)$/i.test(type)) return true;
  if (/^(int|long|short|byte|float|double|decimal)$/i.test(type)) return 0;
  if (/^(DateTime|DateTimeOffset)$/i.test(type)) return '2026-01-01T00:00:00Z';
  if (/^Guid$/i.test(type)) return '00000000-0000-0000-0000-000000000000';
  return 'string';
}
