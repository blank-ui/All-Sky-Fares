-- Guest checkout: bookings can be made without signing in. The booking is linked to an account
-- found or created by the contact email; new accounts start without a password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_via VARCHAR(20) NOT NULL DEFAULT 'signup';

-- Lets a guest finish the card payment and download documents for this one booking.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_token_hash CHAR(64) NULL;

-- Passwordless sign-in: a 6-digit code emailed to the account holder.
CREATE TABLE IF NOT EXISTS login_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at DATETIME(6) NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  KEY ix_login_codes_email (email),
  CONSTRAINT fk_login_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
