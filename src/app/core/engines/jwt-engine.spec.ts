import { describe, it, expect } from 'vitest';
import {
  inspectJwt,
  buildJwt,
  verifyJwt,
  compareJwts
} from './jwt-engine';

describe('JWT Engine', () => {
  const sampleToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o';

  it('should inspect and decode JWT token header and payload', () => {
    const result = inspectJwt(sampleToken);
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(result.payload['name']).toBe('John Doe');
    expect(result.payload['role']).toBe('admin');
  });

  it('should build and sign a JWT with HS256 and verify it', async () => {
    const secret = 'my-secret-key-12345';
    const payload = {
      sub: 'user_99',
      role: 'admin',
      iss: 'workbench'
    };

    const token = await buildJwt(payload, secret);
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3);

    // Verify with correct secret
    const verified = await verifyJwt(token, secret);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.['sub']).toBe('user_99');
    expect(verified.payload?.['role']).toBe('admin');

    // Verify with wrong secret
    const wrongVerified = await verifyJwt(token, 'wrong-secret');
    expect(wrongVerified.valid).toBe(false);
    expect(wrongVerified.error).toContain('Invalid signature');
  });

  it('should compare two JWT tokens and identify matches and mismatches', async () => {
    const secret = 'shared-secret';
    const tokenA = await buildJwt({ sub: '1', name: 'Alice', role: 'admin' }, secret);
    const tokenB = await buildJwt({ sub: '1', name: 'Alice', role: 'user', department: 'Engineering' }, secret);

    const comparison = compareJwts(tokenA, tokenB);
    expect(comparison.claims.length).toBe(4);

    const subClaim = comparison.claims.find(c => c.claim === 'sub');
    expect(subClaim?.match).toBe(true);
    expect(subClaim?.status).toBe('match');

    const roleClaim = comparison.claims.find(c => c.claim === 'role');
    expect(roleClaim?.match).toBe(false);
    expect(roleClaim?.status).toBe('mismatch');

    const deptClaim = comparison.claims.find(c => c.claim === 'department');
    expect(deptClaim?.status).toBe('only-b');
  });
});
