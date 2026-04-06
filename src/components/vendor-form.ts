import type { Vendor } from '../types/vendor';

export function vendorFormHTML(vendor?: Vendor): string {
  const isEdit = !!vendor;
  return `<div class="vendor-form">
    <div style="color:#71717a;font-size:10px;letter-spacing:2px;margin-bottom:16px" class="mono">
      ${isEdit ? 'EDIT VENDOR' : 'ADD VENDOR'}
    </div>
    <form id="vendor-form" onsubmit="event.preventDefault(); window.__saveVendor()">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label mono">NAME</label>
          <input class="form-input" id="vf-name" value="${vendor?.name || ''}" placeholder="e.g. acme-corp" required />
        </div>
        <div class="form-group">
          <label class="form-label mono">OTVP ID</label>
          <input class="form-input" id="vf-otvp-id" value="${vendor?.otvp_id || ''}" placeholder="otvp:org:acme-corp" required />
        </div>
        <div class="form-group">
          <label class="form-label mono">CLOUD PROVIDER</label>
          <select class="form-select" id="vf-provider">
            <option value="aws" ${vendor?.cloud_provider === 'aws' || !vendor ? 'selected' : ''}>AWS</option>
            <option value="azure" ${vendor?.cloud_provider === 'azure' ? 'selected' : ''}>Azure</option>
            <option value="gcp" ${vendor?.cloud_provider === 'gcp' ? 'selected' : ''}>GCP</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label mono">REGION</label>
          <input class="form-input" id="vf-region" value="${vendor?.region || ''}" placeholder="e.g. us-east-2" />
        </div>
        <div class="form-group">
          <label class="form-label mono">ENVIRONMENT</label>
          <select class="form-select" id="vf-env">
            <option value="production" ${vendor?.environment === 'production' || !vendor ? 'selected' : ''}>Production</option>
            <option value="staging" ${vendor?.environment === 'staging' ? 'selected' : ''}>Staging</option>
            <option value="test" ${vendor?.environment === 'test' ? 'selected' : ''}>Test</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Vendor' : 'Add Vendor'}</button>
        <button type="button" class="btn btn-secondary" onclick="window.__cancelVendorForm()">Cancel</button>
      </div>
      ${isEdit ? `<input type="hidden" id="vf-id" value="${vendor?.id}" />` : ''}
    </form>
  </div>`;
}

export function vendorListHTML(vendors: { vendor: any; lastScan?: string; riskLevel?: string }[]): string {
  if (!vendors.length) {
    return `<div class="empty-state">
      <div class="empty-state-icon">\u2302</div>
      <div class="empty-state-text">No vendors configured</div>
      <div class="empty-state-hint">Add a vendor target to start scanning</div>
    </div>`;
  }

  return `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-xl);overflow:hidden">
    <table class="vendor-table">
      <thead>
        <tr>
          <th class="mono">NAME</th>
          <th class="mono">OTVP ID</th>
          <th class="mono">PROVIDER</th>
          <th class="mono">ENVIRONMENT</th>
          <th class="mono">STATUS</th>
          <th class="mono">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        ${vendors.map(({ vendor: v }) => `<tr>
          <td style="color:var(--text-secondary);font-weight:500">${v.name}</td>
          <td class="mono" style="font-size:11px">${v.otvp_id}</td>
          <td class="mono" style="text-transform:uppercase;font-size:11px">${v.cloud_provider}</td>
          <td class="mono" style="font-size:11px">${v.environment}</td>
          <td><span class="audit-badge ${v.is_active ? 'status-active' : 'status-inactive'} mono">${v.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
          <td>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" onclick="window.__editVendor('${v.id}')">Edit</button>
              <button class="btn btn-sm scan-btn" onclick="window.__runScan('${v.id}')" style="padding:6px 14px;font-size:12px">\u25b6 Scan</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}
