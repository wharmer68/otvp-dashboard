-- OTVP Dashboard Schema
-- Manages vendors, trust envelopes, claims, risk assessments, and audit trail

-- Vendor/Target: who are we scanning?
CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  otvp_id         TEXT NOT NULL UNIQUE,
  environment     TEXT NOT NULL DEFAULT 'production',
  cloud_provider  TEXT NOT NULL DEFAULT 'aws',
  region          TEXT,
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendor credentials stored separately for RLS isolation
CREATE TABLE vendor_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, credential_type)
);

-- Scan runs: one scan = one invocation of all agents against a vendor
CREATE TABLE scan_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  status          TEXT NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  agent_count     INT,
  envelope_count  INT,
  trigger         TEXT NOT NULL DEFAULT 'manual',
  error_message   TEXT
);

-- Trust Envelopes: the core unit
CREATE TABLE envelopes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id     TEXT NOT NULL UNIQUE,
  scan_run_id     UUID REFERENCES scan_runs(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  schema_version  TEXT NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ NOT NULL,
  ttl_seconds     INT NOT NULL,
  subject         JSONB NOT NULL,
  disclosure_level TEXT NOT NULL,
  composite_level TEXT NOT NULL,
  domain_scores   JSONB NOT NULL,
  evidence_summary JSONB NOT NULL,
  signer_id       TEXT NOT NULL,
  signature       TEXT NOT NULL,
  raw_envelope    JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_envelopes_vendor ON envelopes(vendor_id);
CREATE INDEX idx_envelopes_generated ON envelopes(generated_at DESC);
CREATE INDEX idx_envelopes_composite ON envelopes(composite_level);
CREATE INDEX idx_envelopes_scan_run ON envelopes(scan_run_id);

-- Claims: denormalized from envelopes for efficient querying
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        TEXT NOT NULL,
  envelope_id     TEXT NOT NULL REFERENCES envelopes(envelope_id),
  domain          TEXT NOT NULL,
  assertion       TEXT NOT NULL,
  result          TEXT NOT NULL,
  confidence      FLOAT NOT NULL,
  evidence_count  INT NOT NULL,
  evidence_refs   TEXT[] NOT NULL DEFAULT '{}',
  opinion         JSONB,
  scope           JSONB,
  agent_id        TEXT NOT NULL,
  agent_version   TEXT NOT NULL,
  signature       TEXT NOT NULL,
  valid_from      TIMESTAMPTZ NOT NULL,
  ttl_seconds     INT NOT NULL
);

CREATE INDEX idx_claims_envelope ON claims(envelope_id);
CREATE INDEX idx_claims_domain ON claims(domain);
CREATE INDEX idx_claims_result ON claims(result);

-- Risk assessments: computed aggregation snapshots
CREATE TABLE risk_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  scan_run_id     UUID REFERENCES scan_runs(id),
  overall_score   FLOAT NOT NULL,
  overall_level   TEXT NOT NULL,
  domain_scores   JSONB NOT NULL,
  envelope_count  INT NOT NULL,
  claim_summary   JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_vendor ON risk_assessments(vendor_id, computed_at DESC);

-- Audit log: every significant action
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  vendor_id       UUID REFERENCES vendors(id),
  scan_run_id     UUID REFERENCES scan_runs(id),
  envelope_id     TEXT,
  actor           TEXT,
  details         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_time ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_vendor ON audit_log(vendor_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
