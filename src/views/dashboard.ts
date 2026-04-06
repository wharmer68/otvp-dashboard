import type { TrustEnvelope } from '../types/envelope';
import type { RiskAssessment } from '../types/risk';
import { SOC2_MAP } from '../constants';
import { statCardsHTML } from '../components/stat-card';
import { envelopeCardHTML } from '../components/envelope-card';
import { riskOverviewHTML } from '../components/risk-overview';
import { riskTrendHTML } from '../components/risk-trend-chart';
import { uploadZoneHTML, initUploadZone } from '../components/upload-zone';

export function renderDashboard(
  container: HTMLElement,
  envelopes: TrustEnvelope[],
  riskAssessment: RiskAssessment | null,
  riskHistory: RiskAssessment[],
  onRerender: () => void,
): void {
  const totalEv = envelopes.reduce((s, e) => s + (e.evidence_summary?.total_items || 0), 0);
  const allClaims = envelopes.flatMap(e => e.claims || []);
  const satCount = allClaims.filter(c => c.result === 'SATISFIED').length;
  const critCount = envelopes.filter(e => e.composite_level === 'CRITICAL').length;
  const allSoc2 = [...new Set(allClaims.flatMap(c => SOC2_MAP[c.domain] || []))].sort();

  let html = `
    <div class="page-header">
      <div class="page-title">Risk Dashboard</div>
      <div class="page-subtitle">Real-time security posture from live infrastructure</div>
    </div>
  `;

  // Risk overview
  if (riskAssessment) {
    html += riskOverviewHTML(riskAssessment);
  }

  // Risk trend
  if (riskHistory.length > 0) {
    html += riskTrendHTML(riskHistory);
  }

  // Stats
  html += statCardsHTML([
    { label: 'ENVELOPES', value: envelopes.length, color: '#818cf8' },
    { label: 'TOTAL EVIDENCE', value: totalEv, color: '#818cf8' },
    { label: 'CLAIMS EVALUATED', value: allClaims.length, color: '#818cf8' },
    { label: 'SATISFIED', value: satCount, color: '#4ade80' },
    { label: 'CRITICAL FINDINGS', value: critCount, color: critCount > 0 ? '#f87171' : '#4ade80' },
    { label: 'SOC 2 CRITERIA', value: allSoc2.join(', ') || '\u2014', color: '#818cf8', small: true },
  ]);

  // Upload zone
  html += uploadZoneHTML();

  // Envelope cards
  html += envelopes.map((e, i) => envelopeCardHTML(e, i)).join('');

  // Footer
  html += `<div class="footer"><div class="footer-text mono">OTVP v2.0 \u00b7 github.com/wharmer68/otvp</div></div>`;

  container.innerHTML = html;

  // Init upload zone after DOM is rendered
  initUploadZone(onRerender);
}
