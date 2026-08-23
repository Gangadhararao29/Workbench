import { jwtDecode } from 'jwt-decode';

export interface JwtInspection {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  status: string;
  expiry: string;
}

export function inspectJwt(token: string): JwtInspection {
  const header = jwtDecode<Record<string, unknown>>(token, { header: true });
  const payload = jwtDecode<Record<string, unknown>>(token);
  const expiresAt = typeof payload['exp'] === 'number' ? new Date(payload['exp'] * 1000) : null;
  const expired = expiresAt ? expiresAt.getTime() <= Date.now() : false;

  return {
    header,
    payload,
    status: expiresAt ? (expired ? 'Expired' : 'Not expired') : 'No expiration claim',
    expiry: expiresAt ? expiresAt.toLocaleString() : 'Not provided'
  };
}
