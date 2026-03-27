-- Stage 9: Add payment terms to clients for due date calculation
ALTER TABLE clients ADD COLUMN payment_terms_days INTEGER NOT NULL DEFAULT 30;
