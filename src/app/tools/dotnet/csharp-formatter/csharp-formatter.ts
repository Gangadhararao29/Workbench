import { Component, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-csharp-formatter', standalone: true, imports: [MatButtonModule, CodeEditor],
  templateUrl: './csharp-formatter.html', styleUrls: ['./csharp-formatter.css']
})
export class CsharpFormatter {
  @Input({ required: true }) instanceId!: string;
  input = signal('public class User { public int Id { get; set; } public string Name { get; set; } }');
  result = signal('');
  format() {
    this.result.set(formatCsharp(this.input()));
  }
}

function formatCsharp(source: string): string {
  const output: string[] = [];
  let depth = 0;
  let current = '';
  let lineIndent: number | null = null;
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  const flush = () => {
    const line = current.trim();
    if (line) output.push(`${'    '.repeat(lineIndent ?? depth)}${line}`);
    current = '';
    lineIndent = null;
  };

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') {
        flush();
        lineComment = false;
      } else {
        current += character;
      }
      continue;
    }

    if (blockComment) {
      current += character;
      if (character === '*' && next === '/') {
        current += next;
        index++;
        blockComment = false;
      }
      if (character === '\n') flush();
      continue;
    }

    if (quote) {
      current += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if ((character === '"' || character === "'") && !quote) {
      quote = character;
      current += character;
    } else if (character === '/' && next === '/') {
      lineComment = true;
      current += '//';
      index++;
    } else if (character === '/' && next === '*') {
      blockComment = true;
      current += '/*';
      index++;
    } else if (character === '{') {
      if (current.trim()) {
        current = `${current.trim()} {`;
        flush();
      } else {
        output.push(`${'    '.repeat(depth)}{`);
      }
      depth++;
    } else if (character === '}') {
      flush();
      depth = Math.max(0, depth - 1);
      output.push(`${'    '.repeat(depth)}}`);
    } else if (character === ';') {
      current += ';';
      flush();
    } else if (character === '\n' || character === '\r') {
      if (character === '\n') flush();
    } else {
      current += character;
    }
  }

  flush();
  return collapseAutoProperties(output).join('\n');
}

function collapseAutoProperties(lines: string[]): string[] {
  const formatted: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const property = lines[index];
    if (!property.trimEnd().endsWith('{')) {
      formatted.push(property);
      continue;
    }

    let accessorIndex = index + 1;
    while (/^\s*(?:get|set|init)\s*;\s*$/.test(lines[accessorIndex] ?? '')) accessorIndex++;
    const hasAccessorBlock = accessorIndex > index + 1 && lines[accessorIndex]?.trim() === '}';
    if (!hasAccessorBlock) {
      formatted.push(property);
      continue;
    }

    const accessors = lines.slice(index + 1, accessorIndex).map(line => line.trim()).join(' ');
    formatted.push(`${property.trimEnd().slice(0, -1).trimEnd()} { ${accessors} }`);
    index = accessorIndex;
  }

  return formatted;
}
