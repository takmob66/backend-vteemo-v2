import { getDB } from '../config/database';
const db = getDB();

export interface RefreshSession {
  id: number;
  user_id: number;
  token_hash: string;
  ip?: string | null;
  user_agent?: string | null;
  created_at: Date;
  expires_at: Date;
  revoked_at?: Date | null;
}

const TABLE = 'refresh_sessions';

export async function createSession(data: {
  user_id: number;
  token_hash: string;
  ip?: string;
  user_agent?: string;
  expires_at: Date;
}) {
  const [id] = await db(TABLE).insert(data);
  return db<RefreshSession>(TABLE).where({ id }).first();
}

export async function findActiveSessionByHash(hash: string) {
  return db<RefreshSession>(TABLE)
    .where({ token_hash: hash })
    .whereNull('revoked_at')
    .andWhere('expires_at', '>', db.fn.now())
    .first();
}

export async function revokeSession(id: number) {
  await db(TABLE).where({ id }).update({ revoked_at: db.fn.now() });
}

export async function revokeAllUserSessions(userId: number) {
  await db(TABLE)
    .where({ user_id: userId })
    .whereNull('revoked_at')
    .update({ revoked_at: db.fn.now() });
}

export async function rotateSession(oldId: number, newHash: string, newExpiry: Date) {
  await revokeSession(oldId);
  return newHash && newExpiry;
}

export async function listUserSessions(userId: number, limit = 20, offset = 0) {
  return db<RefreshSession>(TABLE)
    .where({ user_id: userId })
    .orderBy('id', 'desc')
    .limit(limit)
    .offset(offset);
}
