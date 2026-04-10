import React, { useState } from 'react';
import { ShieldCheck, Plus, Edit2, Trash2, ChevronLeft, ChevronDown, ChevronRight, Check, Lock } from 'lucide-react';
import { PermissionProfile, AppUser, ModuleKey, SubModuleKey, AccessLevel, VendasScope } from '../types';
import { ALL_MODULES, MODULE_LABELS, MODULE_SUBMODULES, SUBMODULE_LABELS } from '../lib/permissions';

interface Props {
  profiles: PermissionProfile[];
  appUsers: AppUser[];
  onSaveProfile: (profile: PermissionProfile) => void;
  onDeleteProfile: (id: string) => void;
  onSaveUser: (user: AppUser) => void;
}

const ACCESS_OPTIONS: { value: AccessLevel; label: string; color: string }[] = [
  { value: 'none',  label: 'Sem acesso', color: 'bg-slate-100 text-slate-400' },
  { value: 'view',  label: 'Visualizar', color: 'bg-blue-100 text-blue-700' },
  { value: 'full',  label: 'Completo',   color: 'bg-green-100 text-green-700' },
];

// ─── Editor de Perfil ─────────────────────────────────────────────────────────

interface ProfileEditorProps {
  profile: PermissionProfile;
  onSave: (p: PermissionProfile) => void;
  onBack: () => void;
}

const VENDAS_SCOPE_OPTIONS: { value: VendasScope; label: string; description: string }[] = [
  { value: 'all',              label: 'Todos',                  description: 'Vê e edita todos os orçamentos' },
  { value: 'own',              label: 'Apenas os seus',         description: 'Vê e edita só os próprios orçamentos' },
  { value: 'view_all_edit_own', label: 'Ver todos / Editar só os seus', description: 'Vê todos, mas só edita os próprios' },
];

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onBack }) => {
  const [name, setName] = useState(profile.name);
  const [perms, setPerms] = useState<Record<ModuleKey, AccessLevel>>({ ...profile.permissions });
  const [subPerms, setSubPerms] = useState<Partial<Record<SubModuleKey, AccessLevel>>>(
    profile.subPermissions ?? {}
  );
  const [vendasScope, setVendasScope] = useState<VendasScope>(profile.vendasScope ?? 'all');
  // Módulos com sub-módulos que estão expandidos
  const [expandedModules, setExpandedModules] = useState<Set<ModuleKey>>(new Set());

  const isAdminLocked = profile.id === 'profile-admin';

  const setAccess = (module: ModuleKey, level: AccessLevel) => {
    setPerms(prev => ({ ...prev, [module]: level }));
    // Quando o módulo vai para 'none', limpa todas as sub-permissões dele
    if (level === 'none') {
      const subs = MODULE_SUBMODULES[module] ?? [];
      setSubPerms(prev => {
        const next = { ...prev };
        subs.forEach(s => delete next[s]);
        return next;
      });
    }
  };

  const setSubAccess = (sub: SubModuleKey, level: AccessLevel) => {
    setSubPerms(prev => ({ ...prev, [sub]: level }));
  };

  const toggleExpand = (module: ModuleKey) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ ...profile, name: name.trim(), permissions: perms, subPermissions: subPerms, vendasScope });
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-black text-slate-800">
          {profile.isDefault && profile.id !== 'profile-admin'
            ? `Editar: ${profile.name}`
            : profile.id === 'profile-admin'
            ? 'Administrador (somente leitura)'
            : profile.name ? `Editar: ${profile.name}` : 'Novo Perfil'}
        </h3>
      </div>

      {/* Nome do perfil */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Nome do perfil</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isAdminLocked}
          placeholder="Ex: Projetista Sênior"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Matriz de permissões */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Módulos e Acessos</label>
        <div className="space-y-2">
          {ALL_MODULES.map(module => {
            const subs = MODULE_SUBMODULES[module] ?? [];
            const hasSubs = subs.length > 0;
            const isExpanded = expandedModules.has(module);
            const moduleAccess = perms[module];
            const hasModuleAccess = moduleAccess !== 'none';

            // Conta sub-permissões customizadas neste módulo
            const customSubCount = subs.filter(s => s in subPerms).length;

            return (
              <div key={module} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                {/* Linha do módulo */}
                <div className="flex items-center gap-3 p-3">
                  {/* Botão expandir sub-módulos */}
                  {hasSubs && hasModuleAccess ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(module)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                      title={isExpanded ? 'Recolher sub-módulos' : 'Personalizar sub-módulos'}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : (
                    <span className="w-6 flex-shrink-0" />
                  )}

                  <span className="flex-1 text-sm font-bold text-slate-700 leading-tight">
                    {MODULE_LABELS[module]}
                    {customSubCount > 0 && (
                      <span className="ml-2 text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {customSubCount} personalizado{customSubCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>

                  <div className="flex gap-1.5">
                    {ACCESS_OPTIONS.map(opt => {
                      const isSelected = moduleAccess === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !isAdminLocked && setAccess(module, opt.value)}
                          disabled={isAdminLocked}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-2
                            ${isSelected
                              ? `${opt.color} border-transparent shadow-sm`
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}
                            ${isAdminLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          {isSelected && <Check size={10} className="inline mr-1" />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Escopo de visibilidade — só aparece no módulo Vendas quando tem acesso */}
                {module === 'vendas' && perms['vendas'] !== 'none' && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-200/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Visibilidade dos orçamentos</p>
                    <div className="flex flex-col gap-1.5">
                      {VENDAS_SCOPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !isAdminLocked && setVendasScope(opt.value)}
                          disabled={isAdminLocked}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-all border-2
                            ${vendasScope === opt.value
                              ? 'bg-white border-[var(--primary-color)] shadow-sm'
                              : 'bg-white/60 border-transparent hover:border-slate-200'}
                            ${isAdminLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          <span className={`mt-0.5 w-3 h-3 rounded-full border-2 flex-shrink-0 ${vendasScope === opt.value ? 'border-[var(--primary-color)] bg-[var(--primary-color)]' : 'border-slate-300'}`} />
                          <span>
                            <span className="font-bold text-slate-700">{opt.label}</span>
                            <span className="text-slate-400 ml-1.5">— {opt.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-módulos expandidos */}
                {hasSubs && hasModuleAccess && isExpanded && (
                  <div className="border-t border-slate-200/60 bg-white">
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Personalizar por sub-módulo
                    </p>
                    <div className="pb-2 space-y-px">
                      {subs.map(sub => {
                        // Se não há sub-permissão definida, herda o nível do módulo pai
                        const inherited = moduleAccess;
                        const customLevel = subPerms[sub];
                        const effectiveLevel = customLevel ?? inherited;
                        const isCustomized = sub in subPerms;

                        return (
                          <div key={sub} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-2" />
                            <span className="flex-1 text-xs font-bold text-slate-600">
                              {SUBMODULE_LABELS[sub]}
                              {isCustomized && (
                                <span className="ml-1.5 text-[9px] font-black text-primary">● personalizado</span>
                              )}
                            </span>
                            <div className="flex gap-1.5 items-center">
                              {/* Botão para resetar para herança */}
                              {isCustomized && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubPerms(prev => {
                                      const next = { ...prev };
                                      delete next[sub];
                                      return next;
                                    });
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-red-500 font-bold px-2 py-0.5 rounded-lg hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                  title="Remover personalização (herdar do módulo)"
                                >
                                  herdar
                                </button>
                              )}
                              {ACCESS_OPTIONS.map(opt => {
                                const isSelected = effectiveLevel === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setSubAccess(sub, opt.value)}
                                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all border-2
                                      ${isSelected
                                        ? isCustomized
                                          ? `${opt.color} border-transparent shadow-sm ring-2 ring-primary/30`
                                          : `${opt.color} border-transparent shadow-sm opacity-60`
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                  >
                                    {isSelected && <Check size={9} className="inline mr-0.5" />}
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="px-4 pb-2.5 text-[10px] text-slate-400 italic">
                      Sub-módulos sem personalização herdam o nível do módulo acima.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isAdminLocked && (
        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-primary text-white font-black rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          Salvar perfil
        </button>
      )}
    </div>
  );
};

// ─── Componente Principal ──────────────────────────────────────────────────────

export const PermissionsTab: React.FC<Props> = ({
  profiles, appUsers, onSaveProfile, onDeleteProfile, onSaveUser,
}) => {
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null);

  if (editingProfile) {
    return (
      <ProfileEditor
        profile={editingProfile}
        onSave={p => { onSaveProfile(p); setEditingProfile(null); }}
        onBack={() => setEditingProfile(null)}
      />
    );
  }

  const handleNewProfile = () => {
    setEditingProfile({
      id: `profile-${Date.now()}`,
      name: '',
      permissions: ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: 'none' }), {} as Record<ModuleKey, AccessLevel>),
    });
  };

  return (
    <div className="space-y-8">

      {/* ── Seção 1: Perfis ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Perfis de Acesso</h3>
            <p className="text-xs text-slate-400 mt-0.5">Defina quais módulos cada perfil pode acessar</p>
          </div>
          <button
            onClick={handleNewProfile}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Novo Perfil
          </button>
        </div>

        <div className="space-y-2">
          {profiles.map(profile => {
            const assignedCount = appUsers.filter(u => u.profileId === profile.id).length;
            const subCount = Object.keys(profile.subPermissions ?? {}).length;
            return (
              <div key={profile.id} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-slate-200 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-800 truncate">{profile.name}</p>
                    {profile.isDefault && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
                        <Lock size={8} /> Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {assignedCount > 0 ? `${assignedCount} usuário(s)` : 'Nenhum usuário'}
                    {subCount > 0 && <span className="ml-2 text-primary font-bold">· {subCount} sub-módulo{subCount > 1 ? 's' : ''} personalizado{subCount > 1 ? 's' : ''}</span>}
                  </p>
                </div>

                {/* Resumo de acessos em grid de colunas fixas para alinhamento vertical */}
                <div className="flex-[3] grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-x-2 gap-y-1.5">
                  {ALL_MODULES.map(m => {
                    const access = profile.permissions[m];
                    if (access === 'none') {
                      return <div key={m} className="hidden xl:block h-6" />;
                    }
                    return (
                      <div key={m} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                        access === 'full' 
                          ? 'bg-green-50/50 border-green-100 text-green-700' 
                          : 'bg-blue-50/50 border-blue-100 text-blue-700'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          access === 'full' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-tight truncate" title={MODULE_LABELS[m]}>
                          {MODULE_LABELS[m]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingProfile(profile)}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit2 size={15} />
                  </button>
                  {!profile.isDefault && (
                    <button
                      onClick={() => onDeleteProfile(profile.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Seção 2: Atribuição de usuários ── */}
      <div>
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-1">Atribuição de Perfis</h3>
        <p className="text-xs text-slate-400 mb-4">Selecione qual perfil cada usuário deve usar</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {appUsers.filter(u => u.status === 'ativo').map(user => (
            <div key={user.id} className="flex flex-col gap-3 p-3 bg-white border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-black flex-shrink-0">
                  {user.name.trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => onSaveUser({ ...user, isSecurityRequired: !user.isSecurityRequired })}
                  title={user.isSecurityRequired ? "Proteção de Interface ATIVA" : "Proteção de Interface DESATIVADA"}
                  className={`p-2 rounded-lg transition-all border-2 flex items-center justify-center flex-shrink-0 ${
                    user.isSecurityRequired
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <ShieldCheck size={18} />
                </button>
                <select
                  value={user.profileId ?? ''}
                  onChange={e => {
                    const pid = e.target.value;
                    let nextRole = user.role;
                    const profile = profiles.find(p => p.id === pid);

                    if (pid.startsWith('profile-')) {
                      const r = pid.replace('profile-', '') as any;
                      if (['admin', 'manager', 'seller', 'driver', 'viewer'].includes(r)) {
                        nextRole = r;
                      }
                    } else if (profile?.name.toLowerCase().includes('medidor') || profile?.name.toLowerCase().includes('entregador')) {
                      nextRole = 'driver';
                    } else if (profile?.name.toLowerCase().includes('vendedor')) {
                      nextRole = 'seller';
                    } else if (profile?.name.toLowerCase().includes('gerente')) {
                      nextRole = 'manager';
                    }

                    onSaveUser({ ...user, profileId: pid || undefined, role: nextRole });
                  }}
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-700"
                >
                  <option value="">— Sem perfil padrão —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legenda ── */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 space-y-1">
        <p className="font-black text-xs uppercase tracking-widest mb-2">Legenda de acessos</p>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Sem acesso — menu e tela ocultos</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Visualizar — só leitura, sem criar/editar</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Completo — CRUD completo</span>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Use o botão <ChevronRight size={12} className="inline" /> ao lado de um módulo para personalizar o acesso por sub-módulo individualmente.
        </p>
      </div>
    </div>
  );
};
