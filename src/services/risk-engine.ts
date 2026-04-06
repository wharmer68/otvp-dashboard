import type { TrustEnvelope, CompositeLevel, Claim } from '../types/envelope';
import type { RiskAssessment, DomainRiskScore, ClaimSummary, RiskCategory } from '../types/risk';

export const RISK_CATEGORIES: RiskCategory[] = [
  {
    name: 'Data Protection',
    weight: 0.25,
    domains: [
      'data_protection.encryption.at_rest',
      'data_protection.encryption.key_management',
      'data_protection.encryption.in_transit',
    ],
  },
  {
    name: 'Identity & Access',
    weight: 0.25,
    domains: [
      'identity_and_access.authentication.mfa_enforcement',
      'identity_and_access.lifecycle.provisioning',
      'identity_and_access.authorization.least_privilege',
    ],
  },
  {
    name: 'Network Security',
    weight: 0.15,
    domains: [
      'network_security.segmentation',
      'network_security.ingress_controls',
    ],
  },
  {
    name: 'Detection & Response',
    weight: 0.20,
    domains: [
      'detection_and_response.logging.completeness',
    ],
  },
  {
    name: 'Operational Resilience',
    weight: 0.15,
    domains: [
      'infrastructure.compute.vulnerability_management',
      'operational_resilience.backup.coverage',
    ],
  },
];

const RESULT_MULTIPLIER: Record<string, number> = {
  SATISFIED: 1.0,
  PARTIAL: 0.5,
  NOT_SATISFIED: 0.0,
  INDETERMINATE: 0.25,
};

function scoreToLevel(score: number): CompositeLevel {
  if (score >= 95) return 'VERIFIED';
  if (score >= 75) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'CRITICAL';
}

function scoreClaim(claim: Claim): number | null {
  if (claim.result === 'NOT_APPLICABLE') return null;
  const multiplier = RESULT_MULTIPLIER[claim.result] ?? 0.25;
  return claim.confidence * multiplier;
}

export function computeRiskAssessment(
  envelopes: TrustEnvelope[],
  vendorId: string,
  scanRunId?: string,
): RiskAssessment {
  const allClaims = envelopes.flatMap(e => e.claims || []);

  // Compute per-category scores
  const domainScores: Record<string, DomainRiskScore> = {};
  let overallScore = 0;

  for (const category of RISK_CATEGORIES) {
    const categoryClaims = allClaims.filter(c => category.domains.includes(c.domain));
    const scores = categoryClaims.map(scoreClaim).filter((s): s is number => s !== null);
    const contributingEnvelopes = envelopes
      .filter(e => (e.claims || []).some(c => category.domains.includes(c.domain)))
      .map(e => e.envelope_id);

    const categoryScore = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
      : 0;

    domainScores[category.name] = {
      category: category.name,
      score: Math.round(categoryScore * 10) / 10,
      level: scoreToLevel(categoryScore),
      weight: category.weight,
      claims_satisfied: categoryClaims.filter(c => c.result === 'SATISFIED').length,
      claims_total: categoryClaims.length,
      contributing_envelopes: contributingEnvelopes,
    };

    overallScore += categoryScore * category.weight;
  }

  // Compute claim summary
  const claimSummary: ClaimSummary = {
    total: allClaims.length,
    satisfied: allClaims.filter(c => c.result === 'SATISFIED').length,
    partial: allClaims.filter(c => c.result === 'PARTIAL').length,
    not_satisfied: allClaims.filter(c => c.result === 'NOT_SATISFIED').length,
    not_applicable: allClaims.filter(c => c.result === 'NOT_APPLICABLE').length,
    indeterminate: allClaims.filter(c => c.result === 'INDETERMINATE').length,
  };

  return {
    id: `ra-${Date.now()}`,
    vendor_id: vendorId,
    scan_run_id: scanRunId || null,
    overall_score: Math.round(overallScore * 10) / 10,
    overall_level: scoreToLevel(overallScore),
    domain_scores: domainScores,
    envelope_count: envelopes.length,
    claim_summary: claimSummary,
    computed_at: new Date().toISOString(),
  };
}
