import express from 'express';
import * as providerController from '../controllers/providerController';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(protect);
router.use(restrictTo(Role.PROVIDER));

// Manage Profiles
router.get('/profiles', providerController.getMyProfiles);
router.post('/profiles', providerController.createProfile);

// Manage Meals
router.post('/meals', providerController.addMeal);
router.put('/meals/:id', providerController.updateMeal);
router.delete('/meals/:id', providerController.deleteMeal);

// Manage Orders
router.get('/orders', providerController.getProviderOrders);
router.patch('/orders/:id', providerController.updateOrderStatus);

export default router;
