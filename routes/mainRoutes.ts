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

// Protected Orders
router.use(protect);

router.post('/orders', restrictTo(Role.CUSTOMER), mainController.createOrder);

export default router;
