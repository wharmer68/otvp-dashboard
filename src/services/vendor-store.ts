import type { Vendor } from '../types/vendor';
import { getSupabase } from './supabase';

/** Normalize a DB row to a full Vendor, providing defaults for migration-002 fields */
function normalizeVendor(row: Record<string, unknown>): Vendor {
  return {
    id: row.id as string,
    domain: (row.domain as string) || '',
    name: (row.name as string) || 'Unknown',
    otvp_id: (row.otvp_id as string) || '',
    config_url: (row.config_url as string) || '',
    public_key_kid: (row.public_key_kid as string) || '',
    public_key: (row.public_key as string) || '',
    dns_verified: (row.dns_verified as boolean) ?? false,
    domains_covered: (row.domains_covered as string[]) || [],
    refresh_interval_seconds: (row.refresh_interval_seconds as number) || 3600,
    submission_method: (row.submission_method as Vendor['submission_method']) || 'discovery',
    last_fetched_at: (row.last_fetched_at as string) || null,
    last_envelope_at: (row.last_envelope_at as string) || null,
    is_active: (row.is_active as boolean) ?? true,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
  };
}

// Vendors created locally when Supabase insert fails (schema mismatch fallback)
let localFallbackVendors: Vendor[] = [];

// In-memory store for local-only mode
let localVendors: Vendor[] = [
  {
    id: 'local-default',
    domain: 'killswitch-advisory.com',
    name: 'Killswitch Advisory',
    otvp_id: 'otvp:org:killswitch-advisory',
    config_url: '/.well-known/otvp/otvp-config.json',
    public_key_kid: 'killswitch-2026-primary',
    public_key: 'MCowBQYDK2VwAyEAx2XpVUgWNeYfGJhV1p0k8kR2J7QzGWL4N8vJqHMbUno=',
    dns_verified: false,
    domains_covered: [
      'data_protection.encryption.at_rest',
      'data_protection.encryption.key_management',
      'data_protection.encryption.in_transit',
      'identity_and_access.authentication.mfa_enforcement',
      'identity_and_access.lifecycle.provisioning',
      'identity_and_access.authorization.least_privilege',
      'network_security.segmentation',
      'network_security.ingress_controls',
      'detection_and_response.logging.completeness',
      'infrastructure.compute.vulnerability_management',
      'operational_resilience.backup.coverage',
    ],
    refresh_interval_seconds: 3600,
    submission_method: 'discovery',
    last_fetched_at: null,
    last_envelope_at: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getVendors(): Promise<Vendor[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').select('*').order('name');
    if (error) throw error;
    const remote = (data || []).map((row: Record<string, unknown>) => normalizeVendor(row));
    // Merge any vendors that fell back to local storage due to schema mismatch
    return [...remote, ...localFallbackVendors];
  }
  return localVendors;
}

export async function getActiveVendors(): Promise<Vendor[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').select('*').eq('is_active', true).order('name');
    if (error) throw error;
    const remote = (data || []).map((row: Record<string, unknown>) => normalizeVendor(row));
    return [...remote, ...localFallbackVendors.filter(v => v.is_active)];
  }
  return localVendors.filter(v => v.is_active);
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  // Check fallback vendors first (local IDs won't exist in Supabase)
  const fallback = localFallbackVendors.find(v => v.id === id);
  if (fallback) return fallback;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').select('*').eq('id', id).single();
    if (error) return null;
    return normalizeVendor(data as Record<string, unknown>);
  }
  return localVendors.find(v => v.id === id) || null;
}

export async function createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').insert(vendor).select().single();
    if (!error && data) return data as Vendor;
    // Schema mismatch or other DB error — fall back to local store
    console.warn('Supabase insert failed, using local store:', error?.message);
    const fallbackVendor: Vendor = {
      ...vendor,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localFallbackVendors.push(fallbackVendor);
    return fallbackVendor;
  }
  const newVendor: Vendor = {
    ...vendor,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localVendors.push(newVendor);
  return newVendor;
}

export async function updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return normalizeVendor(data as Record<string, unknown>);
  }
  const idx = localVendors.findIndex(v => v.id === id);
  if (idx === -1) return null;
  localVendors[idx] = { ...localVendors[idx], ...updates, updated_at: new Date().toISOString() };
  return localVendors[idx];
}

export async function deleteVendor(id: string): Promise<void> {
  // Check if it's a fallback vendor first
  if (localFallbackVendors.some(v => v.id === id)) {
    localFallbackVendors = localFallbackVendors.filter(v => v.id !== id);
    return;
  }
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('vendors').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  localVendors = localVendors.filter(v => v.id !== id);
}

export function getLocalVendors(): Vendor[] {
  return localVendors;
}
