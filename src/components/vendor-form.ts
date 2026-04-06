import type { Vendor, DiscoveryResult } from '../types/vendor';
import { esc } from '../constants';

export function vendorDiscoverFormHTML(): string {
  return `<div class="vendor-form">
    <div style="color:#71717a;font-size:10px;letter-spacing:2px;margin-bottom:16px" class="mono">
      ADD VENDOR
    </div>
    <div style="color:#a1a1aa;font-size:13px;line-height:1.6;margin-bottom:16px">
      Enter the vendor's domain. The dashboard will discover their OTVP configuration at
      <span class="mono" style="color:#818cf8">.well-known/otvp/otvp-config.json</span>
      and verify their public key.
    </div>
    <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px">
      <div class="form-group" style="flex:1">
        <label class="form-label mono">VENDOR DOMAIN</label>
        <input class="form-input" id="vf-domain" placeholder="e.g. acme-corp.com" required
          style="font-size:15px;padding:12px" />
      </div>
      <button type="button" class="btn btn-primary" onclick="window.__discoverVendor()"
        style="height:46px;white-space:nowrap" id="discover-btn">
        Discover
      </button>
      <button type="button" class="btn btn-secondary" onclick="window.__cancelVendorForm()"
        style="height:46px">Cancel</button>
    </div>
    <div id="discovery-result"></div>
  </div>`;
}

export function discoveryResultHTML(result: DiscoveryResult): string {
  if (!result.success) {
    return `<div style="padding:16px;background:var(--color-red-dark);border:1px solid var(--color-red-border);border-radius:var(--radius-lg)">
      <div style="color:var(--color-red);font-size:13px;font-weight:600;margin-bottom:4px">Discovery Failed</div>
      <div style="color:#a1a1aa;font-size:12px">${esc(result.error || 'Unknown error')}</div>
      <div style="color:#52525b;font-size:11px;margin-top:8px" class="mono">
        Ensure the vendor publishes OTVP config at:<br/>
        https://${esc(result.domain)}/.well-known/otvp/otvp-config.json
      </div>
    </div>`;
  }

  const config = result.config!;
  const activeKey = config.public_keys.find(k => !k.revoked) || config.public_keys[0];

  return `<div style="padding:20px;background:var(--bg-card-inner);border:1px solid var(--border-secondary);border-radius:var(--radius-lg)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="color:var(--color-green);font-size:16px">\u2713</span>
      <span style="color:var(--color-green);font-size:13px;font-weight:600">OTVP Configuration Found</span>
    </div>

    <div style="display:grid;grid-template-columns:120px 1fr;gap:8px 16px;font-size:12px;margin-bottom:16px">
      <div style="color:var(--text-dim)" class="mono">ORGANIZATION</div>
      <div style="color:var(--text-secondary)">${esc(config.organization)}</div>

      <div style="color:var(--text-dim)" class="mono">OTVP ID</div>
      <div style="color:var(--accent-indigo-light)" class="mono">${esc(config.otvp_id)}</div>

      <div style="color:var(--text-dim)" class="mono">PUBLIC KEY</div>
      <div style="color:var(--text-muted)" class="mono" style="font-size:11px">${esc(activeKey.kid)} (${activeKey.algorithm})</div>

      <div style="color:var(--text-dim)" class="mono">KEY FINGERPRINT</div>
      <div style="color:var(--accent-indigo);font-size:10px;word-break:break-all" class="mono">${esc(activeKey.public_key.slice(0, 32))}...</div>

      <div style="color:var(--text-dim)" class="mono">DNS VERIFIED</div>
      <div>
        ${result.dns_verified
          ? `<span style="color:var(--color-green)" class="mono">\u2713 TXT record matches</span>`
          : `<span style="color:var(--color-yellow)" class="mono">\u26a0 Not verified (check _otvp.${esc(result.domain)} TXT record)</span>`
        }
      </div>

      <div style="color:var(--text-dim)" class="mono">DOMAINS</div>
      <div style="color:var(--text-muted)">${config.domains_covered.length} security controls covered</div>

      <div style="color:var(--text-dim)" class="mono">REFRESH</div>
      <div style="color:var(--text-muted)">Every ${Math.round(config.refresh_interval_seconds / 60)} minutes</div>

      <div style="color:var(--text-dim)" class="mono">RETENTION</div>
      <div style="color:var(--text-muted)">${config.retention_days} days</div>

      ${config.contact_email ? `
        <div style="color:var(--text-dim)" class="mono">CONTACT</div>
        <div style="color:var(--text-muted)">${esc(config.contact_email)}</div>
      ` : ''}
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
      ${config.domains_covered.map(d => {
        const label = d.split('.').pop()?.replace(/_/g, ' ') || d;
        return `<span class="soc2-badge mono" style="font-size:10px">${esc(label)}</span>`;
      }).join('')}
    </div>

    <div style="display:flex;gap:12px">
      <button class="btn btn-primary" onclick="window.__confirmAddVendor()">Add Vendor</button>
      <button class="btn btn-secondary" onclick="window.__cancelVendorForm()">Cancel</button>
    </div>
  </div>`;
}

export function vendorListHTML(vendors: Vendor[]): string {
  if (!vendors.length) {
    return `<div class="empty-state">
      <div class="empty-state-icon">\u2302</div>
      <div class="empty-state-text">No vendors configured</div>
      <div class="empty-state-hint">Discover a vendor by entering their domain</div>
    </div>`;
  }

  return `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-xl);overflow:hidden">
    <table class="vendor-table">
      <thead>
        <tr>
          <th class="mono">VENDOR</th>
          <th class="mono">DOMAIN</th>
          <th class="mono">PUBLIC KEY</th>
          <th class="mono">CONTROLS</th>
          <th class="mono">VERIFIED</th>
          <th class="mono">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        ${vendors.map(v => `<tr>
          <td>
            <div style="color:var(--text-secondary);font-weight:500">${esc(v.name)}</div>
            <div class="mono" style="font-size:10px;color:var(--text-faint)">${esc(v.otvp_id)}</div>
          </td>
          <td class="mono" style="font-size:11px">${esc(v.domain)}</td>
          <td>
            <div class="mono" style="font-size:10px;color:var(--accent-indigo-light)">${esc(v.public_key_kid)}</div>
          </td>
          <td class="mono" style="font-size:12px">${v.domains_covered.length}</td>
          <td>
            ${v.dns_verified
              ? `<span class="audit-badge status-active mono">\u2713 DNS</span>`
              : `<span class="audit-badge mono" style="background:#1a1a08;color:#fbbf24">\u26a0 PENDING</span>`
            }
          </td>
          <td>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm scan-btn" onclick="window.__fetchEnvelopes('${v.id}')"
                style="padding:6px 14px;font-size:12px">\u21bb Fetch</button>
              <button class="btn btn-secondary btn-sm" onclick="window.__removeVendor('${v.id}')">Remove</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}
