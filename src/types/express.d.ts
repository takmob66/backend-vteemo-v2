import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      uuid: string;
      email: string;
      role: string;
    };
  }
}
