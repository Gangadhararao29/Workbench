import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { inspectJwt, JwtInspection } from '../../../core/engines/jwt-engine';

@Component({
  selector: 'app-jwt-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './jwt-inspector.html',
  styleUrls: ['./jwt-inspector.css']
})
export class JwtInspector {
  @Input({ required: true }) instanceId!: string;
  input = signal('');
  inspection = signal<JwtInspection | null>(null);
  error = signal('');
  claimHelper = computed(() => {
    const payload = this.inspection()?.payload;
    if (!payload) return '';
    const claims = Object.keys(payload).filter(claim => !['exp', 'iat', 'nbf'].includes(claim));
    return claims.map(claim => `var ${safeName(claim)} = User.FindFirst("${claim}")?.Value;`).join('\n') + '\n\n[Authorize(Roles = "Admin")]';
  });

  inspect() {
    this.error.set('');
    this.inspection.set(null);
    const parts = this.input().trim().split('.');
    if (parts.length !== 3) {
      this.error.set('Enter a JWT with header, payload, and signature segments.');
      return;
    }
    try {
      this.inspection.set(inspectJwt(this.input().trim()));
    } catch {
      this.error.set('The token contains an invalid header or payload.');
    }
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z_]+/, '_');
}
