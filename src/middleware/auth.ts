import { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../utils/jwt.js';
import { getUserById } from '../repositories/userRepository.js';

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.substring(7);
  try {
    const payload = verifyAccess(token);
    const user = await getUserById(payload.uid);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      role: user.role
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function optionalAuthGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(); // No auth required, continue
  }
  const token = header.substring(7);
  try {
    const payload = verifyAccess(token);
    const user = await getUserById(payload.uid);
    if (user) {
      req.user = {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        role: user.role
      };
    }
    next();
  } catch {
    // Invalid token, but continue without user
    next();
  }
}
