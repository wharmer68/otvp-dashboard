import type { Vendor } from '../types/vendor';

export function appShellHTML(vendors: Vendor[], activeVendorId: string): string {
  return `<div class="app-shell">
    <aside class="app-sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">\u25c8</div>
        <div class="sidebar-logo-text">OTVP Dashboard</div>
      </div>

      ${vendors.length > 0 ? `
        <div class="sidebar-section-label mono">VENDOR</div>
        <div class="sidebar-vendor-select">
          <select id="vendor-select" onchange="window.__selectVendor(this.value)">
            ${vendors.map(v => `<option value="${v.id}" ${v.id === activeVendorId ? 'selected' : ''}>${v.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      <div class="sidebar-section-label mono">NAVIGATION</div>
      <nav class="sidebar-nav">
        <a class="nav-link" href="#/" data-route="/">
          <span class="nav-icon">\u25a3</span> Dashboard
        </a>
        <a class="nav-link" href="#/envelopes" data-route="/envelopes">
          <span class="nav-icon">\u2750</span> Envelopes
        </a>
        <a class="nav-link" href="#/vendors" data-route="/vendors">
          <span class="nav-icon">\u2302</span> Vendors
        </a>
        <a class="nav-link" href="#/audit" data-route="/audit">
          <span class="nav-icon">\u2637</span> Audit Log
        </a>
      </nav>

      <div style="flex:1"></div>
      <div style="padding:16px 20px;border-top:1px solid #1e1e2e;margin-top:auto">
        <div style="color:#27272a;font-size:10px" class="mono">OTVP v2.0</div>
      </div>
    </aside>
    <main class="app-content" id="view-content"></main>
  </div>`;
}
