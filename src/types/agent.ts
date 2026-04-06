export interface AgentDefinition {
  agent_id: string;
  agent_version: string;
  domain: string;
  display_name: string;
  description: string;
  services: string[];
  supported_providers: string[];
}

export interface AgentContext {
  vendor_id: string;
  organization: string;
  otvp_id: string;
  environment: string;
  region: string;
  credentials: Record<string, string>;
}

export interface AgentResult {
  agent_id: string;
  agent_version: string;
  domain: string;
  assertion: string;
  result: 'SATISFIED' | 'PARTIAL' | 'NOT_SATISFIED' | 'INDETERMINATE' | 'NOT_APPLICABLE';
  confidence: number;
  evidence_items: EvidenceItem[];
  opinion: {
    assessment: string;
    context: string | null;
    caveats: string[];
    recommendations: string[];
  };
  scope: {
    environment: string;
    services: string[];
    regions: string[];
    accounts: string[];
    exclusions: string[];
  };
}

export interface EvidenceItem {
  evidence_id: string;
  resource_arn?: string;
  resource_type: string;
  data: Record<string, unknown>;
  collected_at: string;
}

export type AgentExecutor = (ctx: AgentContext) => Promise<AgentResult>;
