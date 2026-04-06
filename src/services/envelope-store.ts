import type { TrustEnvelope } from '../types/envelope';
import { getSupabase } from './supabase';

// In-memory store for local-only mode
let localEnvelopes: TrustEnvelope[] = [];

export async function storeEnvelope(envelope: TrustEnvelope, vendorId: string, scanRunId?: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('envelopes').insert({
      envelope_id: envelope.envelope_id,
      scan_run_id: scanRunId || null,
      vendor_id: vendorId,
      schema_version: envelope.schema_version,
      generated_at: envelope.generated_at,
      valid_until: envelope.valid_until,
      ttl_seconds: envelope.ttl_seconds,
      subject: envelope.subject,
      disclosure_level: envelope.disclosure_level,
      composite_level: envelope.composite_level,
      domain_scores: envelope.domain_scores,
      evidence_summary: envelope.evidence_summary,
      signer_id: envelope.signer_id,
      signature: envelope.signature,
      raw_envelope: envelope,
    });
    if (error) throw error;

    // Denormalize claims
    for (const claim of envelope.claims) {
      const { error: claimErr } = await sb.from('claims').insert({
        claim_id: claim.claim_id,
        envelope_id: envelope.envelope_id,
        domain: claim.domain,
        assertion: claim.assertion,
        result: claim.result,
        confidence: claim.confidence,
        evidence_count: claim.evidence_count,
        evidence_refs: claim.evidence_refs,
        opinion: claim.opinion,
        scope: claim.scope,
        agent_id: claim.agent_id,
        agent_version: claim.agent_version,
        signature: claim.signature,
        valid_from: claim.valid_from,
        ttl_seconds: claim.ttl_seconds,
      });
      if (claimErr) console.error('Failed to store claim:', claimErr);
    }
  } else {
    // Local-only mode
    if (!localEnvelopes.find(e => e.envelope_id === envelope.envelope_id)) {
      localEnvelopes.push(envelope);
    }
  }
}

export async function getEnvelopes(vendorId?: string): Promise<TrustEnvelope[]> {
  const sb = getSupabase();
  if (sb) {
    let query = sb.from('envelopes').select('raw_envelope').order('generated_at', { ascending: false });
    if (vendorId) query = query.eq('vendor_id', vendorId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => row.raw_envelope as TrustEnvelope);
  }
  return localEnvelopes;
}

export async function getEnvelopeById(envelopeId: string): Promise<TrustEnvelope | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('envelopes').select('raw_envelope').eq('envelope_id', envelopeId).single();
    if (error) return null;
    return data?.raw_envelope as TrustEnvelope;
  }
  return localEnvelopes.find(e => e.envelope_id === envelopeId) || null;
}

export async function getEnvelopesByScanRun(scanRunId: string): Promise<TrustEnvelope[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('envelopes').select('raw_envelope').eq('scan_run_id', scanRunId).order('generated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => row.raw_envelope as TrustEnvelope);
  }
  return localEnvelopes;
}

export function getLocalEnvelopes(): TrustEnvelope[] {
  return localEnvelopes;
}

export function setLocalEnvelopes(envs: TrustEnvelope[]): void {
  localEnvelopes = envs;
}

export function addLocalEnvelope(env: TrustEnvelope): void {
  if (!localEnvelopes.find(e => e.envelope_id === env.envelope_id)) {
    localEnvelopes.unshift(env);
  }
}
