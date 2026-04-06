import type { OtvpConfig, DiscoveryResult } from '../types/vendor';

/**
 * Discovers a vendor's OTVP configuration by fetching their .well-known endpoint.
 *
 * Flow:
 *   1. Fetch https://{domain}/.well-known/otvp/otvp-config.json
 *   2. Validate the config structure
 *   3. Optionally verify the DNS TXT record at _otvp.{domain}
 *   4. Return the discovery result with config + verification status
 */
export async function discoverVendor(domain: string): Promise<DiscoveryResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const configUrl = resolveConfigUrl(cleanDomain);
  const now = new Date().toISOString();

  try {
    const response = await fetch(configUrl);
    if (!response.ok) {
      return {
        success: false,
        domain: cleanDomain,
        config: null,
        dns_verified: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        discovered_at: now,
      };
    }

    const config = await response.json() as OtvpConfig;
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        domain: cleanDomain,
        config: null,
        dns_verified: false,
        error: `Invalid OTVP config: ${validation.error}`,
        discovered_at: now,
      };
    }

    // DNS verification would happen server-side in production.
    // In the browser we can't do DNS lookups directly.
    // For now, mark as not DNS-verified (would be done via API).
    const dnsVerified = false;

    return {
      success: true,
      domain: cleanDomain,
      config,
      dns_verified: dnsVerified,
      discovered_at: now,
    };
  } catch (err) {
    return {
      success: false,
      domain: cleanDomain,
      config: null,
      dns_verified: false,
      error: err instanceof Error ? err.message : 'Network error',
      discovered_at: now,
    };
  }
}

/** Resolve the config URL for a domain, handling localhost for development */
export function resolveConfigUrl(domain: string): string {
  // In development, proxy through Vite's dev server for local mock data
  if (domain === 'localhost' || domain.startsWith('localhost:')) {
    return `http://${domain}/.well-known/otvp/otvp-config.json`;
  }
  // Special case: if running on the same origin (demo mode),
  // use a relative URL so Vite serves from public/
  if (typeof window !== 'undefined' && domain === window.location.hostname) {
    return '/.well-known/otvp/otvp-config.json';
  }
  // In demo mode, also handle the "demo" domain specially
  if (domain === 'demo.otvp.dev' || domain === 'killswitch-advisory.com') {
    return '/.well-known/otvp/otvp-config.json';
  }
  return `https://${domain}/.well-known/otvp/otvp-config.json`;
}

/** Resolve an envelope endpoint URL relative to the vendor's domain */
export function resolveEndpointUrl(domain: string, path: string): string {
  if (domain === 'localhost' || domain.startsWith('localhost:')) {
    return `http://${domain}${path}`;
  }
  if (typeof window !== 'undefined' && domain === window.location.hostname) {
    return path;
  }
  if (domain === 'demo.otvp.dev' || domain === 'killswitch-advisory.com') {
    return path;
  }
  return `https://${domain}${path}`;
}

/** Validate that an OTVP config document has the required fields */
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

/** Fetch the latest envelopes from a vendor's endpoint */
export async function fetchVendorEnvelopes(
  domain: string,
  endpointPath: string,
): Promise<{ envelopes: unknown[]; error?: string }> {
  const url = resolveEndpointUrl(domain, endpointPath);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { envelopes: [], error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    // The endpoint can return a single envelope or an array
    const envelopes = Array.isArray(data) ? data : data.envelopes ? data.envelopes : [data];
    return { envelopes };
  } catch (err) {
    return { envelopes: [], error: err instanceof Error ? err.message : 'Network error' };
  }
}
