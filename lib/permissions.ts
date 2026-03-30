import { AppUser, AccessLevel, ModuleKey, SubModuleKey, PermissionProfile, View } from '../types';

// ─── Mapeamento: View → Módulo ─────────────────────────────────────────────

export const VIEW_MODULE_MAP: Partial<Record<View, ModuleKey>> = {
  'Produção': 'producao',
  'O.S. de Produção': 'producao',
  'Agenda de Entregas': 'agenda_entregas',
  'Agenda de Medição': 'agenda_medicao',
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

// ─── Mapeamento: View → SubMódulo ──────────────────────────────────────────

export const VIEW_SUBMODULE_MAP: Partial<Record<View, SubModuleKey>> = {
  'Fornecedores': 'fornecedores',
  'Arquitetos': 'arquitetos',
  'Canais de Vendas': 'canais_vendas',
  'Marcas': 'marcas',
  'Grupos de Produtos': 'grupos_produtos',
  'Grupos de Serviços': 'grupos_servicos',
  'Contas a Receber': 'contas_receber',
  'Contas a Pagar': 'contas_pagar',
  'Formas de Pagamento': 'formas_pagamento',
  'Matéria Prima': 'materia_prima',
  'Acabamentos': 'acabamentos',
  'Produtos Revenda': 'produtos_revenda',
  'O.S. de Produção': 'os_producao',
};

// ─── Sub-módulos por módulo pai ─────────────────────────────────────────────

export const MODULE_SUBMODULES: Partial<Record<ModuleKey, SubModuleKey[]>> = {
  cadastros: ['fornecedores', 'arquitetos', 'canais_vendas', 'marcas', 'grupos_produtos', 'grupos_servicos'],
  financeiro: ['contas_receber', 'contas_pagar', 'formas_pagamento'],
  estoque:    ['materia_prima', 'acabamentos', 'produtos_revenda'],
  producao:   ['os_producao'],
};

export const SUBMODULE_LABELS: Record<SubModuleKey, string> = {
  fornecedores:    'Fornecedores',
  arquitetos:      'Arquitetos',
  canais_vendas:   'Canais de Vendas',
  marcas:          'Marcas',
  grupos_produtos: 'Grupos de Produtos',
  grupos_servicos: 'Grupos de Serviços',
  contas_receber:  'Contas a Receber',
  contas_pagar:    'Contas a Pagar',
  formas_pagamento:'Formas de Pagamento',
  materia_prima:   'Matéria Prima',
  acabamentos:     'Acabamentos',
  produtos_revenda:'Produtos de Revenda',
  os_producao:     'O.S. de Produção',
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
  cadastros: 'Cadastros',
};

export const ALL_MODULES: ModuleKey[] = [
  'vendas', 'producao', 'agenda_entregas', 'agenda_medicao', 'clientes',
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
    name: 'ADMINISTRADOR',
    isDefault: true,
    permissions: full(ALL_MODULES),
  },
  {
    id: 'profile-vendedor',
    name: 'VENDEDOR',
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
    name: 'MEDIDOR',
    isDefault: true,
    permissions: mixed({
      agenda_medicao: 'full',
      agenda_entregas: 'full',
      vendas: 'view',
      clientes: 'view',
    }),
  },
  {
    id: 'profile-projetista',
    name: 'PROJETISTA',
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
    name: 'MOTORISTA / ENTREGADOR',
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
 * - Respeita subPermissions quando existe entrada para o submódulo
 */
export const getModuleAccess = (
  user: { id: string; email?: string; role: string },
  appUsers: AppUser[],
  profiles: PermissionProfile[],
  module: ModuleKey,
  subModule?: SubModuleKey,
): AccessLevel => {
  if (user.role === 'admin') return 'full';

  const appUser = appUsers.find(u => u.id === user.id || u.email === user.email);

  if (appUser?.profileId) {
    const profile = profiles.find(p => p.id === appUser.profileId);
    if (profile) {
      // Se há sub-permissão definida para esse submódulo, ela prevalece
      if (subModule && profile.subPermissions && subModule in profile.subPermissions) {
        return profile.subPermissions[subModule] ?? profile.permissions[module] ?? 'none';
      }
      return profile.permissions[module] ?? 'none';
    }
  }

  return ROLE_FALLBACK[user.role as AppUser['role']]?.[module] ?? 'none';
};

// Fallback para usuários sem perfil atribuído
const ROLE_FALLBACK: Record<AppUser['role'], Record<ModuleKey, AccessLevel>> = {
  admin: full(ALL_MODULES),
  manager: full(ALL_MODULES),
  seller: mixed({ vendas: 'full', clientes: 'full', producao: 'view', agenda_entregas: 'view', agenda_medicao: 'view', estoque: 'view', cadastros: 'view' }),
  viewer: mixed({ vendas: 'view', producao: 'view', clientes: 'view', agenda_entregas: 'view', agenda_medicao: 'view' }),
  driver: mixed({ agenda_entregas: 'full' }),
};
