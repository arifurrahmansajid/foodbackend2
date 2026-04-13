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
      reviews: { select: { rating: true } }
    },
  });

  const mealsWithRating = meals.map(meal => {
    const total = meal.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = meal.reviews.length > 0 ? total / meal.reviews.length : 0;
    // Remove reviews array from response to keep it clean if desired, or keep it
    return { ...meal, avgRating: parseFloat(avg.toFixed(1)) };
  });

  res.status(200).json({ status: 'success', data: { meals: mealsWithRating } });
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
        include: { category: true, reviews: { select: { rating: true } } }
      }
    },
  });

  if (!provider) {
    provider = await prisma.providerProfile.findFirst({
      where: { userId: providerIdOrUserId },
      include: {
        meals: {
          where: { isActive: true },
          include: { category: true, reviews: { select: { rating: true } } }
        }
      },
    });
  }

  if (!provider) return next(new AppError('No provider profile found for this request', 404));

  const mealsWithRating = provider.meals.map(meal => {
    const total = meal.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = meal.reviews.length > 0 ? total / meal.reviews.length : 0;
    return { ...meal, avgRating: parseFloat(avg.toFixed(1)) };
  });

  res.status(200).json({ status: 'success', data: { provider: { ...provider, meals: mealsWithRating } } });
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

  const total = meal.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  const avgRating = meal.reviews.length > 0 ? parseFloat((total / meal.reviews.length).toFixed(1)) : 0;

  res.status(200).json({ status: 'success', data: { meal: { ...meal, avgRating } } });
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

export const getUserOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: {
        include: {
          meal: {
            select: { image: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ status: 'success', data: { orders } });
});

export const getOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: {
      items: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!order) return next(new AppError('No order found with that ID', 404));
  
  if (order.userId !== req.user.id && req.user.role !== Role.ADMIN) {
    return next(new AppError('You do not have permission to view this order', 403));
  }

  res.status(200).json({ status: 'success', data: { order } });
});

export const cancelOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.id as string;
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) return next(new AppError('No order found with that ID', 404));
  if (order.userId !== req.user.id) {
    return next(new AppError('You do not have permission to cancel this order', 403));
  }
  
  // Only allow cancellation if order is in PLACED state
  if (order.status !== OrderStatus.PLACED) {
    return next(new AppError(`Order cannot be cancelled because it is already ${order.status.toLowerCase()}`, 400));
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED }
  });

  res.status(200).json({ status: 'success', data: { order: updatedOrder } });
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
    orderBy: { name: 'asc' },
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

// Reviews
export const getAllReviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { name: true } },
      meal: { select: { name: true, image: true } },
    },
  });
  res.status(200).json({ status: 'success', data: { reviews } });
});

export const createReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const mealId = req.params.id as string;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal) return next(new AppError('Meal not found', 404));

  // Prevent duplicate reviews from same user
  const existing = await prisma.review.findFirst({
    where: { mealId, userId: req.user.id },
  });
  if (existing) {
    return next(new AppError('You have already reviewed this meal', 400));
  }

  const review = await prisma.review.create({
    data: {
      rating: Number(rating),
      comment: comment as string | undefined,
      userId: req.user.id,
      mealId,
    },
    include: { user: { select: { name: true } } },
  });

  res.status(201).json({ status: 'success', data: { review } });
});
