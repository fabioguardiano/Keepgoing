/**
 * Converte string para maiúsculo de forma segura.
 * Retorna null/undefined intactos, strings vazias intactas.
 * Use em payloads de save antes de enviar ao Supabase.
 */
export const up = (v?: string | null): string | null => {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed !== '' ? trimmed.toUpperCase() : null;
};
