import express from 'express';
import * as mainController from '../controllers/mainController';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.get('/stats', mainController.getAdminStats);
router.get('/users', mainController.getAllUsers);
router.patch('/users/:id', mainController.updateUserStatus);

// Category Management
router.get('/categories', mainController.getAllCategories);
router.post('/categories', mainController.createCategory);
router.patch('/categories/:id', mainController.updateCategory);
router.delete('/categories/:id', mainController.deleteCategory);

// Service Management
router.get('/meals', mainController.getAdminMeals);
router.get('/providers', mainController.getAdminProviders);

export default router;
