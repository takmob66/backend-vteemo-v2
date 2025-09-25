import { z } from 'zod';
import { createUser, findUserByEmail, updateLastLogin, findUserByUUID, findUserById } from '../repositories/userRepository';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccess } from '../utils/jwt';
import { createSession, findActiveSessionByHash, revokeAllUserSessions, listUserSessions, revokeSession } from '../repositories/sessionRepository';
import { generateRawRefreshToken, hashRefreshToken, calcExpiry } from '../utils/refreshToken';
import { createEmailToken, findActiveEmailToken, useEmailToken } from '../repositories/emailTokenRepository';
import { createPasswordResetToken, findActiveResetToken, useResetToken } from '../repositories/passwordResetRepository';
import { markEmailVerified, updatePassword } from '../repositories/userRepository';
import { sendMail } from '../utils/mailer';
import crypto from 'crypto';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = registerSchema;

async function createRefreshSession(user: any, ip?: string, ua?: string) {
  const raw = generateRawRefreshToken();
  const token_hash = hashRefreshToken(raw);
  const ttlDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);
  const expires_at = calcExpiry(ttlDays);
  await createSession({
    user_id: user.id,
    token_hash,
    ip,
    user_agent: ua,
    expires_at
  });
  return { raw, expires_at };
}

function issueAccess(id: number, uuid: string, role: string) {
  return signAccess({ sub: uuid, uid: id, role });
}

export async function register(data: unknown, ip?: string, ua?: string) {
  const { email, password } = registerSchema.parse(data);
  const existing = await findUserByEmail(email);
  if (existing) {
    const err: any = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const pwHash = await hashPassword(password);
  const user = await createUser(email, pwHash);
  const session = await createRefreshSession(user, ip, ua);
  const accessToken = issueAccess(user.id, user.uuid, user.role);
  return sanitize(user, {
    accessToken,
    refreshToken: session.raw,
    refreshExpiresAt: session.expires_at
  });
}

export async function login(data: unknown, ip?: string, ua?: string) {
  const { email, password } = loginSchema.parse(data);
  const user = await findUserByEmail(email);
  if (!user) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  await updateLastLogin(user.id);
  const session = await createRefreshSession(user, ip, ua);
  const accessToken = issueAccess(user.id, user.uuid, user.role);
  return sanitize(user, {
    accessToken,
    refreshToken: session.raw,
    refreshExpiresAt: session.expires_at
  });
}

export async function refresh(refreshToken: string, ip?: string, ua?: string) {
  // raw token hash lookup
  const hash = hashRefreshToken(refreshToken || '');
  const session = await findActiveSessionByHash(hash);
  if (!session) {
    const err: any = new Error('Invalid or expired refresh');
    err.status = 401;
    throw err;
  }
  const user = await findUserByUUID((await findUserById(session.user_id))?.uuid || '');
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 404;
    throw err;
  }
  // rotate
  const newSession = await createRefreshSession(user, ip, ua);
  await revokeSession(session.id);
  const accessToken = issueAccess(user.id, user.uuid, user.role);
  return sanitize(user, {
    accessToken,
    refreshToken: newSession.raw,
    refreshExpiresAt: newSession.expires_at
  });
}

export async function revokeAll(userId: number) {
  await revokeAllUserSessions(userId);
}

export async function listSessions(userId: number, limit = 20, offset = 0) {
  const rows = await listUserSessions(userId, limit, offset);
  return rows.map(r => ({
    id: r.id,
    ip: r.ip,
    user_agent: r.user_agent,
    created_at: r.created_at,
    expires_at: r.expires_at,
    revoked_at: r.revoked_at
  }));
}

export async function revokeSessionById(userId: number, sessionId: number) {
  const rows = await listUserSessions(userId, 1000, 0);
  const found = rows.find(r => r.id === sessionId);
  if (!found) {
    const err: any = new Error('Session not found');
    err.status = 404;
    throw err;
  }
  if (found.revoked_at) return;
  await revokeSession(found.id);
}

export async function requestEmailVerification(userId: number, email: string) {
  const hours = parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_HOURS || '24', 10);
  const expires = new Date(Date.now() + hours * 3600 * 1000);
  const { raw, hash } = genHashPair();
  await createEmailToken(userId, hash, expires);
  const link = `${process.env.FRONTEND_URL || ''}/verify-email?token=${raw}`;
  await sendMail(email, 'Verify your email', `<p>Click to verify:</p><a href="${link}">${link}</a>`);
  return { sent: true };
}

export async function confirmEmailVerification(rawToken: string) {
  const hash = hashRefreshToken(rawToken || '');
  const rec = await findActiveEmailToken(hash);
  if (!rec) {
    const err: any = new Error('Invalid or expired token');
    err.status = 400;
    throw err;
  }
  await useEmailToken(rec.id);
  await markEmailVerified(rec.user_id);
  return { verified: true };
}

export async function forgotPassword(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return { sent: true }; // مبهم برای امنیت
  const minutes = parseInt(process.env.PASSWORD_RESET_EXPIRE_MINUTES || '30', 10);
  const expires = new Date(Date.now() + minutes * 60 * 1000);
  const { raw, hash } = genHashPair();
  await createPasswordResetToken(user.id, hash, expires);
  const link = `${process.env.FRONTEND_URL || ''}/reset-password?token=${raw}`;
  await sendMail(user.email, 'Reset password', `<p>Reset link:</p><a href="${link}">${link}</a>`);
  return { sent: true };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    const err: any = new Error('Password too short');
    err.status = 400;
    throw err;
  }
  const hash = hashRefreshToken(rawToken || '');
  const rec = await findActiveResetToken(hash);
  if (!rec) {
    const err: any = new Error('Invalid or expired token');
    err.status = 400;
    throw err;
  }
  const user = await findUserById(rec.user_id);
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const newHash = await hashPassword(newPassword);
  await updatePassword(user.id, newHash);
  await useResetToken(rec.id);
  return { reset: true };
}

function sanitize(user: any, tokens: { accessToken: string; refreshToken: string; refreshExpiresAt: Date }) {
  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      role: user.role
    },
    tokens
  };
}

function genHashPair(rawLen = 48) {
  const raw = crypto.randomBytes(rawLen).toString('hex');
  const hash = hashRefreshToken(raw);
  return { raw, hash };
}
