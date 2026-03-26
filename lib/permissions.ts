import { AppUser, AccessLevel, ModuleKey, PermissionProfile, View } from '../types';

// ─── Mapeamento: View → Módulo ─────────────────────────────────────────────

export const VIEW_MODULE_MAP: Partial<Record<View, ModuleKey>> = {
  'Produção': 'producao',
  'O.S. de Produção': 'producao',
  'Agenda de Entregas': 'agenda_entregas',
  'Equipe': 'equipe',
  'Relatórios': 'relatorios',
  'Configurações': 'configuracoes',
  'Clientes': 'clientes',
  'Vendas': 'vendas',
  'Matéria Prima': 'estoque',
  'Acabamentos': 'estoque',
  'Produtos Revenda': 'estoque',
  'Mão de obra (Instalação)': 'estoque',
  'Serviços': 'estoque',
  'Marcas': 'cadastros',
  'Grupos de Produtos': 'cadastros',
  'Grupos de Serviços': 'cadastros',
  'Financeiro': 'financeiro',
  'Contas a Receber': 'financeiro',
  'Contas a Pagar': 'financeiro',
  'Formas de Pagamento': 'financeiro',
  'Tipos de Pagamento': 'financeiro',
  'Fornecedores': 'cadastros',
  'Arquitetos': 'cadastros',
  'Canais de Vendas': 'cadastros',
};

// ─── Rótulos dos módulos ───────────────────────────────────────────────────

export const MODULE_LABELS: Record<ModuleKey, string> = {
  producao: 'Produção / O.S.',
  vendas: 'Vendas',
  agenda_entregas: 'Agenda de Entregas',
  agenda_medicao: 'Agenda de Medição',
  financeiro: 'Financeiro',
  clientes: 'Clientes',
  estoque: 'Estoque / Acabamentos',
  equipe: 'Equipe',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  cadastros: 'Cadastros (Fornec., Arq., Canais)',
};

export const ALL_MODULES: ModuleKey[] = [
  'vendas', 'producao', 'agenda_entregas', 'clientes',
  'financeiro', 'estoque', 'cadastros', 'equipe', 'relatorios', 'configuracoes',
];

// ─── Perfis padrão ─────────────────────────────────────────────────────────

const full = (modules: ModuleKey[]): Record<ModuleKey, AccessLevel> =>
  ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: modules.includes(m) ? 'full' : 'none' }), {} as Record<ModuleKey, AccessLevel>);

const mixed = (map: Partial<Record<ModuleKey, AccessLevel>>): Record<ModuleKey, AccessLevel> =>
  ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: map[m] ?? 'none' }), {} as Record<ModuleKey, AccessLevel>);

export const DEFAULT_PROFILES: PermissionProfile[] = [
  {
    id: 'profile-admin',
    name: 'Administrador',
    isDefault: true,
    permissions: full(ALL_MODULES),
  },
  {
    id: 'profile-vendedor',
    name: 'Vendedor',
    isDefault: true,
    permissions: mixed({
      vendas: 'full',
      clientes: 'full',
      producao: 'view',
      agenda_entregas: 'view',
      estoque: 'view',
      cadastros: 'view',
    }),
  },
  {
    id: 'profile-medidor',
    name: 'Medidor',
    isDefault: true,
    permissions: mixed({
      agenda_entregas: 'full',
      vendas: 'view',
      clientes: 'view',
    }),
  },
  {
    id: 'profile-projetista',
    name: 'Projetista',
    isDefault: true,
    permissions: mixed({
      producao: 'full',
      vendas: 'view',
      clientes: 'view',
      estoque: 'view',
    }),
  },
  {
    id: 'profile-motorista',
    name: 'Motorista / Entregador',
    isDefault: true,
    permissions: mixed({
      agenda_entregas: 'full',
    }),
  },
];

// ─── Helper principal ──────────────────────────────────────────────────────

/**
 * Retorna o nível de acesso de um usuário logado a um módulo específico.
 * - role 'admin' sempre recebe 'full' (bypass total)
 * - Busca o AppUser pelo id/email, lê seu profileId e retorna o nível do perfil
 * - Se não encontrar perfil, cai no padrão por role
 */
export const getModuleAccess = (
  user: { id: string; email?: string; role: string },
  appUsers: AppUser[],
  profiles: PermissionProfile[],
  module: ModuleKey,
): AccessLevel => {
  // Admin do sistema sempre tem acesso total
  if (user.role === 'admin') return 'full';

  // Busca o usuário na lista de AppUsers
  const appUser = appUsers.find(u => u.id === user.id || u.email === user.email);

  if (appUser?.profileId) {
    const profile = profiles.find(p => p.id === appUser.profileId);
    if (profile) return profile.permissions[module] ?? 'none';
  }

  // Fallback por role
  return ROLE_FALLBACK[user.role as AppUser['role']]?.[module] ?? 'none';
};

// Fallback para usuários sem perfil atribuído
const ROLE_FALLBACK: Record<AppUser['role'], Record<ModuleKey, AccessLevel>> = {
  admin: full(ALL_MODULES),
  manager: full(ALL_MODULES),
  seller: mixed({ vendas: 'full', clientes: 'full', producao: 'view', agenda_entregas: 'view', estoque: 'view', cadastros: 'view' }),
  viewer: mixed({ vendas: 'view', producao: 'view', clientes: 'view' }),
  driver: mixed({ agenda_entregas: 'full' }),
};
