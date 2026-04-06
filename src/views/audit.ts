import { getAuditLog, type AuditEntry } from '../services/audit-log';
import { auditTableHTML } from '../components/audit-table';

export async function renderAudit(container: HTMLElement, vendorId?: string): Promise<void> {
  container.innerHTML = `<div style="color:#52525b;padding:40px;text-align:center">Loading audit log...</div>`;

  let entries: AuditEntry[];
  try {
    entries = await getAuditLog(vendorId);
  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;padding:40px;text-align:center">Failed to load audit log</div>`;
    return;
  }

  const html = `
    <div class="page-header">
      <div class="page-title">Audit Log</div>
      <div class="page-subtitle">${entries.length} events recorded</div>
    </div>
    ${auditTableHTML(entries)}
  `;

  container.innerHTML = html;
}
