-- Record that the customer accepted the terms, and whether the booking was ticketed instantly or requested.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME(6) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_mode VARCHAR(12) NOT NULL DEFAULT 'instant';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_fee DECIMAL(12,2) NULL;
ALTER TABLE bookings MODIFY offer_id VARCHAR(64) NOT NULL;

-- Simple fixed-window rate limits (sign-up, password reset, data export…).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket VARCHAR(320) NOT NULL PRIMARY KEY,
  window_start DATETIME(6) NOT NULL,
  hits INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
