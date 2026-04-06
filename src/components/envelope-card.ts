import type { TrustEnvelope } from '../types/envelope';
import { getLevelColor, getResultStyle } from '../theme';
import { DOMAIN_LABELS, DOMAIN_DESC, SOC2_MAP, SOC2_NAMES, formatDomain, esc } from '../constants';
import { gaugeHTML } from './gauge';
import { claimHTML } from './claim-row';

function getTitle(env: TrustEnvelope): string {
  return (env.claims || []).map(c => DOMAIN_LABELS[c.domain] || formatDomain(c.domain)).join(', ') || 'Unknown';
}

function getDesc(env: TrustEnvelope): string {
  const domains = (env.claims || []).map(c => c.domain);
  return domains.map(d => DOMAIN_DESC[d] || '').filter(Boolean).join(' ') || '';
}

function getSoc2(env: TrustEnvelope): string[] {
  return [...new Set((env.claims || []).flatMap(c => SOC2_MAP[c.domain] || []))].sort();
}

function getFindingsHTML(env: TrustEnvelope, colors: { bg: string; border: string; text: string }): string {
  const claims = env.claims || [];
  if (!claims.length) return '';
  const cl = claims[0];
  const op = cl.opinion || { assessment: '', context: null, caveats: [], recommendations: [] };
  const rc = getResultStyle(cl.result);
  const pct = Math.round(cl.confidence * 100);

  let confExplain = '';
  if (cl.result === 'SATISFIED') {
    confExplain = `The agent scanned 100% of resources in scope and all passed. ${pct}% confidence means ${pct === 100 ? 'complete verification of the entire population \u2014 not a sample.' : 'the agent verified every resource it could access.'}`;
  } else if (cl.result === 'PARTIAL') {
    confExplain = `${pct}% of scanned resources are compliant. This is a direct measurement, not an estimate \u2014 the agent verified every resource, and ${100 - pct}% failed. The non-compliant resources are listed below by name.`;
  } else if (cl.result === 'NOT_SATISFIED') {
    confExplain = `The agent has ${pct}% confidence that this control is failing. ${pct >= 90 ? 'This is a definitive finding based on complete evidence \u2014 not ambiguous.' : 'The evidence strongly indicates this control is not operating effectively.'}`;
  } else if (cl.result === 'NOT_APPLICABLE') {
    confExplain = `This control does not apply to the current environment (e.g., no load balancers exist to check TLS on). The ${pct}% reflects confidence that the control genuinely doesn't apply, not that something was missed.`;
  } else {
    confExplain = `The agent could not collect sufficient evidence to evaluate this control. This typically means the required AWS services are not enabled or accessible.`;
  }

  let html = `<div class="findings-section">`;
  html += `<div class="findings-label mono">FINDINGS</div>`;
  html += `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">`;
  html += `<div style="width:24px;height:24px;border-radius:4px;background:${rc.bg};border:1px solid ${rc.text}33;display:flex;align-items:center;justify-content:center;color:${rc.text};font-size:13px;flex-shrink:0;margin-top:1px">${rc.icon}</div>`;
  html += `<div style="color:#e4e4e7;font-size:13px;line-height:1.6">${esc(op.assessment || 'No assessment available.')}</div>`;
  html += `</div>`;

  html += `<div class="confidence-box">`;
  html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="color:${colors.text};font-size:18px;font-weight:700" class="mono">${pct}%</span><span style="color:#52525b;font-size:10px;letter-spacing:1px" class="mono">CONFIDENCE</span></div>`;
  html += `<div style="color:#a1a1aa;font-size:12px;line-height:1.5">${confExplain}</div>`;
  html += `</div>`;

  if (op.caveats?.length) {
    op.caveats.forEach(cav => {
      html += `<div class="caveat mono">\u26a0 ${esc(cav)}</div>`;
    });
  }
  if (op.recommendations?.length) {
    html += `<div style="margin-top:8px">`;
    op.recommendations.forEach(rec => {
      html += `<div class="recommendation mono">\u2192 ${esc(rec)}</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

export function envelopeCardHTML(env: TrustEnvelope, idx: number): string {
  const c = getLevelColor(env.composite_level);
  const es = env.evidence_summary || { total_items: 0, merkle_root: null };
  const claims = env.claims || [];
  const sat = claims.filter(x => x.result === 'SATISFIED').length;
  const par = claims.filter(x => x.result === 'PARTIAL').length;
  const fail = claims.filter(x => x.result === 'NOT_SATISFIED').length;
  const avg = claims.length ? claims.reduce((s, x) => s + x.confidence, 0) / claims.length : 0;
  const soc2 = getSoc2(env);

  return `<div class="envelope" style="border:1px solid ${c.border}22;box-shadow:0 0 20px ${c.border}10">
    <div class="envelope-header" style="background:linear-gradient(135deg,${c.bg},#0a0a0f)">
      <div>
        <div class="envelope-badges">
          <span class="envelope-label mono">TRUST ENVELOPE</span>
          ${soc2.map(s => `<span class="soc2-badge mono">${s}</span>`).join('')}
        </div>
        <div class="envelope-title">${getTitle(env)}</div>
        <div class="envelope-meta mono">${env.subject?.organization} \u00b7 ${env.envelope_id} \u00b7 ${new Date(env.generated_at).toLocaleString()}</div>
      </div>
      ${gaugeHTML(env.composite_level, avg)}
    </div>
    <div style="padding:16px 28px;border-bottom:1px solid #1e1e2e;background:#08080d">
      <div style="color:#d4d4d8;font-size:13px;line-height:1.6;margin-bottom:${soc2.length ? '12' : '0'}px">${getDesc(env)}</div>
      ${soc2.length ? `<div style="display:flex;flex-direction:column;gap:4px">${soc2.map(s => `<div style="display:flex;align-items:baseline;gap:8px"><span class="mono" style="color:#818cf8;font-size:11px;font-weight:600;min-width:48px">${s}</span><span style="color:#71717a;font-size:12px">${SOC2_NAMES[s] || ''}</span></div>`).join('')}</div>` : ''}
    </div>
    <div class="metrics">
      ${[
        { l: 'EVIDENCE', v: es.total_items || 0, c: '' },
        { l: 'CLAIMS', v: claims.length, c: '' },
        { l: 'SATISFIED', v: sat, c: '#4ade80' },
        { l: 'PARTIAL', v: par, c: '#fbbf24' },
        { l: 'FAILED', v: fail, c: '#f87171' },
      ].map(m => `<div class="metric"><div class="metric-label mono">${m.l}</div><div class="metric-value mono" style="color:${m.c || '#e4e4e7'}">${m.v}</div></div>`).join('')}
    </div>
    ${getFindingsHTML(env, c)}
    ${es.merkle_root ? `<div class="merkle-bar"><span class="merkle-icon">\u26d3</span><span class="merkle-label mono">MERKLE ROOT</span><span class="merkle-hash mono">${es.merkle_root}</span></div>` : ''}
    <div class="claims-section">
      <div class="claims-label mono">CLAIMS</div>
      ${claims.map((cl, ci) => claimHTML(cl, idx, ci)).join('')}
    </div>
  </div>`;
}
