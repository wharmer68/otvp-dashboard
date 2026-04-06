import type { Vendor, DiscoveryResult } from '../types/vendor';
import { vendorDiscoverFormHTML, discoveryResultHTML, vendorListHTML } from '../components/vendor-form';
import { createVendor, deleteVendor } from '../services/vendor-store';
import { discoverVendor } from '../services/discovery';
import { logAudit } from '../services/audit-log';

export function renderVendors(
  container: HTMLElement,
  vendors: Vendor[],
  onFetchEnvelopes: (vendorId: string) => void,
  onRefresh: () => void,
): void {
  let showForm = false;
  let lastDiscovery: DiscoveryResult | null = null;

  function render() {
    let html = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="page-title">Vendor Targets</div>
          <div class="page-subtitle">Discover vendors by domain \u2014 they publish signed envelopes, you verify and review</div>
        </div>
        <button class="btn btn-primary" onclick="window.__showVendorForm()">+ Discover Vendor</button>
      </div>
    `;

    if (showForm) {
      html += vendorDiscoverFormHTML();
    }

    html += vendorListHTML(vendors);

    container.innerHTML = html;

    // If we have a discovery result, render it into the placeholder
    if (lastDiscovery) {
      const resultEl = document.getElementById('discovery-result');
      if (resultEl) resultEl.innerHTML = discoveryResultHTML(lastDiscovery);
    }
  }

  (window as any).__showVendorForm = () => {
    showForm = true;
    lastDiscovery = null;
    render();
  };

  (window as any).__cancelVendorForm = () => {
    showForm = false;
    lastDiscovery = null;
    render();
  };

  (window as any).__discoverVendor = async () => {
    const domainInput = document.getElementById('vf-domain') as HTMLInputElement;
    const btn = document.getElementById('discover-btn') as HTMLButtonElement;
    const resultEl = document.getElementById('discovery-result');
    if (!domainInput?.value) return;

    btn.disabled = true;
    btn.textContent = 'Discovering...';
    if (resultEl) resultEl.innerHTML = `<div style="color:var(--accent-indigo-light);font-size:12px;padding:16px" class="mono">Fetching .well-known/otvp/otvp-config.json...</div>`;

    lastDiscovery = await discoverVendor(domainInput.value);

    btn.disabled = false;
    btn.textContent = 'Discover';
    if (resultEl) resultEl.innerHTML = discoveryResultHTML(lastDiscovery);
  };

  (window as any).__confirmAddVendor = async () => {
    if (!lastDiscovery?.success || !lastDiscovery.config) return;

    const config = lastDiscovery.config;
    const activeKey = config.public_keys.find(k => !k.revoked) || config.public_keys[0];

    const vendor = await createVendor({
      domain: lastDiscovery.domain,
      name: config.organization,
      otvp_id: config.otvp_id,
      config_url: `https://${lastDiscovery.domain}/.well-known/otvp/otvp-config.json`,
      public_key_kid: activeKey.kid,
      public_key: activeKey.public_key,
      dns_verified: lastDiscovery.dns_verified,
      domains_covered: config.domains_covered,
      refresh_interval_seconds: config.refresh_interval_seconds,
      submission_method: 'discovery',
      last_fetched_at: null,
      last_envelope_at: null,
      is_active: true,
    });

    await logAudit('vendor.created', {
      vendor_id: vendor.id,
      details: {
        domain: lastDiscovery.domain,
        otvp_id: config.otvp_id,
        public_key_kid: activeKey.kid,
        dns_verified: lastDiscovery.dns_verified,
      },
    });

    showForm = false;
    lastDiscovery = null;
    onRefresh();
  };

  (window as any).__fetchEnvelopes = (vendorId: string) => {
    onFetchEnvelopes(vendorId);
  };

  (window as any).__removeVendor = async (id: string) => {
    await deleteVendor(id);
    await logAudit('vendor.deleted', { vendor_id: id });
    onRefresh();
  };

  render();
}
