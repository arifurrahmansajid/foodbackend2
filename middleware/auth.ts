import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { AppError, catchAsync } from './errorHandler';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log('[AUTH DEBUG] No token provided in headers');
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    console.log('[AUTH DEBUG] Token successfully decoded for ID:', decoded.id);

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { providerProfiles: true }
    });

    if (!currentUser) {
      console.log('[AUTH DEBUG] User not found in database for ID:', decoded.id);
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!currentUser.isActive) {
      console.log('[AUTH DEBUG] User account is inactive:', currentUser.email);
      return next(new AppError('This user account has been deactivated.', 403));
    }

    req.user = currentUser;
    console.log('[AUTH DEBUG] Authentication successful for:', currentUser.email);
    next();
  } catch (error: any) {
    console.error('[AUTH DEBUG] Token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
       return next(new AppError('Your session has expired. Please login again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
});

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      console.log('[AUTH] Role mismatch. User:', req.user.email, 'Role:', req.user.role, 'Required:', roles);
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
