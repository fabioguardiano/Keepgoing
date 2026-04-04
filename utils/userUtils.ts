/**
 * Retorna as iniciais do nome (primeiro e último).
 * Se o nome for "João Silva", retorna "JS".
 * Se o nome for "João da Silva", retorna "JS".
 */
export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
