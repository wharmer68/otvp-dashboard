export interface Vendor {
  id: string;
  name: string;
  otvp_id: string;
  environment: string;
  cloud_provider: string;
  region: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanRun {
  id: string;
  vendor_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  agent_count: number | null;
  envelope_count: number | null;
  trigger: 'manual' | 'scheduled' | 'api';
  error_message: string | null;
}
