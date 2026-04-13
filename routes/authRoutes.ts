import express from 'express';
import * as authController from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.patch('/update-profile', protect, authController.updateProfile);

export default router;
