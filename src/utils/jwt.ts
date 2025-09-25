import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_access';
const ACCESS_EXPIRE = process.env.JWT_EXPIRE || '15m';

export interface AccessPayload {
  sub: string;
  uid: number;
  role: string;
  type: 'access';
}

export function signAccess(payload: Omit<AccessPayload, 'type'>) {
  return jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRE });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessPayload;
}
}

export function signAccess(payload: Omit<AccessPayload, 'type'>) {
  return jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRE });
}

export function signRefresh(payload: Omit<RefreshPayload, 'type'>) {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRE });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessPayload;
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
}
