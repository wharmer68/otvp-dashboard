import type { Vendor } from '../types/vendor';
import { vendorFormHTML, vendorListHTML } from '../components/vendor-form';
import { createVendor, updateVendor, getVendors } from '../services/vendor-store';
import { logAudit } from '../services/audit-log';

export function renderVendors(
  container: HTMLElement,
  vendors: Vendor[],
  onScan: (vendorId: string) => void,
  onRefresh: () => void,
): void {
  let showForm = false;
  let editVendor: Vendor | undefined;

  function render() {
    let html = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="page-title">Vendor Targets</div>
          <div class="page-subtitle">Configure organizations to scan with OTVP agents</div>
        </div>
        <button class="btn btn-primary" onclick="window.__showVendorForm()">+ Add Vendor</button>
      </div>
    `;

    if (showForm) {
      html += vendorFormHTML(editVendor);
    }

    html += vendorListHTML(vendors.map(v => ({ vendor: v })));

    container.innerHTML = html;
  }

  (window as any).__showVendorForm = () => {
    showForm = true;
    editVendor = undefined;
    render();
  };

  (window as any).__cancelVendorForm = () => {
    showForm = false;
    editVendor = undefined;
    render();
  };

  (window as any).__editVendor = async (id: string) => {
    editVendor = vendors.find(v => v.id === id);
    showForm = true;
    render();
  };

  (window as any).__saveVendor = async () => {
    const name = (document.getElementById('vf-name') as HTMLInputElement).value;
    const otvp_id = (document.getElementById('vf-otvp-id') as HTMLInputElement).value;
    const cloud_provider = (document.getElementById('vf-provider') as HTMLSelectElement).value;
    const region = (document.getElementById('vf-region') as HTMLInputElement).value;
    const environment = (document.getElementById('vf-env') as HTMLSelectElement).value;
    const existingId = (document.getElementById('vf-id') as HTMLInputElement)?.value;

    if (existingId) {
      await updateVendor(existingId, { name, otvp_id, cloud_provider, region, environment });
      await logAudit('vendor.updated', { vendor_id: existingId, details: { name } });
    } else {
      const v = await createVendor({ name, otvp_id, cloud_provider, region, environment, config: {}, is_active: true });
      await logAudit('vendor.created', { vendor_id: v.id, details: { name, otvp_id } });
    }

    showForm = false;
    editVendor = undefined;
    onRefresh();
  };

  (window as any).__runScan = (vendorId: string) => {
    onScan(vendorId);
  };

  render();
}
