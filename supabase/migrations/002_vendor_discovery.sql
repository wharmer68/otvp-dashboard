-- Migration: Rework vendors table for OTVP discovery protocol
-- Vendors publish envelopes at .well-known/otvp/ — relying parties discover and verify.

-- Drop old credential-based tables (no longer needed — we don't scan vendor infra)
DROP TABLE IF EXISTS vendor_credentials CASCADE;

-- Rework vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS domain              TEXT,
  ADD COLUMN IF NOT EXISTS config_url          TEXT,
  ADD COLUMN IF NOT EXISTS public_key_kid      TEXT,
  ADD COLUMN IF NOT EXISTS public_key          TEXT,
  ADD COLUMN IF NOT EXISTS dns_verified        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS domains_covered     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS refresh_interval_seconds INT NOT NULL DEFAULT 3600,
  ADD COLUMN IF NOT EXISTS submission_method   TEXT NOT NULL DEFAULT 'discovery',
  ADD COLUMN IF NOT EXISTS last_fetched_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_envelope_at    TIMESTAMPTZ;

-- Drop columns that don't belong on the relying party side
ALTER TABLE vendors
  DROP COLUMN IF EXISTS environment,
  DROP COLUMN IF EXISTS cloud_provider,
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS config;

-- Add unique constraint on domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_domain ON vendors(domain);

-- Update scan_runs to support 'poll' trigger type
-- (no schema change needed, just document that trigger can be 'poll')
