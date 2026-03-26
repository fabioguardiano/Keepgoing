-- Add code column to payable_payment_methods table
ALTER TABLE payable_payment_methods ADD COLUMN IF NOT EXISTS code text DEFAULT NULL;
