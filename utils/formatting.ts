/** Formata número como moeda BRL sem o símbolo — ex: 1234.5 → "1.234,50" */
export const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formata string de data ISO (YYYY-MM-DD) para pt-BR — ex: "2026-03-26" → "26/03/2026" */
export const fmtDate = (d?: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
