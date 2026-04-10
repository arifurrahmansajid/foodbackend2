import { Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { AppError, catchAsync } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Manage Profiles
export const getMyProfiles = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const profiles = await prisma.providerProfile.findMany({
    where: { userId: req.user.id },
    include: { meals: true }
  });
  res.status(200).json({ status: 'success', data: { profiles } });
});

export const createProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, image, phone, contactEmail, website, address } = req.body;
  
  const profile = await prisma.providerProfile.create({
    data: {
      userId: req.user.id,
      name: name as string,
      description: description as string,
      image: image as string,
      phone: phone as string,
      contactEmail: contactEmail as string,
      website: website as string,
      address: address as string,
    },
  });

  res.status(201).json({ status: 'success', data: { profile } });
});

// Manage Meals
export const addMeal = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, price, image, categoryId, providerId } = req.body;

  if (!providerId) return next(new AppError('Please provide a providerId for this meal', 400));

  // Check if providerId belongs to user
  const provider = await prisma.providerProfile.findFirst({
    where: { id: providerId, userId: req.user.id }
  });
  if (!provider) return next(new AppError('Provider profile not found or unauthorized', 403));

  const meal = await prisma.meal.create({
    data: {
      name: name as string,
      description: description as string,
      price: typeof price === 'string' ? parseFloat(price) : (price as number),
      image: image as string,
      categoryId: categoryId ? (categoryId as string) : undefined,
      providerId: providerId as string,
    },
  });

  res.status(201).json({ status: 'success', data: { meal } });
});

export const updateMeal = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const mealId = req.params.id as string;
  const { name, description, price, image, categoryId, isActive } = req.body;

  // Check ownership using the profiles associated with the user
  const existingMeal = await prisma.meal.findUnique({ where: { id: mealId }, include: { provider: true } });
  if (!existingMeal || existingMeal.provider.userId !== req.user.id) {
    return next(new AppError('Unauthorized update attempt', 403));
  }

  const meal = await prisma.meal.update({
    where: { id: mealId },
    data: {
      name: name as string,
      description: description as string,
      price: price ? (typeof price === 'string' ? parseFloat(price) : (price as number)) : undefined,
      image: image as string,
      categoryId: categoryId as string,
      isActive: isActive as boolean,
    },
  });

  res.status(200).json({ status: 'success', data: { meal } });
});

export const deleteMeal = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const mealId = req.params.id as string;
  const existingMeal = await prisma.meal.findUnique({ where: { id: mealId }, include: { provider: true } });
  if (!existingMeal || existingMeal.provider.userId !== req.user.id) {
    return next(new AppError('Unauthorized deletion attempt', 403));
  }

  await prisma.meal.delete({ where: { id: mealId } });
  res.status(204).json({ status: 'success', data: null });
});

// Manage Orders
export const updateOrderStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.id as string;
  const { status } = req.body;

  // Verify status is valid for provider to set
  if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
    return next(new AppError('Invalid order status', 400));
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
  });

  res.status(200).json({ status: 'success', data: { order } });
});
