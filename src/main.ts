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
import { getLocalEnvelopes, setLocalEnvelopes, addLocalEnvelope } from './services/envelope-store';
import { getVendors, getLocalVendors, createVendor } from './services/vendor-store';
import { computeRiskAssessment } from './services/risk-engine';
import { logAudit } from './services/audit-log';

import { renderDashboard } from './views/dashboard';
import { renderEnvelopes } from './views/envelopes';
import { renderVendors } from './views/vendors';
import { renderAudit } from './views/audit';

// Import SDK and register mock agents
import './sdk/mock-agents';
import { createRunner, registry } from './sdk/index';

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
    // DB is empty — seed the default vendor
    try {
      const seeded = await createVendor({
        name: 'killswitch-advisory',
        otvp_id: 'otvp:org:killswitch-advisory',
        environment: 'production',
        cloud_provider: 'aws',
        region: 'us-east-2',
        config: {},
        is_active: true,
      });
      vendors = [seeded];
      await logAudit('vendor.created', { vendor_id: seeded.id, details: { name: seeded.name, seeded: true } });
    } catch (err) {
      console.warn('Failed to seed vendor, using local fallback:', err);
      vendors = getLocalVendors();
    }
  }

  if (vendors.length > 0) {
    activeVendorId = vendors[0].id;
  }

  // Load mock data on first run
  if (getLocalEnvelopes().length === 0) {
    await loadMockData();
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

async function loadMockData(): Promise<void> {
  // Run all mock agents to generate demo envelopes
  const runner = createRunner();
  let vendors: Vendor[];
  try {
    vendors = await getVendors();
  } catch {
    vendors = getLocalVendors();
  }
  const vendor = vendors[0];
  if (!vendor) return;

  const result = await runner.run({
    vendor_id: vendor.id,
    organization: vendor.name,
    otvp_id: vendor.otvp_id,
    environment: vendor.environment,
    region: vendor.region,
    credentials: {},
  });

  setLocalEnvelopes(result.envelopes);

  // Compute initial risk assessment
  const ra = computeRiskAssessment(result.envelopes, vendor.id);
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
  const vendors = await getVendors();
  renderVendors(getViewContainer(), vendors, runScan, async () => {
    const updated = await getVendors();
    renderShell(updated);
    showVendors();
  });
}

async function showAudit(): Promise<void> {
  await renderAudit(getViewContainer());
}

async function runScan(vendorId: string): Promise<void> {
  const vendors = await getVendors();
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) return;

  await logAudit('scan.started', { vendor_id: vendorId, details: { trigger: 'manual' } });

  const container = getViewContainer();
  const prevHTML = container.innerHTML;
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px">
    <div style="color:#818cf8;font-size:14px" class="mono">Running ${registry.getAll().length} agents...</div>
  </div>`;

  try {
    const runner = createRunner();
    const result = await runner.run({
      vendor_id: vendor.id,
      organization: vendor.name,
      otvp_id: vendor.otvp_id,
      environment: vendor.environment,
      region: vendor.region,
      credentials: {},
    });

    // Store envelopes
    setLocalEnvelopes(result.envelopes);

    // Log each envelope
    for (const env of result.envelopes) {
      await logAudit('envelope.stored', { vendor_id: vendorId, envelope_id: env.envelope_id });
    }

    // Compute risk
    const ra = computeRiskAssessment(result.envelopes, vendorId);
    riskHistory.push(ra);
    await logAudit('risk.computed', {
      vendor_id: vendorId,
      details: { overall_score: ra.overall_score, overall_level: ra.overall_level },
    });

    await logAudit('scan.completed', {
      vendor_id: vendorId,
      details: { envelopes: result.envelopes.length, errors: result.errors.length },
    });

    // Navigate to dashboard to show results
    activeVendorId = vendorId;
    navigate('/');
  } catch (err) {
    await logAudit('scan.failed', { vendor_id: vendorId, details: { error: String(err) } });
    container.innerHTML = prevHTML;
  }
}

// Start the app
init().catch(console.error);
