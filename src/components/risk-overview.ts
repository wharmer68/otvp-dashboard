import type { RiskAssessment } from '../types/risk';
import { getLevelColor } from '../theme';
import { gaugeHTML } from './gauge';

export function riskOverviewHTML(assessment: RiskAssessment): string {
  const c = getLevelColor(assessment.overall_level);

  const domainBars = Object.values(assessment.domain_scores)
    .sort((a, b) => b.weight - a.weight)
    .map(ds => {
      const dc = getLevelColor(ds.level);
      return `<div class="risk-domain-row">
        <div class="risk-domain-label mono">${ds.category}</div>
        <div class="risk-domain-bar">
          <div class="risk-domain-bar-fill" style="width:${ds.score}%;background:${dc.border}"></div>
        </div>
        <div class="risk-domain-score mono" style="color:${dc.text}">${Math.round(ds.score)}%</div>
      </div>`;
    })
    .join('');

  return `<div class="risk-score-card" style="border-color:${c.border}33">
    <div>
      ${gaugeHTML(assessment.overall_level, assessment.overall_score / 100)}
      <div style="text-align:center;margin-top:8px;color:#52525b;font-size:11px" class="mono">OVERALL RISK</div>
    </div>
    <div class="risk-domains">
      <div style="color:#71717a;font-size:10px;letter-spacing:2px;margin-bottom:4px" class="mono">DOMAIN BREAKDOWN</div>
      ${domainBars}
      <div style="display:flex;gap:16px;margin-top:8px;padding-top:12px;border-top:1px solid #1e1e2e">
        <div style="font-size:12px">
          <span class="mono" style="color:#4ade80;font-weight:600">${assessment.claim_summary.satisfied}</span>
          <span style="color:#52525b"> satisfied</span>
        </div>
        <div style="font-size:12px">
          <span class="mono" style="color:#fbbf24;font-weight:600">${assessment.claim_summary.partial}</span>
          <span style="color:#52525b"> partial</span>
        </div>
        <div style="font-size:12px">
          <span class="mono" style="color:#f87171;font-weight:600">${assessment.claim_summary.not_satisfied}</span>
          <span style="color:#52525b"> failing</span>
        </div>
        <div style="font-size:12px">
          <span class="mono" style="color:#71717a;font-weight:600">${assessment.claim_summary.not_applicable}</span>
          <span style="color:#52525b"> n/a</span>
        </div>
      </div>
    </div>
  </div>`;
}
