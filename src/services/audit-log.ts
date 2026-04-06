import { getSupabase } from './supabase';

export interface AuditEntry {
  id: string;
  event_type: string;
  vendor_id: string | null;
  scan_run_id: string | null;
  envelope_id: string | null;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

// In-memory log for local-only mode
let localLog: AuditEntry[] = [];

export async function logAudit(
  eventType: string,
  opts: {
    vendor_id?: string;
    scan_run_id?: string;
    envelope_id?: string;
    actor?: string;
    details?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const entry = {
    event_type: eventType,
    vendor_id: opts.vendor_id || null,
    scan_run_id: opts.scan_run_id || null,
    envelope_id: opts.envelope_id || null,
    actor: opts.actor || 'system',
    details: opts.details || {},
  };

  const sb = getSupabase();
  if (sb) {
    await sb.from('audit_log').insert(entry);
  } else {
    localLog.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...entry,
      created_at: new Date().toISOString(),
    });
  }
}

export async function getAuditLog(vendorId?: string, limit = 100): Promise<AuditEntry[]> {
  const sb = getSupabase();
  if (sb) {
    let query = sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
    if (vendorId) query = query.eq('vendor_id', vendorId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AuditEntry[];
  }
  const filtered = vendorId ? localLog.filter(e => e.vendor_id === vendorId) : localLog;
  return filtered.slice(0, limit);
}

export function getLocalAuditLog(): AuditEntry[] {
  return localLog;
}
