/**
 * OTVP DNS Verification Service
 *
 * Verifies domain ownership by checking DNS TXT records at _otvp.{domain}.
 * Uses DNS-over-HTTPS (DoH) since browsers cannot perform raw DNS queries.
 *
 * TXT record format:
 *   _otvp.{domain} TXT "v=otvp1; fp={sha256-hex}; kid={key_id}; org={otvp_id}"
 *
 * See OTVP Specification v1.0, Section 15.5 for full details.
 */

import type { OtvpConfig } from '../types/vendor';

/** Result of a DNS TXT record verification attempt */
export interface DnsVerificationResult {
  /** Whether at least one active key matched a TXT record fingerprint */
  verified: boolean;
  /** The kid of the key that matched, if any */
  matched_kid: string | null;
  /** The fingerprint that matched, if any */
  matched_fingerprint: string | null;
  /** How many _otvp TXT records were found */
  records_found: number;
  /** Whether the DNS response was DNSSEC-validated (AD flag) */
  dnssec_validated: boolean;
  /** Error message if verification could not be performed */
  error?: string;
}

/** A parsed OTVP DNS TXT record */
interface OtvpTxtRecord {
  version: string;
  fingerprint: string;
  kid: string;
  org?: string;
}

// ─── DoH Providers ─────────────────────────────────────────────────────────

interface DohResponse {
  Status: number;
  AD?: boolean;  // Authenticated Data (DNSSEC)
  Answer?: Array<{
    type: number;
    data: string;
  }>;
}

const DOH_PROVIDERS: Array<{
  name: string;
  url: (domain: string) => string;
  headers: Record<string, string>;
}> = [
  {
    name: 'Cloudflare',
    url: (domain: string) =>
      `https://cloudflare-dns.com/dns-query?name=_otvp.${domain}&type=TXT`,
    headers: { Accept: 'application/dns-json' },
  },
  {
    name: 'Google',
    url: (domain: string) =>
      `https://dns.google/resolve?name=_otvp.${domain}&type=TXT`,
    headers: {},
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Verify a vendor's DNS TXT record against their otvp-config.json public keys.
 *
 * 1. Queries DoH for TXT records at _otvp.{domain}
 * 2. Parses records with v=otvp1 prefix
 * 3. Computes SHA-256 fingerprints of active keys from config
 * 4. Matches fingerprints and kids
 */
export async function verifyDnsTxt(
  domain: string,
  config: OtvpConfig,
): Promise<DnsVerificationResult> {
  // Fetch TXT records via DoH (try providers in order)
  let dohResult: { records: string[]; dnssec: boolean } | null = null;

  for (const provider of DOH_PROVIDERS) {
    try {
      const resp = await fetch(provider.url(domain), { headers: provider.headers });
      if (!resp.ok) continue;

      const data: DohResponse = await resp.json();

      // TXT records are DNS type 16
      const txtAnswers = (data.Answer || []).filter(a => a.type === 16);
      const records = txtAnswers.map(a => stripQuotes(a.data));

      dohResult = { records, dnssec: data.AD === true };
      break;
    } catch {
      // Try next provider
    }
  }

  if (!dohResult) {
    return {
      verified: false,
      matched_kid: null,
      matched_fingerprint: null,
      records_found: 0,
      dnssec_validated: false,
      error: 'DNS lookup failed — all DoH providers unreachable',
    };
  }

  // Parse OTVP TXT records (those starting with v=otvp1)
  const otvpRecords = dohResult.records
    .map(parseTxtRecord)
    .filter((r): r is OtvpTxtRecord => r !== null);

  if (otvpRecords.length === 0) {
    return {
      verified: false,
      matched_kid: null,
      matched_fingerprint: null,
      records_found: 0,
      dnssec_validated: dohResult.dnssec,
    };
  }

  // Get active (non-revoked) keys from config
  const activeKeys = config.public_keys.filter(k => !k.revoked);

  // Compute fingerprints and match
  for (const record of otvpRecords) {
    for (const key of activeKeys) {
      // Match by kid first (fast path)
      if (record.kid !== key.kid) continue;

      // Compute fingerprint of this key
      const keyFingerprint = await computeKeyFingerprint(key.public_key);
      if (keyFingerprint === record.fingerprint) {
        // Optional org cross-check
        if (record.org && record.org !== config.otvp_id) {
          continue;  // Org mismatch — try next record
        }

        return {
          verified: true,
          matched_kid: key.kid,
          matched_fingerprint: record.fingerprint,
          records_found: otvpRecords.length,
          dnssec_validated: dohResult.dnssec,
        };
      }
    }
  }

  // TXT records exist but no fingerprint matched any active key
  return {
    verified: false,
    matched_kid: null,
    matched_fingerprint: null,
    records_found: otvpRecords.length,
    dnssec_validated: dohResult.dnssec,
    error: 'TXT records found but no fingerprint matches any active key — possible key mismatch',
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Strip surrounding quotes from a DoH TXT record data field */
function stripQuotes(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Parse a TXT record string into an OtvpTxtRecord.
 * Expected format: "v=otvp1; fp={hex}; kid={id}; org={id}"
 * Returns null if the record is not a valid OTVP record.
 */
function parseTxtRecord(txt: string): OtvpTxtRecord | null {
  const fields: Record<string, string> = {};

  for (const part of txt.split(';')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    fields[key] = value;
  }

  // Must be an OTVP v1 record
  if (fields['v'] !== 'otvp1') return null;
  if (!fields['fp'] || !fields['kid']) return null;

  return {
    version: fields['v'],
    fingerprint: fields['fp'],
    kid: fields['kid'],
    org: fields['org'],
  };
}

/**
 * Compute SHA-256 hex digest of a base64-encoded Ed25519 public key.
 * Uses the Web Crypto API (available in all modern browsers).
 */
async function computeKeyFingerprint(publicKeyB64: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
}
