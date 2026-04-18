import express from 'express';
import * as mainController from '../controllers/mainController';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = express.Router();

// Public Meals
router.get('/meals', mainController.getAllMeals);
router.get('/meals/:id', mainController.getMeal);

// Public Providers
router.get('/providers', mainController.getAllProviders);
router.get('/providers/:id', mainController.getProvider);

// Public Categories
router.get('/categories', mainController.getAllCategories);

// Public Reviews
router.get('/reviews', mainController.getAllReviews);

// Protected Orders + Reviews
router.use(protect);

router.post('/meals/:id/reviews', restrictTo(Role.CUSTOMER), mainController.createReview);
router.post('/orders', mainController.createOrder); // Anyone authenticated can order
router.get('/orders', mainController.getUserOrders);
router.get('/orders/:id', mainController.getOrder);
router.patch('/orders/:id/cancel', mainController.cancelOrder);

export default router;
