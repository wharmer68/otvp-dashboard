import type { Vendor } from '../types/vendor';
import { getSupabase } from './supabase';

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
    return (data || []) as Vendor[];
  }
  return localVendors;
}

export async function getActiveVendors(): Promise<Vendor[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').select('*').eq('is_active', true).order('name');
    if (error) throw error;
    return (data || []) as Vendor[];
  }
  return localVendors.filter(v => v.is_active);
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').select('*').eq('id', id).single();
    if (error) return null;
    return data as Vendor;
  }
  return localVendors.find(v => v.id === id) || null;
}

export async function createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('vendors').insert(vendor).select().single();
    if (error) throw error;
    return data as Vendor;
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
    return data as Vendor;
  }
  const idx = localVendors.findIndex(v => v.id === id);
  if (idx === -1) return null;
  localVendors[idx] = { ...localVendors[idx], ...updates, updated_at: new Date().toISOString() };
  return localVendors[idx];
}

export async function deleteVendor(id: string): Promise<void> {
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
