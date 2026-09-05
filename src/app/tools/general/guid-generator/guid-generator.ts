import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { generateGuids, formatGuids, GuidFormat, GuidCasing } from '../../../core/engines/guid-engine';

@Component({
  selector: 'app-guid-generator',
  standalone: true,
  imports: [FormsModule, MatButtonModule],
  templateUrl: './guid-generator.html',
  styleUrls: ['./guid-generator.css'],
})
export class GuidGenerator {
  @Input({ required: true }) instanceId!: string;
  count = 1;
  casing: GuidCasing = 'lower';
  format: GuidFormat = 'plain';
  result = signal('');

  generate(): void {
    const guids = generateGuids(this.count);
    this.result.set(formatGuids(guids, this.format, this.casing));
  }
}
