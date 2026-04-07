import { Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus, Role } from '@prisma/client';
import { AppError, catchAsync } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Public Meals
export const getAllMeals = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const meals = await prisma.meal.findMany({
    where: { isActive: true },
    include: {
      category: true,
      provider: true,
    },
  });

  res.status(200).json({ status: 'success', data: { meals } });
});

// Public Providers
export const getAllProviders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const providers = await prisma.providerProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  });

  res.status(200).json({ status: 'success', data: { providers } });
});

export const getProvider = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const providerIdOrUserId = req.params.id as string;
  
  // Try to find by Profile ID first, then by User ID
  let provider = await prisma.providerProfile.findUnique({
    where: { id: providerIdOrUserId },
    include: {
      meals: {
        where: { isActive: true },
        include: { category: true }
      }
    },
  });

  if (!provider) {
    provider = await prisma.providerProfile.findUnique({
      where: { userId: providerIdOrUserId },
      include: {
        meals: {
          where: { isActive: true },
          include: { category: true }
        }
      },
    });
  }

  if (!provider) return next(new AppError('No provider profile found for this request', 404));

  res.status(200).json({ status: 'success', data: { provider } });
});

export const getMeal = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const mealId = req.params.id as string;
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: {
      category: true,
      provider: true,
      reviews: { include: { user: true } },
    },
  });

  if (!meal) return next(new AppError('No meal found with that ID', 404));

  res.status(200).json({ status: 'success', data: { meal } });
});

// Orders
export const createOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { items, address } = req.body; // items: [{ mealId, quantity }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Order must have items', 400));
  }

  const newOrder = await prisma.$transaction(async (tx) => {
    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const mealId = item.mealId as string;
      const quantity = item.quantity as number;
      
      const meal = await tx.meal.findUnique({ where: { id: mealId } });
      if (!meal) throw new AppError(`Meal ${mealId} not found`, 404);
      
      const itemTotal = meal.price * quantity;
      total += itemTotal;
      
      orderItemsData.push({
        mealId: meal.id,
        name: meal.name,
        price: meal.price,
        quantity,
      });
    }

    const order = await tx.order.create({
      data: {
        userId: req.user.id,
        total,
        address: address as string,
        items: {
          create: orderItemsData,
        },
      },
      include: { items: true },
    });

    return order;
  });

  res.status(201).json({ status: 'success', data: { order: newOrder } });
});

// Admin Features
export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  res.status(200).json({ status: 'success', data: { users } });
});

export const updateUserStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id as string;
  const { isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: isActive as boolean },
  });
  res.status(200).json({ status: 'success', data: { user } });
});

// Admin Command Center
export const getAdminStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const [userCount, providerCount, mealCount, orderCount, recentOrders] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count(),
    prisma.meal.count(),
    prisma.order.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    })
  ]);

  const totalRevenue = await prisma.order.aggregate({
    _sum: { total: true }
  });

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalUsers: userCount,
        totalProviders: providerCount,
        totalMeals: mealCount,
        totalOrders: orderCount,
        totalRevenue: totalRevenue._sum.total || 0
      },
      recentOrders
    }
  });
});

// Category Management
export const getAllCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { meals: true } } }
  });
  res.status(200).json({ status: 'success', data: { categories } });
});

export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, image } = req.body;
  const category = await prisma.category.create({
    data: { name: name as string, image: image as string }
  });
  res.status(201).json({ status: 'success', data: { category } });
});

export const updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, image } = req.body;
  const category = await prisma.category.update({
    where: { id: id as string },
    data: { name: name as string, image: image as string }
  });
  res.status(200).json({ status: 'success', data: { category } });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  await prisma.category.delete({ where: { id: id as string } });
  res.status(204).json({ status: 'success', data: null });
});

// Admin Menu Oversite
export const getAdminMeals = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const meals = await prisma.meal.findMany({
    include: { category: true, provider: true }
  });
  res.status(200).json({ status: 'success', data: { meals } });
});

export const getAdminProviders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const providers = await prisma.providerProfile.findMany({
    include: { user: { select: { name: true, email: true, isActive: true } }, _count: { select: { meals: true } } }
  });
  res.status(200).json({ status: 'success', data: { providers } });
});
