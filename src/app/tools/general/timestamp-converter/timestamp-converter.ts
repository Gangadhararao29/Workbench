import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-timestamp-converter', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './timestamp-converter.html', styleUrls: ['./timestamp-converter.css']
})
export class TimestampConverter {
  @Input({ required: true }) instanceId!: string;
  readonly toolName = 'Timestamp converter';
  input = '';
  unit: 'seconds' | 'milliseconds' | 'iso' = 'seconds';
  result = signal('');
  convert() {
    try {
      const date = this.unit === 'iso' ? new Date(this.input) : new Date(Number(this.input) * (this.unit === 'seconds' ? 1000 : 1));
      if (Number.isNaN(date.getTime())) throw new Error('Enter a valid timestamp.');
      this.result.set(`ISO 8601: ${date.toISOString()}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString()}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`);
    } catch (error) { this.result.set((error as Error).message); }
  }
}
