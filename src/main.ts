import './styles/reset.css';
import './styles/tokens.css';
import './styles/typography.css';
import './styles/layout.css';
import './styles/components.css';

import type { TrustEnvelope } from './types/envelope';
import type { RiskAssessment } from './types/risk';
import type { Vendor } from './types/vendor';

import { addRoute, startRouter, navigate } from './router';
import { appShellHTML } from './components/app-shell';
import { getLocalEnvelopes, setLocalEnvelopes } from './services/envelope-store';
import { getVendors, getLocalVendors, createVendor, updateVendor } from './services/vendor-store';
import { computeRiskAssessment } from './services/risk-engine';
import { logAudit } from './services/audit-log';
import { fetchVendorEnvelopes } from './services/discovery';

import { renderDashboard } from './views/dashboard';
import { renderEnvelopes } from './views/envelopes';
import { renderVendors } from './views/vendors';
import { renderAudit } from './views/audit';

// --- App State ---
let activeVendorId = 'local-default';
let riskHistory: RiskAssessment[] = [];

// --- Initialization ---
async function init(): Promise<void> {
  // Load vendors — seed a default if DB is empty
  let vendors: Vendor[];
  try {
    vendors = await getVendors();
  } catch (err) {
    console.warn('Failed to fetch vendors from Supabase, using local fallback:', err);
    vendors = getLocalVendors();
  }

  if (vendors.length === 0) {
    // DB is empty — seed the default demo vendor (discovered from .well-known)
    try {
      const seeded = await createVendor({
        domain: 'killswitch-advisory.com',
        name: 'Killswitch Advisory',
        otvp_id: 'otvp:org:killswitch-advisory',
        config_url: '/.well-known/otvp/otvp-config.json',
        public_key_kid: 'killswitch-2026-primary',
        public_key: 'MCowBQYDK2VwAyEAx2XpVUgWNeYfGJhV1p0k8kR2J7QzGWL4N8vJqHMbUno=',
        dns_verified: false,
        domains_covered: [
          'data_protection.encryption.at_rest',
          'data_protection.encryption.key_management',
          'data_protection.encryption.in_transit',
          'identity_and_access.authentication.mfa_enforcement',
          'identity_and_access.lifecycle.provisioning',
          'identity_and_access.authorization.least_privilege',
          'network_security.segmentation',
          'network_security.ingress_controls',
          'detection_and_response.logging.completeness',
          'infrastructure.compute.vulnerability_management',
          'operational_resilience.backup.coverage',
        ],
        refresh_interval_seconds: 3600,
        submission_method: 'discovery',
        last_fetched_at: null,
        last_envelope_at: null,
        is_active: true,
      });
      vendors = [seeded];
      await logAudit('vendor.created', { vendor_id: seeded.id, details: { domain: seeded.domain, seeded: true } });
    } catch (err) {
      console.warn('Failed to seed vendor, using local fallback:', err);
      vendors = getLocalVendors();
    }
  }

  if (vendors.length > 0) {
    activeVendorId = vendors[0].id;
  }

  // Load demo envelopes on first run by fetching from the vendor's endpoint
  if (getLocalEnvelopes().length === 0) {
    await loadInitialEnvelopes(vendors[0]);
  }

  // Render shell
  renderShell(vendors);

  // Set up routes
  addRoute('/', 'dashboard', () => showDashboard());
  addRoute('/envelopes', 'envelopes', () => showEnvelopes());
  addRoute('/vendors', 'vendors', () => showVendors());
  addRoute('/audit', 'audit', () => showAudit());

  // Listen for re-render requests (from claim toggle, etc.)
  window.addEventListener('otvp:rerender', () => {
    const hash = window.location.hash.slice(1) || '/';
    if (hash === '/') showDashboard();
    else if (hash === '/envelopes') showEnvelopes();
  });

  // Vendor selector
  (window as any).__selectVendor = (vendorId: string) => {
    activeVendorId = vendorId;
    const hash = window.location.hash.slice(1) || '/';
    if (hash === '/') showDashboard();
    else if (hash === '/envelopes') showEnvelopes();
  };

  startRouter();
}

/** Load initial envelopes from the vendor's .well-known endpoint (or mock agents as fallback) */
async function loadInitialEnvelopes(vendor?: Vendor): Promise<void> {
  if (!vendor) return;

  // Try fetching from the vendor's published endpoint
  try {
    const result = await fetchVendorEnvelopes(vendor.domain);

    if (result.envelopes.length > 0) {
      setLocalEnvelopes(result.envelopes);
      const ra = computeRiskAssessment(result.envelopes, vendor.id);
      riskHistory.push(ra);
      await logAudit('envelopes.fetched', {
        vendor_id: vendor.id,
        details: { count: result.envelopes.length, source: vendor.domain },
      });
      return;
    }
  } catch (err) {
    console.warn('Failed to fetch envelopes from vendor endpoint, falling back to mock agents:', err);
  }

  // Fallback: run mock agents locally
  const { createRunner } = await import('./sdk/index');
  await import('./sdk/mock-agents');

  const runner = createRunner();
  const agentResult = await runner.run({
    vendor_id: vendor.id,
    organization: vendor.name,
    otvp_id: vendor.otvp_id,
    environment: 'production',
    region: 'us-east-2',
    credentials: {},
  });

  setLocalEnvelopes(agentResult.envelopes);
  const ra = computeRiskAssessment(agentResult.envelopes, vendor.id);
  riskHistory.push(ra);
}

function renderShell(vendors: Vendor[]): void {
  const app = document.getElementById('app')!;
  app.innerHTML = appShellHTML(vendors, activeVendorId);
}

function getViewContainer(): HTMLElement {
  return document.getElementById('view-content')!;
}

function showDashboard(): void {
  const envelopes = getLocalEnvelopes();
  const ra = riskHistory.length > 0 ? riskHistory[riskHistory.length - 1] : null;
  renderDashboard(getViewContainer(), envelopes, ra, riskHistory, () => showDashboard());
}

function showEnvelopes(): void {
  renderEnvelopes(getViewContainer(), getLocalEnvelopes());
}

async function showVendors(): Promise<void> {
  let vendors: Vendor[];
  try {
    vendors = await getVendors();
  } catch {
    vendors = getLocalVendors();
  }
  renderVendors(getViewContainer(), vendors, fetchEnvelopesForVendor, async () => {
    let updated: Vendor[];
    try {
      updated = await getVendors();
    } catch {
      updated = getLocalVendors();
    }
    renderShell(updated);
    showVendors();
  });
}

async function showAudit(): Promise<void> {
  await renderAudit(getViewContainer());
}

/** Fetch envelopes from a vendor's published .well-known endpoint */
async function fetchEnvelopesForVendor(vendorId: string): Promise<void> {
  const vendors = await getVendors();
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) return;

  await logAudit('fetch.started', { vendor_id: vendorId, details: { domain: vendor.domain } });

  const container = getViewContainer();
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px">
    <div style="color:#818cf8;font-size:14px" class="mono">Fetching envelopes from ${vendor.domain}...</div>
  </div>`;

  try {
    const result = await fetchVendorEnvelopes(vendor.domain);

    if (result.error) {
      throw new Error(result.error);
    }

    const envelopes = result.envelopes;
    setLocalEnvelopes(envelopes);

    // Update vendor fetch timestamp
    await updateVendor(vendorId, {
      last_fetched_at: new Date().toISOString(),
      last_envelope_at: envelopes.length > 0 ? envelopes[0].generated_at : null,
    });

    // Log each envelope
    for (const env of envelopes) {
      await logAudit('envelope.received', {
        vendor_id: vendorId,
        envelope_id: env.envelope_id,
        details: { domain: vendor.domain, composite_level: env.composite_level },
      });
    }

    // Compute risk
    const ra = computeRiskAssessment(envelopes, vendorId);
    riskHistory.push(ra);
    await logAudit('risk.computed', {
      vendor_id: vendorId,
      details: { overall_score: ra.overall_score, overall_level: ra.overall_level },
    });

    await logAudit('fetch.completed', {
      vendor_id: vendorId,
      details: { envelopes: envelopes.length, domain: vendor.domain },
    });

    // Navigate to dashboard to show results
    activeVendorId = vendorId;
    navigate('/');
  } catch (err) {
    await logAudit('fetch.failed', {
      vendor_id: vendorId,
      details: { error: String(err), domain: vendor.domain },
    });
    container.innerHTML = `<div style="text-align:center;padding:60px">
      <div style="color:var(--color-red);font-size:14px;margin-bottom:8px">Failed to fetch envelopes</div>
      <div style="color:var(--text-faint);font-size:12px">${String(err)}</div>
      <button class="btn btn-secondary" style="margin-top:16px" onclick="window.location.hash='#/vendors'">Back to Vendors</button>
    </div>`;
  }
}

// Start the app
init().catch(console.error);
