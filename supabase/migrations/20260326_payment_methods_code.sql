-- Add code column to payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS code text DEFAULT NULL;
