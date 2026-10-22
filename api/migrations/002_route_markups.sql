-- Simple route markups: one row per departure/destination pair ('*' = any airport).
-- Customer price = fare + markup_amount per traveller + fare * markup_percent / 100.

CREATE TABLE IF NOT EXISTS route_markups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  origin VARCHAR(3) NOT NULL,
  destination VARCHAR(3) NOT NULL,
  markup_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  markup_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  current_price DECIMAL(12,2) NULL,
  price_currency CHAR(3) NULL,
  price_checked_at DATETIME(6) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_route_markups_route (origin, destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carry over active rules from the old priority/type model (highest priority wins per route).
INSERT IGNORE INTO route_markups (id, origin, destination, markup_amount, markup_percent, created_by, created_at, updated_at)
SELECT UUID(),
       COALESCE(NULLIF(UPPER(TRIM(origin)), ''), '*'),
       COALESCE(NULLIF(UPPER(TRIM(destination)), ''), '*'),
       CASE WHEN markup_type = 'fixed' THEN markup_value ELSE 0 END,
       CASE WHEN markup_type = 'percentage' THEN markup_value ELSE 0 END,
       created_by, created_at, UTC_TIMESTAMP(6)
FROM pricing_rules
WHERE active = 1
ORDER BY priority, created_at;
