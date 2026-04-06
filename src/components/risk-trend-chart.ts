import type { RiskAssessment } from '../types/risk';
import { getLevelColor } from '../theme';

export function riskTrendHTML(assessments: RiskAssessment[]): string {
  if (assessments.length < 2) {
    return `<div class="risk-trend-card">
      <div class="risk-trend-label mono">RISK TREND</div>
      <div style="color:#52525b;font-size:13px;text-align:center;padding:20px">
        Run multiple scans to see risk trends over time
      </div>
    </div>`;
  }

  const width = 600;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = assessments.slice().reverse().map((a, i) => {
    const x = padding.left + (i / (assessments.length - 1)) * chartW;
    const y = padding.top + chartH - (a.overall_score / 100) * chartH;
    return { x, y, score: a.overall_score, level: a.overall_level, date: a.computed_at };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];
  const c = getLevelColor(lastPoint.level);

  // Threshold lines
  const thresholds = [
    { y: padding.top + chartH - (95 / 100) * chartH, label: 'VERIFIED', color: '#10b981' },
    { y: padding.top + chartH - (75 / 100) * chartH, label: 'HIGH', color: '#22c55e' },
    { y: padding.top + chartH - (30 / 100) * chartH, label: 'LOW', color: '#f97316' },
  ];

  return `<div class="risk-trend-card">
    <div class="risk-trend-label mono">RISK TREND</div>
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${thresholds.map(t => `<line x1="${padding.left}" y1="${t.y}" x2="${width - padding.right}" y2="${t.y}" stroke="${t.color}22" stroke-width="1" stroke-dasharray="4,4"/>
        <text x="${width - padding.right - 2}" y="${t.y - 3}" text-anchor="end" fill="${t.color}44" class="mono" style="font-size:8px">${t.label}</text>`).join('')}
      <polyline points="${polyline}" fill="none" stroke="${c.border}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${getLevelColor(p.level).border}"/>`).join('')}
    </svg>
  </div>`;
}
