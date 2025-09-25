import { getDB } from '../config/database';
const db = getDB();
const TABLE = 'password_reset_tokens';

export async function createPasswordResetToken(user_id: number, token_hash: string, expires_at: Date) {
  const [id] = await db(TABLE).insert({ user_id, token_hash, expires_at });
  return db(TABLE).where({ id }).first();
}

export async function findActiveResetToken(hash: string) {
  return db(TABLE)
    .where({ token_hash: hash })
    .whereNull('used_at')
    .andWhere('expires_at', '>', db.fn.now())
    .first();
}

export async function useResetToken(id: number) {
  await db(TABLE).where({ id }).update({ used_at: db.fn.now() });
}
