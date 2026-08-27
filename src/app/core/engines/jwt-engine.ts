import { jwtDecode } from 'jwt-decode';

export interface JwtInspection {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  status: string;
  expiry: string;
}

export interface JwtVerificationResult {
  valid: boolean;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  error?: string;
}

export interface JwtClaimComparison {
  claim: string;
  valueA: unknown;
  valueB: unknown;
  match: boolean;
  status: 'match' | 'mismatch' | 'only-a' | 'only-b';
}

export function inspectJwt(token: string): JwtInspection {
  const trimmed = token.trim();
  const header = jwtDecode<Record<string, unknown>>(trimmed, { header: true });
  const payload = jwtDecode<Record<string, unknown>>(trimmed);
  const expiresAt = typeof payload['exp'] === 'number' ? new Date(payload['exp'] * 1000) : null;
  const expired = expiresAt ? expiresAt.getTime() <= Date.now() : false;

  return {
    header,
    payload,
    status: expiresAt ? (expired ? 'Expired' : 'Not expired') : 'No expiration claim',
    expiry: expiresAt ? expiresAt.toLocaleString() : 'Not provided'
  };
}

function base64UrlEncode(bufferOrStr: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof bufferOrStr === 'string') {
    bytes = new TextEncoder().encode(bufferOrStr);
  } else {
    bytes = new Uint8Array(bufferOrStr);
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecodeToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    usages
  );
}

export async function buildJwt(
  payload: Record<string, unknown> | string,
  secret: string,
  customHeader: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }
): Promise<string> {
  if (!secret) {
    throw new Error('Secret key is required to sign JWT.');
  }

  const headerObj = { alg: 'HS256', typ: 'JWT', ...customHeader };
  const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;

  const encodedHeader = base64UrlEncode(JSON.stringify(headerObj));
  const encodedPayload = base64UrlEncode(JSON.stringify(payloadObj));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret, ['sign']);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(dataToSign) as unknown as BufferSource
  );
  const encodedSignature = base64UrlEncode(signatureBuffer);

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtVerificationResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a JWT token.' };
  }
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'JWT token must contain header, payload, and signature segments separated by dots.' };
  }
  if (!secret) {
    return { valid: false, error: 'Secret key is required for verification.' };
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const dataToVerify = `${headerPart}.${payloadPart}`;

  try {
    const key = await getHmacKey(secret, ['verify']);
    const signatureBytes = base64UrlDecodeToUint8Array(signaturePart);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      new TextEncoder().encode(dataToVerify) as unknown as BufferSource
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature: The secret key does not match or the payload has been tampered with.' };
    }

    const inspection = inspectJwt(trimmed);
    return {
      valid: true,
      header: inspection.header,
      payload: inspection.payload
    };
  } catch (err) {
    return {
      valid: false,
      error: (err as Error).message || 'Verification failed.'
    };
  }
}

export function compareJwts(
  tokenA: string,
  tokenB: string
): {
  claims: JwtClaimComparison[];
  headerA?: Record<string, unknown>;
  headerB?: Record<string, unknown>;
  errorA?: string;
  errorB?: string;
} {
  let inspA: JwtInspection | null = null;
  let inspB: JwtInspection | null = null;
  let errorA: string | undefined;
  let errorB: string | undefined;

  try {
    inspA = inspectJwt(tokenA.trim());
  } catch (err) {
    errorA = (err as Error).message;
  }

  try {
    inspB = inspectJwt(tokenB.trim());
  } catch (err) {
    errorB = (err as Error).message;
  }

  if (!inspA && !inspB) {
    return { claims: [], errorA, errorB };
  }

  const payloadA = inspA?.payload || {};
  const payloadB = inspB?.payload || {};

  const allKeys = Array.from(new Set([...Object.keys(payloadA), ...Object.keys(payloadB)]));

  const comparisons: JwtClaimComparison[] = allKeys.map(key => {
    const hasA = Object.prototype.hasOwnProperty.call(payloadA, key);
    const hasB = Object.prototype.hasOwnProperty.call(payloadB, key);
    const valA = hasA ? payloadA[key] : undefined;
    const valB = hasB ? payloadB[key] : undefined;

    let status: 'match' | 'mismatch' | 'only-a' | 'only-b';
    let match = false;

    if (hasA && !hasB) {
      status = 'only-a';
    } else if (!hasA && hasB) {
      status = 'only-b';
    } else {
      match = JSON.stringify(valA) === JSON.stringify(valB);
      status = match ? 'match' : 'mismatch';
    }

    return {
      claim: key,
      valueA: valA,
      valueB: valB,
      match,
      status
    };
  });

  return {
    claims: comparisons,
    headerA: inspA?.header,
    headerB: inspB?.header,
    errorA,
    errorB
  };
}
