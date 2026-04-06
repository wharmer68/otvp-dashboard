import type { TrustEnvelope } from '../types/envelope';
import { envelopeCardHTML } from '../components/envelope-card';
import { getLevelColor } from '../theme';

export function renderEnvelopes(container: HTMLElement, envelopes: TrustEnvelope[]): void {
  let filterLevel = '';

  function render() {
    const filtered = filterLevel
      ? envelopes.filter(e => e.composite_level === filterLevel)
      : envelopes;

    const levels = ['VERIFIED', 'HIGH', 'MEDIUM', 'LOW', 'CRITICAL'];
    const levelCounts = levels.map(l => ({
      level: l,
      count: envelopes.filter(e => e.composite_level === l).length,
    }));

    let html = `
      <div class="page-header">
        <div class="page-title">Trust Envelopes</div>
        <div class="page-subtitle">${envelopes.length} envelopes across all domains</div>
      </div>

      <div class="filter-bar">
        <button class="btn btn-sm ${!filterLevel ? 'btn-primary' : 'btn-secondary'}" onclick="window.__filterEnvelopes('')">All (${envelopes.length})</button>
        ${levelCounts.filter(lc => lc.count > 0).map(lc => {
          const c = getLevelColor(lc.level);
          const isActive = filterLevel === lc.level;
          return `<button class="btn btn-sm" onclick="window.__filterEnvelopes('${lc.level}')"
            style="background:${isActive ? c.bg : 'transparent'};border:1px solid ${isActive ? c.border : '#27272a'};color:${isActive ? c.text : '#71717a'}">${lc.level} (${lc.count})</button>`;
        }).join('')}
      </div>
    `;

    if (!filtered.length) {
      html += `<div class="empty-state">
        <div class="empty-state-icon">\u2750</div>
        <div class="empty-state-text">No envelopes found</div>
        <div class="empty-state-hint">Run a scan to generate trust envelopes</div>
      </div>`;
    } else {
      html += filtered.map((e, i) => envelopeCardHTML(e, i)).join('');
    }

    container.innerHTML = html;
  }

  (window as any).__filterEnvelopes = (level: string) => {
    filterLevel = level;
    render();
  };

  render();
}
