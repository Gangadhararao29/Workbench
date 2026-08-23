import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { evaluateJsonPath } from '../../../core/engines/json-path-engine';

@Component({
  selector: 'app-json-path', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './json-path.html', styleUrls: ['./json-path.css']
})
export class JsonPath {
  @Input({ required: true }) instanceId!: string;
  input = signal('{"users":[{"name":"Ada"},{"name":"Grace"}]}');
  path = '$.users[0].name';
  result = signal('');
  evaluate() {
    try {
      this.result.set(evaluateJsonPath(this.input(), this.path));
    } catch (error) { this.result.set(`Invalid input: ${(error as Error).message}`); }
  }
}
