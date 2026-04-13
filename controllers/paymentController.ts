import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { catchAsync } from '../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia' as any,
});

export const createPaymentIntent = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ status: 'fail', message: 'Amount is required and must be greater than zero' });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe expects amount in cents
    currency: 'usd',
    payment_method_types: ['card'],
  });

  res.status(200).json({
    status: 'success',
    clientSecret: paymentIntent.client_secret,
  });
});
