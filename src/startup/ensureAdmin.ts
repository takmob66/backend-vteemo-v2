import { findUserByEmail, createUser, updateUserRole } from '../repositories/userRepository';
import { hashPassword } from '../utils/hash';

export async function ensureAdminSeed() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await findUserByEmail(email);
  if (existing && existing.role === 'admin') return;
  if (!existing) {
    const hashed = await hashPassword(password);
    const user = await createUser(email, hashed);
    await updateUserRole(user.id, 'admin');
    // eslint-disable-next-line no-console
    console.log('[SEED] Admin user created:', email);
  } else if (existing.role !== 'admin') {
    await updateUserRole(existing.id, 'admin');
    console.log('[SEED] Existing user promoted to admin:', email);
  }
}
