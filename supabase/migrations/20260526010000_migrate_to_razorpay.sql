-- Migrate Stripe to Razorpay

ALTER TABLE users 
RENAME COLUMN stripe_customer_id TO razorpay_customer_id;

ALTER TABLE users 
RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;

ALTER TABLE stripe_events RENAME TO razorpay_events;
