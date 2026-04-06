import type { AgentResult } from '../types/agent';
import type {
  TrustEnvelope,
  Claim,
  CompositeLevel,
  EvidenceSummary,
  DomainScore,
} from '../types/envelope';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function simpleHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(16, '0') + h2.toString(16).padStart(8, '0') + h1.toString(16).padStart(8, '0');
}

function computeCompositeLevel(
  confidence: number,
  result: AgentResult['result'],
): CompositeLevel {
  // Composite level must reflect BOTH the claim result and the confidence.
  // High confidence in a failure is a bad thing, not a good thing.
  switch (result) {
    case 'SATISFIED':
      // Confidence reflects how thoroughly the agent verified compliance
      if (confidence >= 0.95) return 'VERIFIED';
      if (confidence >= 0.75) return 'HIGH';
      if (confidence >= 0.55) return 'MEDIUM';
      return 'LOW';
    case 'PARTIAL':
      // Some resources pass, some fail — confidence = compliance rate
      if (confidence >= 0.75) return 'MEDIUM';
      if (confidence >= 0.55) return 'LOW';
      return 'CRITICAL';
    case 'NOT_SATISFIED':
      // Control is failing — higher confidence means more certain it's bad
      return 'CRITICAL';
    case 'NOT_APPLICABLE':
      // Control doesn't apply — not a risk, but not verified either
      if (confidence >= 0.95) return 'VERIFIED';
      return 'HIGH';
    case 'INDETERMINATE':
      // Couldn't determine — treat as a gap
      return 'LOW';
    default:
      return 'CRITICAL';
  }
}

function computeMerkleRoot(evidenceItems: AgentResult['evidence_items']): string | null {
  if (evidenceItems.length === 0) return null;
  const concatenated = evidenceItems
    .map((item) => item.evidence_id + JSON.stringify(item.data))
    .join('|');
  return simpleHash(concatenated);
}

export class EnvelopeBuilder {
  build(
    result: AgentResult,
    organization: string,
    otvpId: string,
    environment: string
  ): TrustEnvelope {
    const now = new Date();
    const validUntil = new Date(now.getTime() + 3600 * 1000);
    const envelopeId = 'te-' + randomHex(6);
    const claimId = 'cl-' + randomHex(6);

    const evidenceRefs = result.evidence_items.map(
      () => 'ev-' + randomHex(6)
    );

    const claim: Claim = {
      claim_id: claimId,
      domain: result.domain,
      assertion: result.assertion,
      result: result.result,
      confidence: result.confidence,
      evidence_refs: evidenceRefs,
      evidence_count: result.evidence_items.length,
      opinion: {
        assessment: result.opinion.assessment,
        context: result.opinion.context,
        caveats: result.opinion.caveats,
        recommendations: result.opinion.recommendations,
      },
      scope: {
        environment: result.scope.environment,
        services: result.scope.services,
        regions: result.scope.regions,
        accounts: result.scope.accounts,
        exclusions: result.scope.exclusions,
      },
      valid_from: now.toISOString(),
      ttl_seconds: 3600,
      agent_id: result.agent_id,
      agent_version: result.agent_version,
      agent_certification: null,
      signature: randomHex(32),
    };

    const evidenceSummary: EvidenceSummary = {
      total_items: result.evidence_items.length,
      merkle_root: computeMerkleRoot(result.evidence_items),
      collection_window_start:
        result.evidence_items.length > 0 ? now.toISOString() : null,
      collection_window_end:
        result.evidence_items.length > 0 ? now.toISOString() : null,
      domains_covered: [result.domain],
    };

    const compositeLevel = computeCompositeLevel(result.confidence, result.result);

    const domainScore: DomainScore = {
      level: compositeLevel,
      confidence: result.confidence,
      claims_satisfied: result.result === 'SATISFIED' ? 1 : 0,
      claims_total: 1,
    };

    const envelope: TrustEnvelope = {
      envelope_id: envelopeId,
      schema_version: '1.0.0',
      generated_at: now.toISOString(),
      valid_until: validUntil.toISOString(),
      ttl_seconds: 3600,
      subject: {
        organization,
        otvp_id: otvpId,
        environment,
      },
      relying_party: null,
      query_ref: null,
      disclosure_level: 'full',
      claims: [claim],
      evidence_summary: evidenceSummary,
      composite_level: compositeLevel,
      domain_scores: {
        [result.domain]: domainScore,
      },
      signer_id: result.agent_id,
      signature: randomHex(32),
    };

    return envelope;
  }
}
