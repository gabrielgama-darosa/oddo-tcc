BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  neighborhood TEXT NOT NULL CHECK (char_length(neighborhood) BETWEEN 1 AND 100),
  whatsapp TEXT NOT NULL CHECK (char_length(whatsapp) BETWEEN 12 AND 15),
  email TEXT NOT NULL UNIQUE CHECK (char_length(email) <= 160),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  delivery BOOLEAN NOT NULL DEFAULT FALSE,
  pickup BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_partner_idx ON sessions(partner_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS catalog_products (
  id BIGSERIAL PRIMARY KEY,
  normalized_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL CHECK (price > 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_id, product_id)
);
CREATE INDEX IF NOT EXISTS listings_product_idx ON listings(product_id);
CREATE INDEX IF NOT EXISTS listings_partner_idx ON listings(partner_id);

COMMIT;
