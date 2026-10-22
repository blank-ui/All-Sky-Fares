-- The priority/type pricing rules were replaced by route_markups (002). Their data was carried over there.
DROP TABLE IF EXISTS pricing_rules;

-- Whether current_price came from Duffel's live environment (1) or its test environment (0).
ALTER TABLE route_markups ADD COLUMN IF NOT EXISTS price_live TINYINT(1) NULL AFTER price_currency;
