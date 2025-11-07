const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Store active sessions (in production, use database)
const activeSessions = new Map();

/**
 * POST /api/payment/create-checkout-session
 * Create Stripe Checkout Session untuk subscription
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType, planName, amount, userId } = req.body;

    // Validate input
    if (!planType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Plan type and amount are required'
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'idr',
            product_data: {
              name: `Musij Premium - ${planName}`,
              description: `${planName} subscription for Musij music streaming`,
              images: ['https://via.placeholder.com/300x300/2196F3/FFFFFF?text=Musij+Premium']
            },
            unit_amount: amount * 100, // Stripe uses cents/smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}?canceled=true`,
      metadata: {
        userId: userId || 'guest',
        planType: planType,
        planName: planName
      }
    });

    // Store session info
    activeSessions.set(session.id, {
      userId,
      planType,
      planName,
      amount,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });

  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
});

/**
 * GET /api/payment/session/:sessionId
 * Check payment status
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      success: true,
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total / 100,
      metadata: session.metadata
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session',
      error: error.message
    });
  }
});

/**
 * POST /api/payment/webhook
 * Stripe webhook for payment events (optional, untuk production)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      
      // Update session status
      if (activeSessions.has(session.id)) {
        activeSessions.get(session.id).status = 'completed';
      }
      
      // TODO: Activate user subscription in database
      break;

    case 'checkout.session.expired':
      console.log('Payment expired:', event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
