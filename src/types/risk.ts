import type { CompositeLevel } from './envelope';

export interface RiskAssessment {
  id: string;
  vendor_id: string;
  scan_run_id: string | null;
  overall_score: number;
  overall_level: CompositeLevel;
  domain_scores: Record<string, DomainRiskScore>;
  envelope_count: number;
  claim_summary: ClaimSummary;
  computed_at: string;
}

export interface DomainRiskScore {
  category: string;
  score: number;
  level: CompositeLevel;
  weight: number;
  claims_satisfied: number;
  claims_total: number;
  contributing_envelopes: string[];
}

export interface ClaimSummary {
  total: number;
  satisfied: number;
  partial: number;
  not_satisfied: number;
  not_applicable: number;
  indeterminate: number;
}

export interface RiskCategory {
  name: string;
  weight: number;
  domains: string[];
}
