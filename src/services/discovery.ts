import type { OtvpConfig, DiscoveryResult } from '../types/vendor';
import type { TrustEnvelope, Claim, CompositeLevel, ClaimResult } from '../types/envelope';
import { verifyDnsTxt } from './dns-verify';

/**
 * Control ID → dashboard domain mapping.
 * Maps the test site's otvp-NNN IDs to the dashboard's dotted domain strings.
 */
const CONTROL_TO_DOMAIN: Record<string, string> = {
  'otvp-001': 'data_protection.encryption.at_rest',
  'otvp-002': 'identity_and_access.authentication.mfa_enforcement',
  'otvp-003': 'data_protection.encryption.key_management',
  'otvp-004': 'network_security.segmentation',
  'otvp-005': 'detection_and_response.logging.completeness',
  'otvp-006': 'identity_and_access.lifecycle.provisioning',
  'otvp-007': 'data_protection.encryption.in_transit',
  'otvp-008': 'network_security.ingress_controls',
  'otvp-009': 'identity_and_access.authorization.least_privilege',
  'otvp-010': 'infrastructure.compute.vulnerability_management',
  'otvp-011': 'operational_resilience.backup.coverage',
};

/** Reverse lookup: control name → domain (fallback when ID isn't present) */
const CONTROL_NAME_TO_DOMAIN: Record<string, string> = {
  'Encryption at Rest': 'data_protection.encryption.at_rest',
  'IAM MFA Enforcement': 'identity_and_access.authentication.mfa_enforcement',
  'KMS Key Management': 'data_protection.encryption.key_management',
  'Network Segmentation': 'network_security.segmentation',
  'Audit Logging': 'detection_and_response.logging.completeness',
  'Account Lifecycle': 'identity_and_access.lifecycle.provisioning',
  'Encryption in Transit': 'data_protection.encryption.in_transit',
  'Ingress Controls': 'network_security.ingress_controls',
  'Least Privilege': 'identity_and_access.authorization.least_privilege',
  'Vulnerability Management': 'infrastructure.compute.vulnerability_management',
  'Backup & Recovery': 'operational_resilience.backup.coverage',
};

// ─── Site Envelope Types (test site / otvp-site format) ─────────────────────

interface SiteFinding {
  resource_id: string;
  resource_type: string;
  status: 'pass' | 'fail' | 'warning' | 'unable_to_assess';
  detail: string;
  evidence: Record<string, unknown>;
}

interface SiteEnvelope {
  otvp_version: string;
  envelope_id: string;
  control: { id: string; name: string; soc2_mapping: string[] };
  organization: { id: string; name: string };
  timestamp: string;
  scope: { provider: string; account_id: string; regions: string[] };
  findings: SiteFinding[];
  summary: { total: number; pass: number; fail: number; warning: number; unable_to_assess: number };
  agent?: { name: string; version: string; sdk_version: string };
}

interface SiteIndex {
  otvp_version: string;
  organization: { id: string; name: string };
  generated_at: string;
  envelopes: Array<{
    control_id: string;
    control_name: string;
    filename: string;
    timestamp: string;
  }>;
}

interface SiteManifest {
  otvp_version: string;
  name: string;
  description: string;
  maintainer: { name: string; contact: string; website: string };
  controls: Array<{ id: string; name: string; description: string; soc2_mapping: string[] }>;
  envelope_schema: string;
  sdk?: { repository: string; language: string; license: string };
  principles?: string[];
}

// ─── Config Discovery ───────────────────────────────────────────────────────

/** Config file names to try, in order of preference */
const CONFIG_FILENAMES = ['otvp-config.json', 'manifest.json'];

/**
 * Discovers a vendor's OTVP configuration by fetching their .well-known endpoint.
 * Tries otvp-config.json first (dashboard format), then manifest.json (site format).
 */
export async function discoverVendor(domain: string): Promise<DiscoveryResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const now = new Date().toISOString();

  for (const filename of CONFIG_FILENAMES) {
    const configUrl = resolveBaseUrl(cleanDomain, `/.well-known/otvp/${filename}`);

    try {
      const response = await fetch(configUrl);
      if (!response.ok) continue;

      const raw = await response.json();

      // Determine format and validate
      if (isOtvpConfig(raw)) {
        // Dashboard-native otvp-config.json
        const validation = validateConfig(raw);
        if (!validation.valid) continue;
        const config = raw as OtvpConfig;
        const dnsResult = await verifyDnsTxt(cleanDomain, config);
        return {
          success: true,
          domain: cleanDomain,
          config,
          dns_verified: dnsResult.verified,
          discovered_at: now,
        };
      }

      if (isSiteManifest(raw)) {
        // Test site manifest.json — convert to OtvpConfig
        const config = manifestToConfig(raw as SiteManifest, cleanDomain);
        const dnsResult = await verifyDnsTxt(cleanDomain, config);
        return {
          success: true,
          domain: cleanDomain,
          config,
          dns_verified: dnsResult.verified,
          discovered_at: now,
        };
      }
    } catch {
      // Try next filename
    }
  }

  return {
    success: false,
    domain: cleanDomain,
    config: null,
    dns_verified: false,
    error: 'No valid OTVP config found at .well-known/otvp/ (tried otvp-config.json and manifest.json)',
    discovered_at: now,
  };
}

// ─── URL Resolution ─────────────────────────────────────────────────────────

/** Resolve a path relative to a vendor domain, handling localhost / same-origin */
export function resolveBaseUrl(domain: string, path: string): string {
  if (domain === 'localhost' || domain.startsWith('localhost:')) {
    return `http://${domain}${path}`;
  }
  if (typeof window !== 'undefined' && domain === window.location.hostname) {
    return path;
  }
  // Known demo / dev domains — serve from same origin
  if (domain === 'demo.otvp.dev' || domain === '4horsemen.dev' || domain === 'otvp.dev') {
    return path;
  }
  return `https://${domain}${path}`;
}

// Keep legacy exports for backward compatibility
export const resolveConfigUrl = (domain: string) => resolveBaseUrl(domain, '/.well-known/otvp/otvp-config.json');
export const resolveEndpointUrl = resolveBaseUrl;

// ─── Envelope Fetching ──────────────────────────────────────────────────────

/**
 * Fetch envelopes from a vendor's .well-known endpoint.
 * Supports two patterns:
 *   1. Index-based (site format): envelopes/index.json → individual files
 *   2. Single-file (dashboard format): envelopes/latest.json with all envelopes
 */
export async function fetchVendorEnvelopes(
  domain: string,
  _endpointPath?: string,
): Promise<{ envelopes: TrustEnvelope[]; error?: string }> {
  const basePath = '/.well-known/otvp/envelopes';

  // Strategy 1: Try index.json (site format — individual envelope files)
  try {
    const indexUrl = resolveBaseUrl(domain, `${basePath}/index.json`);
    const indexResp = await fetch(indexUrl);
    if (indexResp.ok) {
      const index = await indexResp.json() as SiteIndex;
      if (index.envelopes && Array.isArray(index.envelopes)) {
        const envelopes = await fetchIndexedEnvelopes(domain, basePath, index);
        if (envelopes.length > 0) {
          return { envelopes };
        }
      }
    }
  } catch {
    // Fall through to strategy 2
  }

  // Strategy 2: Try latest.json (dashboard format — all envelopes in one file)
  try {
    const latestUrl = resolveBaseUrl(domain, `${basePath}/latest.json`);
    const latestResp = await fetch(latestUrl);
    if (latestResp.ok) {
      const data = await latestResp.json();
      const raw = Array.isArray(data) ? data : data.envelopes ? data.envelopes : [data];
      // Check if these are already TrustEnvelopes or site-format envelopes
      const envelopes = raw.map((e: Record<string, unknown>) =>
        isSiteEnvelope(e) ? siteEnvelopeToTrust(e as unknown as SiteEnvelope) : e as unknown as TrustEnvelope
      );
      return { envelopes };
    }
  } catch {
    // Fall through
  }

  return { envelopes: [], error: 'No envelopes found (tried index.json and latest.json)' };
}

/** Fetch individual envelope files referenced by an index */
async function fetchIndexedEnvelopes(
  domain: string,
  basePath: string,
  index: SiteIndex,
): Promise<TrustEnvelope[]> {
  const results: TrustEnvelope[] = [];

  // Fetch all individual envelopes in parallel
  const fetches = index.envelopes.map(async (entry) => {
    const url = resolveBaseUrl(domain, `${basePath}/${entry.filename}`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const raw = await resp.json();
      if (isSiteEnvelope(raw)) {
        return siteEnvelopeToTrust(raw as SiteEnvelope);
      }
      // Already in dashboard format
      return raw as TrustEnvelope;
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(fetches);
  for (const env of settled) {
    if (env) results.push(env);
  }

  return results;
}

// ─── Format Detection ───────────────────────────────────────────────────────

function isOtvpConfig(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const c = data as Record<string, unknown>;
  return typeof c.otvp_id === 'string' && Array.isArray(c.public_keys);
}

function isSiteManifest(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const c = data as Record<string, unknown>;
  return typeof c.otvp_version === 'string' && Array.isArray(c.controls) && typeof c.name === 'string';
}

function isSiteEnvelope(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const e = data as Record<string, unknown>;
  return (
    typeof e.otvp_version === 'string' &&
    e.control !== undefined &&
    Array.isArray(e.findings) &&
    e.summary !== undefined
  );
}

// ─── Format Conversion ──────────────────────────────────────────────────────

/** Convert a site manifest.json into an OtvpConfig the dashboard can use */
function manifestToConfig(manifest: SiteManifest, domain: string): OtvpConfig {
  const domainsCovered = manifest.controls
    .map(c => CONTROL_TO_DOMAIN[c.id])
    .filter(Boolean);

  return {
    otvp_version: manifest.otvp_version,
    otvp_id: `otvp:org:${manifest.maintainer.name.toLowerCase().replace(/\s+/g, '-')}`,
    organization: manifest.maintainer.name,
    contact_email: manifest.maintainer.contact,
    public_keys: [
      {
        kid: `${domain}-primary`,
        algorithm: 'Ed25519' as const,
        public_key: '',  // Manifest doesn't include keys — signature verification deferred
        valid_from: new Date().toISOString(),
      },
    ],
    endpoints: {
      envelopes: '/.well-known/otvp/envelopes/index.json',
      latest: '/.well-known/otvp/envelopes/index.json',
    },
    domains_covered: domainsCovered,
    retention_days: 365,
    refresh_interval_seconds: 3600,
  };
}

/** Convert a site-format envelope to the dashboard's TrustEnvelope */
function siteEnvelopeToTrust(site: SiteEnvelope): TrustEnvelope {
  const domain = CONTROL_TO_DOMAIN[site.control.id]
    || CONTROL_NAME_TO_DOMAIN[site.control.name]
    || site.control.id;

  // Derive claim result from summary
  const { summary, findings } = site;
  let result: ClaimResult;
  let confidence: number;

  if (summary.total === 0) {
    result = 'NOT_APPLICABLE';
    confidence = 1.0;
  } else if (summary.fail === 0 && summary.warning === 0 && summary.unable_to_assess === 0) {
    result = 'SATISFIED';
    confidence = 1.0;
  } else if (summary.pass === 0 && summary.fail > 0) {
    result = 'NOT_SATISFIED';
    confidence = 1.0;
  } else if (summary.unable_to_assess === summary.total) {
    result = 'INDETERMINATE';
    confidence = 0.5;
  } else {
    result = 'PARTIAL';
    confidence = summary.total > 0 ? summary.pass / summary.total : 0;
  }

  // Build the assessment text from findings
  const passCount = summary.pass;
  const failCount = summary.fail;
  const warnCount = summary.warning;
  const assessment = `${passCount}/${summary.total} resources compliant.`
    + (failCount > 0 ? ` ${failCount} non-compliant.` : '')
    + (warnCount > 0 ? ` ${warnCount} warning(s).` : '');

  // Extract caveats from failing/warning findings
  const caveats = findings
    .filter(f => f.status === 'fail' || f.status === 'warning')
    .map(f => `${f.resource_id}: ${f.detail}`);

  // Build evidence refs and items from findings
  const evidenceRefs = findings.map((_, i) => `ev-site-${site.envelope_id.slice(0, 8)}-${i}`);

  const now = site.timestamp;
  const validUntil = new Date(new Date(now).getTime() + 3600 * 1000).toISOString();

  // Compute composite level
  let compositeLevel: CompositeLevel;
  if (result === 'SATISFIED' && confidence >= 0.95) compositeLevel = 'VERIFIED';
  else if (result === 'SATISFIED') compositeLevel = 'HIGH';
  else if (result === 'PARTIAL' && confidence >= 0.75) compositeLevel = 'MEDIUM';
  else if (result === 'PARTIAL') compositeLevel = 'LOW';
  else if (result === 'NOT_SATISFIED') compositeLevel = 'CRITICAL';
  else if (result === 'NOT_APPLICABLE') compositeLevel = 'VERIFIED';
  else compositeLevel = 'LOW';

  // Determine services from resource_type
  const services = [...new Set(findings.map(f => {
    const parts = f.resource_type.split(':');
    return parts[0]?.toUpperCase() || 'Unknown';
  }))];

  const claim: Claim = {
    claim_id: `cl-${site.envelope_id.slice(0, 12)}`,
    domain,
    assertion: `${site.control.name} control verification`,
    result,
    confidence,
    evidence_refs: evidenceRefs,
    evidence_count: findings.length,
    opinion: {
      assessment,
      context: null,
      caveats,
      recommendations: [],
    },
    scope: {
      environment: 'production',
      services,
      regions: site.scope.regions,
      accounts: [site.scope.account_id],
      exclusions: [],
    },
    valid_from: now,
    ttl_seconds: 3600,
    agent_id: site.agent?.name || site.control.id,
    agent_version: site.agent?.version || '1.0.0',
    agent_certification: null,
    signature: '',
  };

  return {
    envelope_id: site.envelope_id,
    schema_version: site.otvp_version,
    generated_at: now,
    valid_until: validUntil,
    ttl_seconds: 3600,
    subject: {
      organization: site.organization.name,
      otvp_id: `otvp:org:${site.organization.id}`,
      environment: 'production',
    },
    relying_party: null,
    query_ref: null,
    disclosure_level: 'full',
    claims: [claim],
    evidence_summary: {
      total_items: findings.length,
      merkle_root: null,
      collection_window_start: now,
      collection_window_end: now,
      domains_covered: [domain],
    },
    composite_level: compositeLevel,
    domain_scores: {
      [domain]: {
        level: compositeLevel,
        confidence,
        claims_satisfied: result === 'SATISFIED' ? 1 : 0,
        claims_total: 1,
      },
    },
    signer_id: site.agent?.name || site.control.id,
    signature: '',
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

/** Validate that an OTVP config document (dashboard format) has the required fields */
function validateConfig(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Config is not an object' };
  }
  const c = config as Record<string, unknown>;

  if (typeof c.otvp_version !== 'string') return { valid: false, error: 'Missing otvp_version' };
  if (typeof c.otvp_id !== 'string') return { valid: false, error: 'Missing otvp_id' };
  if (typeof c.organization !== 'string') return { valid: false, error: 'Missing organization' };
  if (!Array.isArray(c.public_keys) || c.public_keys.length === 0) {
    return { valid: false, error: 'Missing or empty public_keys' };
  }
  if (!c.endpoints || typeof c.endpoints !== 'object') {
    return { valid: false, error: 'Missing endpoints' };
  }
  const endpoints = c.endpoints as Record<string, unknown>;
  if (typeof endpoints.envelopes !== 'string') return { valid: false, error: 'Missing endpoints.envelopes' };
  if (typeof endpoints.latest !== 'string') return { valid: false, error: 'Missing endpoints.latest' };

  // Validate at least one non-revoked key
  const activeKeys = (c.public_keys as Array<Record<string, unknown>>).filter(k => !k.revoked);
  if (activeKeys.length === 0) {
    return { valid: false, error: 'No active (non-revoked) public keys' };
  }

  return { valid: true };
}
