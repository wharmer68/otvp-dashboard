import { registerAgent } from './index';
import type { AgentDefinition, AgentResult, AgentContext } from '../types/agent';

function makeAgent(
  def: AgentDefinition,
  resultData: Omit<AgentResult, 'agent_id' | 'agent_version' | 'domain'>
): void {
  const executor = async (_ctx: AgentContext): Promise<AgentResult> => ({
    agent_id: def.agent_id,
    agent_version: def.agent_version,
    domain: def.domain,
    ...resultData,
  });
  registerAgent(def, executor);
}

// 1. KMS Key Management
makeAgent(
  {
    agent_id: 'aws-kms-agent-v1',
    agent_version: '1.0.0',
    domain: 'data_protection.encryption.key_management',
    display_name: 'KMS Key Management',
    description: 'Verifies KMS key rotation and management practices',
    services: ['KMS'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All customer-managed KMS keys have automatic rotation enabled',
    result: 'SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-kms-001',
        resource_arn: 'arn:aws:kms:us-east-2:294137048789:key/aws-managed-s3',
        resource_type: 'AWS::KMS::Key',
        data: { key_manager: 'AWS', rotation_enabled: true, key_state: 'Enabled', description: 'Default key for S3' },
        collected_at: '2026-02-15T23:55:00Z',
      },
      {
        evidence_id: 'ev-kms-002',
        resource_arn: 'arn:aws:kms:us-east-2:294137048789:key/aws-managed-ebs',
        resource_type: 'AWS::KMS::Key',
        data: { key_manager: 'AWS', rotation_enabled: true, key_state: 'Enabled', description: 'Default key for EBS' },
        collected_at: '2026-02-15T23:55:00Z',
      },
    ],
    opinion: {
      assessment: 'No customer-managed keys found. 2 AWS-managed key(s) in use (auto-rotating).',
      context: null,
      caveats: [],
      recommendations: [
        'Consider using customer-managed CMKs for sensitive workloads to enable granular access control and custom rotation schedules.',
      ],
    },
    scope: {
      environment: 'test',
      services: ['KMS'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 2. Network Segmentation
makeAgent(
  {
    agent_id: 'aws-network-agent-v1',
    agent_version: '1.0.0',
    domain: 'network_security.segmentation',
    display_name: 'Network Segmentation',
    description: 'Checks VPC and security group segmentation',
    services: ['VPC', 'SecurityGroups'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'No high-risk ports are exposed to the public internet via security groups',
    result: 'SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-net-001',
        resource_arn: 'arn:aws:ec2:us-east-2:294137048789:security-group/sg-0a1b2c3d4e5f6g7h8',
        resource_type: 'AWS::EC2::SecurityGroup',
        data: { group_name: 'default', high_risk_ports_open: false, inbound_rules: 2, outbound_rules: 1 },
        collected_at: '2026-02-15T23:55:01Z',
      },
    ],
    opinion: {
      assessment: 'All 1 security group(s) properly segmented. No high-risk ports exposed to internet.',
      context: null,
      caveats: [],
      recommendations: [],
    },
    scope: {
      environment: 'test',
      services: ['VPC', 'SecurityGroups'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 3. Ingress Controls
makeAgent(
  {
    agent_id: 'aws-ingress-agent-v1',
    agent_version: '1.0.0',
    domain: 'network_security.ingress_controls',
    display_name: 'Ingress Controls',
    description: 'Validates ingress controls and WAF protection on public-facing resources',
    services: ['VPC', 'ALB', 'WAF'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All public-facing resources have controlled ingress with WAF protection on internet-facing load balancers',
    result: 'SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-ing-001',
        resource_arn: 'arn:aws:ec2:us-east-2:294137048789:vpc/vpc-0f4888f54d2296acb',
        resource_type: 'AWS::EC2::VPC',
        data: { public_facing_sgs: 0, internet_gateways: 0, nat_gateways: 0 },
        collected_at: '2026-02-15T23:55:02Z',
      },
    ],
    opinion: {
      assessment: 'No public-facing security groups or internet-facing load balancers found. Attack surface is minimal. 100% of resources verified.',
      context: null,
      caveats: [],
      recommendations: [],
    },
    scope: {
      environment: 'test',
      services: ['VPC', 'ALB', 'WAF'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 4. Least Privilege
makeAgent(
  {
    agent_id: 'aws-privilege-agent-v1',
    agent_version: '1.0.0',
    domain: 'identity_and_access.authorization.least_privilege',
    display_name: 'Least Privilege',
    description: 'Checks IAM principals for overprivileged access',
    services: ['IAM'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'No IAM users or roles have overprivileged admin access attached directly',
    result: 'SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-priv-001',
        resource_arn: 'arn:aws:iam::294137048789:role/otvp-lambda-exec',
        resource_type: 'AWS::IAM::Role',
        data: { has_admin_policy: false, attached_policies: 2, inline_policies: 0 },
        collected_at: '2026-02-15T23:55:03Z',
      },
      {
        evidence_id: 'ev-priv-002',
        resource_arn: 'arn:aws:iam::294137048789:role/otvp-ecs-task',
        resource_type: 'AWS::IAM::Role',
        data: { has_admin_policy: false, attached_policies: 1, inline_policies: 1 },
        collected_at: '2026-02-15T23:55:03Z',
      },
    ],
    opinion: {
      assessment: 'All 4 IAM principal(s) follow least privilege. No admin policies directly attached.',
      context: null,
      caveats: [],
      recommendations: [],
    },
    scope: {
      environment: 'test',
      services: ['IAM'],
      regions: ['global'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 5. Encryption at Rest
makeAgent(
  {
    agent_id: 'aws-encryption-agent-v1',
    agent_version: '1.0.0',
    domain: 'data_protection.encryption.at_rest',
    display_name: 'Encryption at Rest',
    description: 'Verifies encryption at rest for storage resources',
    services: ['RDS', 'S3', 'EBS'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All production storage resources are encrypted at rest',
    result: 'PARTIAL',
    confidence: 0.5,
    evidence_items: [
      {
        evidence_id: 'ev-enc-001',
        resource_arn: 'arn:aws:rds:us-east-2:294137048789:db:otvp-prod-analytics',
        resource_type: 'AWS::RDS::DBInstance',
        data: { encryption_enabled: false, engine: 'postgres', storage_type: 'gp3' },
        collected_at: '2026-02-15T23:55:04Z',
      },
      {
        evidence_id: 'ev-enc-002',
        resource_arn: 'arn:aws:s3:::otvp-prod-logs',
        resource_type: 'AWS::S3::Bucket',
        data: { encryption_enabled: false, versioning: true, public_access_blocked: true },
        collected_at: '2026-02-15T23:55:04Z',
      },
      {
        evidence_id: 'ev-enc-003',
        resource_arn: 'arn:aws:ec2:us-east-2:294137048789:volume/vol-022d3b7b946de5cde',
        resource_type: 'AWS::EC2::Volume',
        data: { encryption_enabled: false, size_gb: 100, volume_type: 'gp3' },
        collected_at: '2026-02-15T23:55:04Z',
      },
    ],
    opinion: {
      assessment: '3/6 resources satisfy encryption_enabled. 3 non-compliant.',
      context: null,
      caveats: [
        '3 resource(s) non-compliant: arn:aws:rds:us-east-2:294137048789:db:otvp-prod-analytics, arn:aws:s3:::otvp-prod-logs, arn:aws:ec2:us-east-2:294137048789:volume/vol-022d3b7b946de5cde',
      ],
      recommendations: [],
    },
    scope: {
      environment: 'test',
      services: ['RDS', 'S3', 'EBS'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 6. IAM MFA Enforcement
makeAgent(
  {
    agent_id: 'aws-mfa-agent-v1',
    agent_version: '1.0.0',
    domain: 'identity_and_access.authentication.mfa_enforcement',
    display_name: 'IAM MFA Enforcement',
    description: 'Checks MFA enforcement for IAM users with console access',
    services: ['IAM'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All IAM users with console access have MFA enabled',
    result: 'PARTIAL',
    confidence: 0.5,
    evidence_items: [
      {
        evidence_id: 'ev-mfa-001',
        resource_arn: 'arn:aws:iam::294137048789:user/otvp-dev-alice',
        resource_type: 'AWS::IAM::User',
        data: { console_access: true, mfa_enabled: true, mfa_type: 'virtual' },
        collected_at: '2026-02-15T23:55:05Z',
      },
      {
        evidence_id: 'ev-mfa-002',
        resource_arn: 'arn:aws:iam::294137048789:user/otvp-dev-bob',
        resource_type: 'AWS::IAM::User',
        data: { console_access: true, mfa_enabled: false, mfa_type: null },
        collected_at: '2026-02-15T23:55:05Z',
      },
    ],
    opinion: {
      assessment: '1/2 console user(s) have MFA enabled.',
      context: null,
      caveats: [
        'Console users WITHOUT MFA: otvp-dev-bob',
        '1 programmatic-only user(s) excluded from console MFA scope',
      ],
      recommendations: [
        'Enable MFA for: otvp-dev-bob',
        'Consider enforcing MFA via IAM policy (aws:MultiFactorAuthPresent condition key)',
      ],
    },
    scope: {
      environment: 'test',
      services: ['IAM'],
      regions: ['global'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 7. Audit Logging
makeAgent(
  {
    agent_id: 'aws-logging-agent-v1',
    agent_version: '1.0.0',
    domain: 'detection_and_response.logging.completeness',
    display_name: 'Audit Logging',
    description: 'Verifies CloudTrail and VPC flow log coverage',
    services: ['CloudTrail', 'VPC FlowLogs'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'Audit logging is enabled with multi-region CloudTrail and VPC flow logs on all VPCs',
    result: 'NOT_SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-log-001',
        resource_type: 'AWS::CloudTrail::Trail',
        data: { trail_found: false, is_multi_region: false, log_file_validation: false },
        collected_at: '2026-02-15T23:55:06Z',
      },
      {
        evidence_id: 'ev-log-002',
        resource_arn: 'arn:aws:ec2:us-east-2:294137048789:vpc/vpc-0f4888f54d2296acb',
        resource_type: 'AWS::EC2::VPC',
        data: { vpc_name: 'unnamed', flow_logs_enabled: false },
        collected_at: '2026-02-15T23:55:06Z',
      },
    ],
    opinion: {
      assessment: 'Only 0/2 logging checks passed. Significant gaps in audit logging coverage.',
      context: null,
      caveats: [
        'No compliant CloudTrail configuration found',
        "VPC 'unnamed' (vpc-0f4888f54d2296acb) has no flow logs enabled",
      ],
      recommendations: [
        'Create a multi-region CloudTrail with log file validation enabled',
        'Enable VPC flow logs on all VPCs \u2014 send to CloudWatch Logs or S3',
      ],
    },
    scope: {
      environment: 'test',
      services: ['CloudTrail', 'VPC FlowLogs'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 8. Account Lifecycle
makeAgent(
  {
    agent_id: 'aws-lifecycle-agent-v1',
    agent_version: '1.0.0',
    domain: 'identity_and_access.lifecycle.provisioning',
    display_name: 'Account Lifecycle',
    description: 'Checks for stale IAM credentials and inactive accounts',
    services: ['IAM'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All IAM accounts are actively used with no stale credentials',
    result: 'NOT_SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-lc-001',
        resource_arn: 'arn:aws:iam::294137048789:user/otvp-dev-alice',
        resource_type: 'AWS::IAM::User',
        data: { last_login_days_ago: 0, console_access: true, status: 'stale' },
        collected_at: '2026-02-15T23:55:07Z',
      },
      {
        evidence_id: 'ev-lc-002',
        resource_arn: 'arn:aws:iam::294137048789:user/otvp-dev-bob',
        resource_type: 'AWS::IAM::User',
        data: { last_login_days_ago: 0, console_access: true, status: 'stale' },
        collected_at: '2026-02-15T23:55:07Z',
      },
      {
        evidence_id: 'ev-lc-003',
        resource_arn: 'arn:aws:iam::294137048789:user/otvp-ci-deploy',
        resource_type: 'AWS::IAM::User',
        data: { last_login_days_ago: null, console_access: false, status: 'healthy', programmatic_only: true },
        collected_at: '2026-02-15T23:55:07Z',
      },
    ],
    opinion: {
      assessment: 'Only 1/3 IAM accounts are healthy.',
      context: null,
      caveats: [
        'Stale console accounts (>90d): otvp-dev-alice (no login in 0d), otvp-dev-bob (no login in 0d)',
      ],
      recommendations: [
        'Disable or remove console access for inactive users',
      ],
    },
    scope: {
      environment: 'test',
      services: ['IAM'],
      regions: ['global'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 9. Encryption in Transit
makeAgent(
  {
    agent_id: 'aws-transit-agent-v1',
    agent_version: '1.0.0',
    domain: 'data_protection.encryption.in_transit',
    display_name: 'Encryption in Transit',
    description: 'Validates TLS enforcement on load balancers and certificate validity',
    services: ['ALB', 'NLB', 'ACM'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All load balancers enforce TLS 1.2+ and certificates are valid',
    result: 'NOT_APPLICABLE',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-tls-001',
        resource_type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
        data: { load_balancers_found: 0, certificates_found: 0, scan_complete: true },
        collected_at: '2026-02-15T23:55:08Z',
      },
    ],
    opinion: {
      assessment: 'No load balancers or certificates found. Transit encryption evaluation not applicable.',
      context: null,
      caveats: [],
      recommendations: [],
    },
    scope: {
      environment: 'test',
      services: ['ALB', 'NLB', 'ACM'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 10. Vulnerability Management
makeAgent(
  {
    agent_id: 'aws-vuln-agent-v1',
    agent_version: '1.0.0',
    domain: 'infrastructure.compute.vulnerability_management',
    display_name: 'Vulnerability Management',
    description: 'Checks for vulnerability scanning and patch management',
    services: ['SSM', 'Inspector'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'Vulnerability management is active with no unpatched critical findings',
    result: 'NOT_SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-vuln-001',
        resource_type: 'AWS::Inspector2::Inspector',
        data: { inspector_enabled: false, ssm_managed_instances: 0, scan_complete: true },
        collected_at: '2026-02-15T23:55:09Z',
      },
    ],
    opinion: {
      assessment: 'No vulnerability management infrastructure detected.',
      context: null,
      caveats: ['No vulnerability management tools detected'],
      recommendations: [
        'Enable SSM Agent on EC2 instances for patch management',
        'Activate Amazon Inspector for vulnerability scanning',
      ],
    },
    scope: {
      environment: 'test',
      services: ['SSM', 'Inspector'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);

// 11. Backup & Recovery
makeAgent(
  {
    agent_id: 'aws-backup-agent-v1',
    agent_version: '1.0.0',
    domain: 'operational_resilience.backup.coverage',
    display_name: 'Backup & Recovery',
    description: 'Verifies backup coverage for critical data stores',
    services: ['AWS Backup', 'RDS', 'EBS'],
    supported_providers: ['aws'],
  },
  {
    assertion: 'All critical data stores have backup protection configured',
    result: 'NOT_SATISFIED',
    confidence: 1.0,
    evidence_items: [
      {
        evidence_id: 'ev-bak-001',
        resource_arn: 'arn:aws:ec2:us-east-2:294137048789:volume/vol-022d3b7b946de5cde',
        resource_type: 'AWS::EC2::Volume',
        data: { backup_plan_attached: false, size_gb: 100, volume_type: 'gp3' },
        collected_at: '2026-02-15T23:55:10Z',
      },
      {
        evidence_id: 'ev-bak-002',
        resource_arn: 'arn:aws:ec2:us-east-2:294137048789:volume/vol-0f3fa7c211a79121e',
        resource_type: 'AWS::EC2::Volume',
        data: { backup_plan_attached: false, size_gb: 50, volume_type: 'gp3' },
        collected_at: '2026-02-15T23:55:10Z',
      },
    ],
    opinion: {
      assessment: 'Only 0/2 data stores have backup coverage.',
      context: null,
      caveats: [
        'No AWS Backup plans configured',
        'EBS vol-022d3b7b946de5cde: no backup configured',
        'EBS vol-0f3fa7c211a79121e: no backup configured',
      ],
      recommendations: [
        'Create an AWS Backup plan covering all critical resources',
        'Add backup coverage for: EBS:vol-022d3b7b946de5cde, EBS:vol-0f3fa7c211a79121e',
      ],
    },
    scope: {
      environment: 'test',
      services: ['AWS Backup', 'RDS', 'EBS'],
      regions: ['us-east-2'],
      accounts: [],
      exclusions: [],
    },
  }
);
