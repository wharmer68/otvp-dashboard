export const SOC2_MAP: Record<string, string[]> = {
  'data_protection.encryption.at_rest': ['CC6.1', 'CC6.7'],
  'data_protection.encryption.key_management': ['CC6.1', 'CC6.7'],
  'data_protection.encryption.in_transit': ['CC6.1', 'CC6.7'],
  'identity_and_access.authentication.mfa_enforcement': ['CC6.1'],
  'identity_and_access.lifecycle.provisioning': ['CC6.2', 'CC6.5'],
  'identity_and_access.authorization.least_privilege': ['CC6.3'],
  'network_security.segmentation': ['CC6.1', 'CC6.6'],
  'network_security.ingress_controls': ['CC6.6'],
  'detection_and_response.logging.completeness': ['CC7.1', 'CC7.2'],
  'infrastructure.compute.vulnerability_management': ['CC7.1'],
  'operational_resilience.backup.coverage': ['CC7.5', 'CC9.1'],
};

export const DOMAIN_LABELS: Record<string, string> = {
  'data_protection.encryption.at_rest': 'Encryption at Rest',
  'data_protection.encryption.key_management': 'KMS Key Management',
  'data_protection.encryption.in_transit': 'Encryption in Transit',
  'identity_and_access.authentication.mfa_enforcement': 'IAM MFA Enforcement',
  'identity_and_access.lifecycle.provisioning': 'Account Lifecycle',
  'identity_and_access.authorization.least_privilege': 'Least Privilege',
  'network_security.segmentation': 'Network Segmentation',
  'network_security.ingress_controls': 'Ingress Controls',
  'detection_and_response.logging.completeness': 'Audit Logging',
  'detection_and_response.monitoring.alerting_coverage': 'Monitoring & Alerting',
  'infrastructure.compute.vulnerability_management': 'Vulnerability Management',
  'operational_resilience.backup.coverage': 'Backup & Recovery',
};

export const DOMAIN_DESC: Record<string, string> = {
  'data_protection.encryption.at_rest': 'Verifies that all storage resources (RDS databases, S3 buckets, EBS volumes) are encrypted at rest using AWS KMS or AES-256. Unencrypted data stores are a critical finding in any SOC 2 audit \u2014 an attacker with disk access can read data in plaintext.',
  'data_protection.encryption.key_management': 'Audits KMS key configuration: are customer-managed keys (CMKs) using automatic rotation? Are AWS-managed keys properly scoped? Key management controls how encryption keys are created, rotated, and retired \u2014 weak key management undermines encryption even when it\u2019s enabled.',
  'data_protection.encryption.in_transit': 'Checks that load balancers enforce TLS 1.2 or higher and that SSL/TLS certificates are valid and not expiring. Data moving between services or to end users must be encrypted to prevent interception.',
  'identity_and_access.authentication.mfa_enforcement': 'Scans all IAM users with AWS console access and verifies multi-factor authentication is enabled. Programmatic-only users (API keys, no console) are noted but excluded from the MFA requirement. A single console user without MFA is a finding every auditor flags.',
  'identity_and_access.lifecycle.provisioning': 'Identifies stale IAM accounts (no login in 90+ days) and unused access keys (inactive 90+ days). Orphaned credentials are one of the most common initial access vectors \u2014 accounts that should have been deprovisioned but weren\u2019t.',
  'identity_and_access.authorization.least_privilege': 'Analyzes IAM users and roles for overprivileged access. Flags AdministratorAccess, IAMFullAccess, or PowerUserAccess attached directly. Also identifies inline policies on users, which bypass centralized policy management and reduce visibility.',
  'network_security.segmentation': 'Evaluates security group rules for proper network isolation. Flags high-risk ports (SSH, RDP, database ports) exposed to 0.0.0.0/0. Web ports (80, 443) open to the internet are acceptable for public-facing services; everything else should be restricted to specific CIDR ranges.',
  'network_security.ingress_controls': 'Assesses the overall public attack surface: which security groups allow inbound internet traffic on non-web ports, and whether internet-facing load balancers have WAF (Web Application Firewall) protection. Minimal public exposure reduces the blast radius of any perimeter breach.',
  'detection_and_response.logging.completeness': 'Verifies that CloudTrail is configured for multi-region logging with log file validation enabled, and that all VPCs have flow logs active. Without comprehensive audit logging, you cannot detect, investigate, or respond to security incidents \u2014 it\u2019s the foundation of CC7.',
  'infrastructure.compute.vulnerability_management': 'Checks whether vulnerability management infrastructure is active: SSM Agent on EC2 instances for patch compliance, and Amazon Inspector for continuous vulnerability scanning. Without these, you have no visibility into unpatched CVEs or misconfigured systems.',
  'operational_resilience.backup.coverage': 'Verifies that AWS Backup plans exist and that critical data stores (RDS, EBS) have backup protection configured with recent snapshots. Without tested backups, a ransomware event or accidental deletion becomes a business-ending event instead of a recoverable incident.',
};

export const SOC2_NAMES: Record<string, string> = {
  'CC6.1': 'Logical Access Security \u2014 restricts access through authentication, encryption, and segmentation',
  'CC6.2': 'User Account Lifecycle \u2014 secure creation, management, and deletion of accounts',
  'CC6.3': 'Authorization & Least Privilege \u2014 access based on roles and responsibilities',
  'CC6.5': 'Asset Decommissioning \u2014 timely removal of access when no longer needed',
  'CC6.6': 'External Threat Detection \u2014 physical and logical controls against external threats',
  'CC6.7': 'Data Movement Security \u2014 protects transmission and movement of data',
  'CC7.1': 'Vulnerability Detection \u2014 monitoring for changes that introduce vulnerabilities',
  'CC7.2': 'Anomaly Detection \u2014 monitoring for anomalies indicating security events',
  'CC7.5': 'Incident Recovery \u2014 measures to recover from security incidents',
  'CC8.1': 'Change Authorization \u2014 changes are authorized, tested, and documented',
  'CC9.1': 'Business Continuity \u2014 risk mitigation for business disruptions',
  'CC9.2': 'Vendor Risk \u2014 risk mitigation for third-party threats',
};

export function formatDomain(d: string): string {
  return d.split('.')
    .map(p => p.replace(/_/g, ' '))
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' \u2192 ');
}

export function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
