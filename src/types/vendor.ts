/**
 * OTVP Discovery Protocol Types
 *
 * Vendors publish trust envelopes at a well-known endpoint:
 *   https://{domain}/.well-known/otvp/otvp-config.json
 *
 * Relying parties discover vendors by domain, fetch their config,
 * verify their public key (optionally via DNS TXT record), and
 * poll for new envelopes on the configured refresh interval.
 *
 * Identity binding: DNS TXT record at _otvp.{domain}
 *   _otvp.acme-corp.com TXT "v=otvp1; kid={key_id}; key={base64_pubkey}"
 */

/** The discovery document served at .well-known/otvp/otvp-config.json */
export interface OtvpConfig {
  otvp_version: string;
  otvp_id: string;
  organization: string;
  contact_email?: string;
  public_keys: OtvpPublicKey[];
  endpoints: OtvpEndpoints;
  domains_covered: string[];
  retention_days: number;
  refresh_interval_seconds: number;
}

/** Ed25519 public key for signature verification */
export interface OtvpPublicKey {
  kid: string;
  algorithm: 'Ed25519';
  public_key: string;
  valid_from: string;
  valid_until?: string;
  revoked?: boolean;
}

/** Envelope API endpoints (relative to the .well-known base) */
export interface OtvpEndpoints {
  envelopes: string;
  latest: string;
  domains?: string;
}

/** Result of discovering a vendor's OTVP configuration */
export interface DiscoveryResult {
  success: boolean;
  domain: string;
  config: OtvpConfig | null;
  dns_verified: boolean;
  error?: string;
  discovered_at: string;
}

/** Vendor as tracked by the relying party */
export interface Vendor {
  id: string;
  domain: string;
  name: string;
  otvp_id: string;
  config_url: string;
  public_key_kid: string;
  public_key: string;
  dns_verified: boolean;
  domains_covered: string[];
  refresh_interval_seconds: number;
  submission_method: 'discovery' | 'upload' | 'registry';
  last_fetched_at: string | null;
  last_envelope_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Scan run / fetch run tracking */
export interface ScanRun {
  id: string;
  vendor_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  agent_count: number | null;
  envelope_count: number | null;
  trigger: 'manual' | 'scheduled' | 'api' | 'poll';
  error_message: string | null;
}

/** Envelope fetch result from a vendor's endpoint */
export interface EnvelopeFetchResult {
  envelopes: import('./envelope').TrustEnvelope[];
  signature_valid: boolean[];
  fetched_at: string;
  source_url: string;
}
