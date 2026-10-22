-- Airline confirmation (PNR) separate from our booking number, tickets, Duffel card payments,
-- holds, cancellations and refunds; plus a log of processed Duffel webhook events.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airline_pnr VARCHAR(20) NULL AFTER booking_reference;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tickets JSON NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(64) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(80) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at DATETIME(6) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_required_by DATETIME(6) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS conditions JSON NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duffel_cancellation_id VARCHAR(64) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at DATETIME(6) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by CHAR(36) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airline_refund DECIMAL(12,2) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airline_change TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at DATETIME(6) NULL;
ALTER TABLE bookings ADD KEY IF NOT EXISTS ix_bookings_duffel_order (duffel_order_id);

-- Earlier bookings stored the airline PNR as the booking reference.
UPDATE bookings SET airline_pnr = booking_reference WHERE duffel_order_id IS NOT NULL AND airline_pnr IS NULL;

CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  type VARCHAR(80) NOT NULL,
  object_id VARCHAR(64) NULL,
  received_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
