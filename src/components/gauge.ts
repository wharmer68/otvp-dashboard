import { getLevelColor } from '../theme';

export function gaugeHTML(level: string, confidence: number): string {
  const c = getLevelColor(level);
  const pct = Math.round(confidence * 100);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (confidence * circ);

  return `<div class="gauge">
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r="${r}" fill="none" stroke="#1e1e2e" stroke-width="8"/>
      <circle cx="65" cy="65" r="${r}" fill="none" stroke="${c.border}" stroke-width="8"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
        transform="rotate(-90 65 65)" style="transition:stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)"/>
      <text x="65" y="58" text-anchor="middle" fill="${c.text}" class="mono" style="font-size:28px;font-weight:700">${pct}%</text>
      <text x="65" y="80" text-anchor="middle" fill="#71717a" class="mono" style="font-size:11px;letter-spacing:1.5px">CONFIDENCE</text>
    </svg>
    <div class="gauge-label mono" style="background:${c.bg};border:1px solid ${c.border};color:${c.text}">${level}</div>
  </div>`;
}

export function miniGaugeHTML(level: string, confidence: number, size = 64): string {
  const c = getLevelColor(level);
  const pct = Math.round(confidence * 100);
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (confidence * circ);
  const cx = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#1e1e2e" stroke-width="4"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${c.border}" stroke-width="4"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cx})"/>
    <text x="${cx}" y="${cx + 4}" text-anchor="middle" fill="${c.text}" class="mono" style="font-size:${size > 50 ? 14 : 11}px;font-weight:700">${pct}%</text>
  </svg>`;
}
