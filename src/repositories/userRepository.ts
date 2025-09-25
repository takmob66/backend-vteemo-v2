import { getDB } from '../config/database';

const db = getDB();
const TABLE = 'users';

export interface UserRecord {
  id: number;
  uuid: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
  last_login_at: Date | null;
  refresh_token_version: number;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  return db<UserRecord>(TABLE).where({ email }).first();
}

export async function findUserByUUID(uuid: string): Promise<UserRecord | undefined> {
  return db<UserRecord>(TABLE).where({ uuid }).first();
}

export async function createUser(email: string, password_hash: string): Promise<UserRecord> {
  const [id] = await db<UserRecord>(TABLE).insert({ email, password_hash }).returning('id')
    .catch(async err => {
      // MySQL در بعضی نسخه‌ها returning ندارد
      if (err) {
        const inserted = await db<UserRecord>(TABLE).where({ email }).first();
        if (inserted) return [inserted.id];
        throw err;
      }
      return [0];
    });
  return db<UserRecord>(TABLE).where({ id: typeof id === 'object' ? (id as any).id : id }).first() as Promise<UserRecord>;
}

export async function updateLastLogin(id: number) {
  await db<UserRecord>(TABLE).where({ id }).update({ last_login_at: db.fn.now() });
}

export async function bumpRefreshVersion(id: number) {
  await db<UserRecord>(TABLE)
    .where({ id })
    .increment({ refresh_token_version: 1 });
}

export async function getUserById(id: number) {
  return db<UserRecord>(TABLE).where({ id }).first();
}

export async function listUsers(opts: { limit?: number; offset?: number; search?: string }) {
  const { limit = 20, offset = 0, search } = opts;
  let q = db<UserRecord>(TABLE).select('id', 'uuid', 'email', 'role', 'is_active', 'created_at', 'last_login_at');
  if (search) {
    q = q.where(builder => {
      builder.where('email', 'like', `%${search}%`);
    });
  }
  return q.orderBy('id', 'desc').limit(limit).offset(offset);
}

export async function updateUserRole(id: number, role: string) {
  await db<UserRecord>(TABLE).where({ id }).update({ role });
}

export async function setUserActive(id: number, isActive: boolean) {
  await db<UserRecord>(TABLE).where({ id }).update({ is_active: isActive ? 1 : 0 });
}

export async function findUserById(id: number) {
  return db<UserRecord>(TABLE).where({ id }).first();
}

export async function markEmailVerified(userId: number) {
  await db<UserRecord>(TABLE).where({ id: userId }).update({ email_verified_at: db.fn.now() });
}

export async function updatePassword(userId: number, newHash: string) {
  await db<UserRecord>(TABLE).where({ id: userId }).update({ password_hash: newHash });
}
