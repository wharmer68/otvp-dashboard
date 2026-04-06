export type ClaimResult =
  | 'SATISFIED'
  | 'PARTIAL'
  | 'NOT_SATISFIED'
  | 'INDETERMINATE'
  | 'NOT_APPLICABLE';

export type CompositeLevel =
  | 'VERIFIED'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'CRITICAL';

export interface SubjectInfo {
  organization: string;
  otvp_id: string;
  environment: string;
}

export interface Opinion {
  assessment: string;
  context: string | null;
  caveats: string[];
  recommendations: string[];
}

export interface ClaimScope {
  environment: string;
  services: string[];
  regions: string[];
  accounts: string[];
  exclusions: string[];
}

export interface Claim {
  claim_id: string;
  domain: string;
  assertion: string;
  result: ClaimResult;
  confidence: number;
  evidence_refs: string[];
  evidence_count: number;
  opinion: Opinion;
  scope: ClaimScope;
  valid_from: string;
  ttl_seconds: number;
  agent_id: string;
  agent_version: string;
  agent_certification: string | null;
  signature: string;
}

export interface EvidenceSummary {
  total_items: number;
  merkle_root: string | null;
  collection_window_start: string | null;
  collection_window_end: string | null;
  domains_covered: string[];
}

export interface DomainScore {
  level: string;
  confidence: number;
  claims_satisfied: number;
  claims_total: number;
}

export interface TrustEnvelope {
  envelope_id: string;
  schema_version: string;
  generated_at: string;
  valid_until: string;
  ttl_seconds: number;
  subject: SubjectInfo;
  relying_party: string | null;
  query_ref: string | null;
  disclosure_level: string;
  claims: Claim[];
  evidence_summary: EvidenceSummary;
  composite_level: CompositeLevel;
  domain_scores: Record<string, DomainScore>;
  signer_id: string;
  signature: string;
}
