import express from 'express';
import * as paymentController from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.post('/create-payment-intent', paymentController.createPaymentIntent);

export default router;
