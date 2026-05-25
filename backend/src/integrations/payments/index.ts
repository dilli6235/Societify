import { env } from '@/config/env';
import type { PaymentProvider } from './types';
import { razorpayProvider } from './razorpay.provider';

/** Resolve the configured payment provider. Add Stripe here when needed. */
export function getPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'razorpay':
    default:
      return razorpayProvider;
  }
}

export * from './types';
