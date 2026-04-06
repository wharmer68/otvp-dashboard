import type { AuditEntry } from '../services/audit-log';

const EVENT_COLORS: Record<string, string> = {
  'scan.started': '#818cf8',
  'scan.completed': '#4ade80',
  'scan.failed': '#f87171',
  'envelope.stored': '#34d399',
  'envelope.uploaded': '#fbbf24',
  'vendor.created': '#818cf8',
  'vendor.updated': '#fbbf24',
  'vendor.deleted': '#f87171',
  'risk.computed': '#34d399',
};

export function auditTableHTML(entries: AuditEntry[]): string {
  if (!entries.length) {
    return `<div class="empty-state">
      <div class="empty-state-icon">\u2637</div>
      <div class="empty-state-text">No audit events yet</div>
      <div class="empty-state-hint">Actions like scans and vendor changes will appear here</div>
    </div>`;
  }

  return `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-xl);overflow:hidden">
    <table class="audit-table">
      <thead>
        <tr>
          <th class="mono">TIMESTAMP</th>
          <th class="mono">EVENT</th>
          <th class="mono">ACTOR</th>
          <th class="mono">DETAILS</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(e => {
          const color = EVENT_COLORS[e.event_type] || '#a1a1aa';
          const time = new Date(e.created_at).toLocaleString();
          const details = Object.entries(e.details || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ') || '\u2014';
          return `<tr>
            <td class="mono" style="font-size:11px;white-space:nowrap">${time}</td>
            <td><span class="audit-badge mono" style="background:${color}15;color:${color}">${e.event_type}</span></td>
            <td class="mono" style="font-size:11px">${e.actor}</td>
            <td style="font-size:11px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${details}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}
