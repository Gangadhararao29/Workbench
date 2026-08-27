import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  inspectJwt,
  buildJwt,
  verifyJwt,
  compareJwts,
  JwtInspection,
  JwtVerificationResult,
  JwtClaimComparison
} from '../../../core/engines/jwt-engine';

@Component({
  selector: 'app-jwt-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './jwt-inspector.html',
  styleUrls: ['./jwt-inspector.css']
})
export class JwtInspector implements OnInit {
  @Input({ required: true }) instanceId!: string;

  activeTab = signal<'inspect' | 'build' | 'verify' | 'compare'>('inspect');

  // --- TAB 1: INSPECTOR ---
  inspectInput = signal('');
  inspection = signal<JwtInspection | null>(null);
  inspectError = signal('');

  claimHelper = computed(() => {
    const payload = this.inspection()?.payload;
    if (!payload) return '';
    const claims = Object.keys(payload).filter(claim => !['exp', 'iat', 'nbf'].includes(claim));
    return (
      claims.map(claim => `var ${safeName(claim)} = User.FindFirst("${claim}")?.Value;`).join('\n') +
      '\n\n[Authorize(Roles = "Admin")]'
    );
  });

  // --- TAB 2: BUILDER ---
  buildAlgorithm = signal('HS256');
  buildSecret = signal('your-256-bit-secret-key-workbench');
  buildPayload = signal(`{
  "sub": "1234567890",
  "name": "Jane Developer",
  "email": "jane@example.com",
  "role": "admin",
  "iat": ${Math.floor(Date.now() / 1000)},
  "exp": ${Math.floor(Date.now() / 1000) + 3600}
}`);
  builtToken = signal('');
  buildError = signal('');
  isBuilding = signal(false);
  copiedBuilt = signal(false);

  // --- TAB 3: VERIFY ---
  verifyTokenInput = signal('');
  verifySecretInput = signal('');
  verificationResult = signal<JwtVerificationResult | null>(null);
  isVerifying = signal(false);

  // --- TAB 4: COMPARE ---
  compareTokenA = signal('');
  compareTokenB = signal('');
  comparisonResult = signal<{
    claims: JwtClaimComparison[];
    headerA?: Record<string, unknown>;
    headerB?: Record<string, unknown>;
    errorA?: string;
    errorB?: string;
  } | null>(null);

  ngOnInit() {
    // Sample initial inspection token for instant demo
    this.inspectInput.set(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o'
    );
    this.inspect();
  }

  setTab(tab: 'inspect' | 'build' | 'verify' | 'compare') {
    this.activeTab.set(tab);
  }

  // --- INSPECTOR METHODS ---
  inspect() {
    this.inspectError.set('');
    this.inspection.set(null);
    const token = this.inspectInput().trim();
    if (!token) return;

    const parts = token.split('.');
    if (parts.length !== 3) {
      this.inspectError.set('Enter a JWT with header, payload, and signature segments (3 parts).');
      return;
    }
    try {
      this.inspection.set(inspectJwt(token));
    } catch {
      this.inspectError.set('The token contains an invalid header or payload.');
    }
  }

  // --- BUILDER METHODS ---
  async build() {
    this.buildError.set('');
    this.isBuilding.set(true);
    try {
      const token = await buildJwt(this.buildPayload(), this.buildSecret().trim(), {
        alg: this.buildAlgorithm(),
        typ: 'JWT'
      });
      this.builtToken.set(token);
    } catch (err) {
      this.buildError.set((err as Error).message);
    } finally {
      this.isBuilding.set(false);
    }
  }

  async copyBuiltToken() {
    if (!this.builtToken()) return;
    try {
      await navigator.clipboard.writeText(this.builtToken());
      this.copiedBuilt.set(true);
      setTimeout(() => this.copiedBuilt.set(false), 2000);
    } catch {
      // ignore
    }
  }

  // --- VERIFY METHODS ---
  async verify() {
    this.isVerifying.set(true);
    try {
      const res = await verifyJwt(this.verifyTokenInput(), this.verifySecretInput().trim());
      this.verificationResult.set(res);
    } catch (err) {
      this.verificationResult.set({
        valid: false,
        error: (err as Error).message
      });
    } finally {
      this.isVerifying.set(false);
    }
  }

  // --- COMPARE METHODS ---
  compare() {
    const res = compareJwts(this.compareTokenA(), this.compareTokenB());
    this.comparisonResult.set(res);
  }

  formatValue(val: unknown): string {
    if (val === undefined) return '—';
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val);
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z_]+/, '_');
}
