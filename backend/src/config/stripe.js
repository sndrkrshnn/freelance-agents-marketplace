const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  stripe,
  createPaymentIntent: async (amount, currency = 'usd', metadata = {}) => {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  },

  confirmPayment: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error(`Stripe payment confirmation failed: ${error.message}`);
    }
  },

  createTransfer: async (amount, destination, metadata = {}) => {
    try {
      const transfer = await stripe.transfers.create({
        amount: amount * 100,
        currency: 'usd',
        destination,
        metadata,
      });
      return transfer;
    } catch (error) {
      throw new Error(`Stripe transfer creation failed: ${error.message}`);
    }
  },

  refundPayment: async (paymentIntentId, amount = null) => {
    try {
      const refundParams = {
        payment_intent: paymentIntentId,
      };
      if (amount) {
        refundParams.amount = amount * 100;
      }
      const refund = await stripe.refunds.create(refundParams);
      return refund;
    } catch (error) {
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  },
};
