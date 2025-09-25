import { Request, Response, NextFunction } from 'express';
import { isIpBlocked } from '../repositories/ipBlockRepository';

export async function ipBlock(req: Request, res: Response, next: NextFunction) {
  try {
    if (await isIpBlocked(req.ip)) {
      return res.status(403).json({ error: 'IP blocked' });
    }
    next();
  } catch {
    next();
  }
}
