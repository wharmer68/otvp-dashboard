import type { Claim } from '../types/envelope';
import { getResultStyle } from '../theme';
import { SOC2_MAP, formatDomain, esc } from '../constants';

export function claimHTML(claim: Claim, envIdx: number, claimIdx: number): string {
  const rc = getResultStyle(claim.result);
  const soc2 = SOC2_MAP[claim.domain] || [];
  const op = claim.opinion || { assessment: '', context: null, caveats: [], recommendations: [] };
  const id = `claim-${envIdx}-${claimIdx}`;
  const isOpen = expandedClaims[id];

  let detail = '';
  if (op.assessment) {
    detail += `<div class="detail-section"><div class="detail-label mono">ASSESSMENT</div><div class="detail-text">${esc(op.assessment)}</div></div>`;
  }
  if (op.caveats?.length) {
    detail += `<div class="detail-section"><div class="detail-label mono">CAVEATS</div>${op.caveats.map(c => `<div class="caveat mono">\u26a0 ${esc(c)}</div>`).join('')}</div>`;
  }
  if (op.recommendations?.length) {
    detail += `<div class="detail-section"><div class="detail-label mono">RECOMMENDATIONS</div>${op.recommendations.map(r => `<div class="recommendation mono">\u2192 ${esc(r)}</div>`).join('')}</div>`;
  }
  detail += `<div class="detail-meta">
    <div><div class="meta-item-label mono">EVIDENCE</div><div class="meta-item-value mono">${claim.evidence_count} items</div></div>
    <div><div class="meta-item-label mono">AGENT</div><div class="meta-item-value mono">${esc(claim.agent_id)} v${esc(claim.agent_version)}</div></div>
    <div><div class="meta-item-label mono">SIGNATURE</div><div class="meta-sig mono">${(claim.signature || '').slice(0, 24)}...</div></div>
  </div>`;

  return `<div class="claim">
    <div class="claim-header" onclick="window.__toggleClaim('${id}')">
      <div class="claim-icon" style="background:${rc.bg};border:1px solid ${rc.text}33;color:${rc.text}">${rc.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="claim-badges">
          <span class="result-badge mono" style="background:${rc.bg};color:${rc.text}">${claim.result}</span>
          <span class="claim-conf mono">${Math.round(claim.confidence * 100)}%</span>
          ${soc2.map(s => `<span class="claim-soc2 mono">${s}</span>`).join('')}
        </div>
        <div class="claim-assertion">${esc(claim.assertion)}</div>
        <div class="claim-domain mono">${formatDomain(claim.domain)}</div>
      </div>
      <div class="claim-arrow ${isOpen ? 'open' : ''}">\u25be</div>
    </div>
    <div class="claim-detail ${isOpen ? 'open' : ''}"><div class="claim-detail-inner">${detail}</div></div>
  </div>`;
}

// Global state for expanded claims
const expandedClaims: Record<string, boolean> = {};

export function toggleClaim(id: string): void {
  expandedClaims[id] = !expandedClaims[id];
  // Trigger re-render
  window.dispatchEvent(new CustomEvent('otvp:rerender'));
}

// Expose toggle globally for onclick handlers
(window as any).__toggleClaim = toggleClaim;
