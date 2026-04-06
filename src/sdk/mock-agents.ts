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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
    evidence_items: [],
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
