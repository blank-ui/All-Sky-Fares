-- AllSkyFares OTA schema (MySQL 8 / MariaDB 10.6+). All times are UTC.

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(80) NOT NULL DEFAULT '',
  last_name VARCHAR(80) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  KEY ix_sessions_user (user_id),
  KEY ix_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  identifier VARCHAR(320) NOT NULL PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  locked_until DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  expires_at DATETIME(6) NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  used_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  KEY ix_password_resets_token (token_hash),
  KEY ix_password_resets_email (email),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(140) NOT NULL,
  message TEXT NOT NULL,
  booking_reference VARCHAR(40) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME(6) NOT NULL,
  KEY ix_support_user (user_id, created_at),
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  ota_booking_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_reference VARCHAR(40) NULL,
  duffel_order_id VARCHAR(64) NULL,
  offer_id VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(100) NOT NULL,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(170) NULL,
  customer_phone VARCHAR(40) NULL,
  passengers JSON NULL,
  slices JSON NULL,
  airline VARCHAR(120) NULL,
  airline_code VARCHAR(3) NULL,
  cabin VARCHAR(20) NULL,
  status VARCHAR(20) NOT NULL,
  payment_status VARCHAR(20) NULL,
  supplier_amount DECIMAL(12,2) NULL,
  applied_rule VARCHAR(160) NULL,
  customer_total DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  crm_sync_status VARCHAR(20) NULL,
  crm_booking_id VARCHAR(64) NULL,
  crm_synced_at DATETIME(6) NULL,
  crm_last_error TEXT NULL,
  live_mode TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_bookings_reference (booking_reference),
  UNIQUE KEY uq_bookings_idempotency (user_id, idempotency_key),
  KEY ix_bookings_user_created (user_id, created_at),
  KEY ix_bookings_created (created_at),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outbox (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  type VARCHAR(60) NOT NULL,
  booking_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(6) NOT NULL,
  lease_until DATETIME(6) NULL,
  last_error TEXT NULL,
  delivered_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  KEY ix_outbox_due (status, next_attempt_at),
  KEY ix_outbox_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  airline VARCHAR(80) NULL,
  origin CHAR(3) NULL,
  destination CHAR(3) NULL,
  markup_type VARCHAR(12) NOT NULL,
  markup_value DECIMAL(12,2) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  version BIGINT NOT NULL DEFAULT 1,
  created_by CHAR(36) NULL,
  created_at DATETIME(6) NOT NULL,
  deactivated_at DATETIME(6) NULL,
  KEY ix_pricing_active (active, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  value JSON NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  updated_by CHAR(36) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Provider credentials (Duffel, Resend, CRM webhook…), Fernet-encrypted with APP_SECRETS_KEY.
CREATE TABLE IF NOT EXISTS app_secrets (
  name VARCHAR(64) NOT NULL PRIMARY KEY,
  value_encrypted TEXT NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  updated_by CHAR(36) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor_id CHAR(36) NULL,
  action VARCHAR(80) NOT NULL,
  meta JSON NULL,
  at DATETIME(6) NOT NULL,
  KEY ix_audit_at (at),
  KEY ix_audit_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
