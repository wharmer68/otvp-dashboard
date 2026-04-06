export interface StatDef {
  label: string;
  value: string | number;
  color: string;
  small?: boolean;
}

export function statCardsHTML(stats: StatDef[]): string {
  return `<div class="stats-grid">
    ${stats.map(s => `<div class="stat-card">
      <div class="stat-label mono">${s.label}</div>
      <div class="stat-value${s.small ? ' small' : ''} mono" style="color:${s.color}">${s.value}</div>
    </div>`).join('')}
  </div>`;
}
