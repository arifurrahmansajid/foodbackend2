import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { AppError, catchAsync } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const signToken = (id: string, role: Role) => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '90d',
  };
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', options);
};

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name, role } = req.body;

  if (role === Role.ADMIN) {
    return next(new AppError('Cannot register as ADMIN directly.', 400));
  }

  const existingUser = await prisma.user.findUnique({ where: { email: email as string } });
  if (existingUser) {
    return next(new AppError('Email is already in use', 400));
  }

  const hashedPassword = await bcrypt.hash(password as string, 12);

  const newUser = await prisma.user.create({
    data: {
      email: email as string,
      password: hashedPassword,
      name: name as string,
      role: (role as Role) || Role.CUSTOMER,
    },
  });

  const token = signToken(newUser.id, newUser.role as Role);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    },
  });
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await prisma.user.findUnique({ where: { email: email as string } });

  if (!user || !(await bcrypt.compare(password as string, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  const token = signToken(user.id, user.role as Role);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

export const updateProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, avatar } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { 
      name: name as string | undefined, 
      email: email as string | undefined, 
      avatar: avatar as string | undefined 
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
    },
  });
});
