import React, { useState, useMemo, useRef } from 'react';
import { Users, Shield, HardHat, Plus, X, Mail, Edit2, Trash2, ChevronDown, Search, PowerOff, ArrowUpDown, Loader2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';

type SortField = 'name' | 'email' | 'createdAt' | 'position' | 'hourlyRate';
type SortDirection = 'asc' | 'desc';
import { AppUser, ProductionStaff, StaffPosition, PermissionProfile } from '../types';
import { getInitials } from '../utils/userUtils';

const POSITION_LABELS: Record<StaffPosition, string> = {
  serrador: 'Serrador',
  acabador: 'Acabador',
  ajudante_serrador: 'Ajudante de Serrador',
  ajudante_acabador: 'Ajudante de Acabador',
  motorista: 'Motorista',
  medidor: 'Medidor',
  instalador: 'Instalador',
  vendedor: 'Vendedor',
  gerente: 'Gerente',
};

const ROLE_LABELS: Record<AppUser['role'], string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  viewer: 'Observador',
  driver: 'Motorista/Entregador',
};

const ROLE_COLORS: Record<AppUser['role'], string> = {
  admin: 'bg-primary/10 text-primary border border-primary/20',
  manager: 'bg-primary/10 text-primary border border-primary/20',
  seller: 'bg-primary/10 text-primary border border-primary/20',
  viewer: 'bg-primary/10 text-primary border border-primary/20',
  driver: 'bg-primary/10 text-primary border border-primary/20',
};

const AVATAR_COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-pink-500', 'bg-teal-500'];
const avatarColor = (id: string) => AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length] || 'bg-slate-500';
const initials = (name: string) => getInitials(name);
const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// ─── Modal: Add/Edit App User ─────────────────────────────────────────────────

interface UserFormProps {
  initial?: Partial<AppUser>;
  profiles: PermissionProfile[];
  existingEmails: string[];
  onSave: (u: AppUser, password?: string) => Promise<string | undefined>;
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ initial, profiles, existingEmails, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<AppUser['role']>(initial?.role ?? 'seller');
  const [profileId, setProfileId] = useState(initial?.profileId ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initial?.avatarUrl);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      setAvatarUrl(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(file);
  };

  const isEditing = !!initial?.id;

  const emailChanged = isEditing && email !== (initial?.email ?? '').toLowerCase();

  // Validação de email duplicado (exclui o próprio email ao editar)
  const emailDuplicate = existingEmails
    .filter(e => !isEditing || e !== (initial?.email ?? '').toLowerCase())
    .includes(email.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailDuplicate) return;
    setLoading(true);
    const COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (password && !COMPLEXITY_RE.test(password)) {
      setError('A senha deve ter no mínimo 8 caracteres e incluir pelo menos uma letra maiúscula, uma minúscula e um número.');
      setLoading(false);
      return;
    }

    const err = await onSave({
      id: initial?.id || String(Date.now()),
      code: initial?.code,
      name, email, role,
      profileId: profileId || undefined,
      company_id: initial?.company_id,
      status: initial?.status || 'ativo',
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
      avatarUrl: avatarUrl || undefined,
    }, password);

    setLoading(false);

    if (err) {
      setError(err);
    } else if (!isEditing) {
      setSuccess(true);
      setTimeout(onClose, 4000);
    } else {
      setSuccess(true);
      setTimeout(onClose, 1500);
    }
  };

  const inputClass = "management-input w-full px-4 py-3 disabled:opacity-50";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4" onClick={!loading ? onClose : undefined}>
      <form className="management-modal rounded-[32px] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <p className="management-subtitle text-sm">Acesso ao sistema</p>
          </div>
          <button type="button" onClick={!loading ? onClose : undefined} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>

        {/* Tela de sucesso */}
        {success ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 mb-1">
                {isEditing ? 'Usuário atualizado!' : 'Usuário criado!'}
              </p>
              <p className="text-sm text-slate-500">
                {isEditing
                  ? emailChanged
                    ? <>As alterações de <span className="font-bold text-slate-700">{name}</span> foram salvas. O novo email de login é <span className="font-bold text-slate-700">{email}</span>.</>
                    : <>As alterações de <span className="font-bold text-slate-700">{name}</span> foram salvas com sucesso.</>
                  : <>Um email de confirmação foi enviado para <span className="font-bold text-slate-700">{email}</span>. O usuário precisará clicar no link para ativar o acesso.</>
                }
              </p>
            </div>
            <button type="button" onClick={onClose} className="mt-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all">
              Fechar
            </button>
          </div>
        ) : (
          <div className="p-8 space-y-4">
            {/* Erro */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="relative group">
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden bg-primary flex items-center justify-center cursor-pointer border-4 border-white shadow-lg"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-2xl">{initials(name || 'U')}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                >
                  <Camera size={13} />
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatarUrl(undefined);
                      if (avatarInputRef.current) avatarInputRef.current.value = '';
                    }}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                    title="Remover foto"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                <span className="font-bold text-slate-500">JPG, PNG ou WEBP</span> · máx. 5 MB<br />
                Recomendado: quadrado · mín. 200×200 px
              </p>
            </div>

            {isEditing && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código</span>
                <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-lg">#{initial?.code || '—'}</span>
              </div>
            )}

            <div>
              <label className={labelClass}>Nome Completo</label>
              <input required disabled={loading} value={name} onChange={e => setName(e.target.value.toUpperCase())} className={inputClass} placeholder="Ex: JOÃO SILVA" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                required
                type="email"
                disabled={loading}
                value={email}
                onChange={e => { setEmail(e.target.value.toLowerCase()); setError(null); }}
                className={`${inputClass} ${emailDuplicate ? 'border-red-400 focus:border-red-400' : ''}`}
                placeholder="joao@empresa.com"
              />
              {emailDuplicate && (
                <p className="mt-1.5 ml-1 text-xs font-bold text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> Este email já está cadastrado.
                </p>
              )}
              {isEditing && emailChanged && !emailDuplicate && (
                <p className="mt-1.5 ml-1 text-xs font-bold text-amber-600 flex items-center gap-1">
                  <AlertCircle size={12} /> O email de login no sistema será atualizado.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>{isEditing ? 'Redefinir Senha (apenas se for trocar)' : 'Senha inicial'}</label>
              <input
                required={!isEditing}
                type="password"
                disabled={loading}
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder={isEditing ? 'Deixe em branco para manter a atual' : 'Mínimo 8 caracteres, com Maiúscula e Número'}
              />
              {!isEditing ? (
                <p className="mt-1.5 ml-1 text-xs text-slate-400 flex items-center gap-1">
                  Mínimo 8 caracteres, incluindo uma letra maiúscula e um número.
                </p>
              ) : (
                <p className="mt-1.5 ml-1 text-xs text-slate-400 flex items-center gap-1">
                  Se preenchido, deve ter 8+ caracteres, maiúscula e número.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Perfil de Acesso</label>
              <div className="relative">
                <select
                  disabled={loading}
                  value={profileId}
                  onChange={e => {
                    const pid = e.target.value;
                    setProfileId(pid);
                    const profile = profiles.find(p => p.id === pid);
                    if (profile?.id.startsWith('profile-')) {
                      const r = pid.replace('profile-', '') as AppUser['role'];
                      if (['admin', 'manager', 'seller', 'driver', 'viewer'].includes(r)) setRole(r);
                    } else if (profile?.name.toLowerCase().includes('medidor') || profile?.name.toLowerCase().includes('entregador')) {
                      setRole('driver');
                    } else if (profile?.name.toLowerCase().includes('vendedor')) {
                      setRole('seller');
                    } else if (profile?.name.toLowerCase().includes('gerente')) {
                      setRole('manager');
                    }
                  }}
                  className={`${inputClass} appearance-none`}
                  required
                >
                  <option value="">Selecione um perfil...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
            <div className="pt-2 flex gap-3">
              <button type="button" onClick={!loading ? onClose : undefined} disabled={loading} className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={loading || emailDuplicate} className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> {isEditing ? 'Salvando...' : 'Criando...'}</> : isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

// ─── Modal: Add/Edit Production Staff ────────────────────────────────────────

interface StaffFormProps {
  initial?: Partial<ProductionStaff>;
  onSave: (s: ProductionStaff) => void;
  onClose: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [position, setPosition] = useState<StaffPosition>(initial?.position ?? 'serrador');
  const [hourlyRate, setHourlyRate] = useState(String(initial?.hourlyRate ?? ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || String(Date.now()),
      code: initial?.code,
      name, position,
      hourlyRate: parseFloat(hourlyRate) || 0,
      phone: initial?.phone || '',
      status: initial?.status || 'ativo',
    });
    onClose();
  };

  const inputClass = "management-input w-full px-4 py-3";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4" onClick={onClose}>
      <form className="management-modal rounded-[32px] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{initial?.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
            <p className="management-subtitle text-sm">Equipe de produção</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>
        <div className="p-8 space-y-4">
          
          {initial?.id && initial?.code && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código</span>
              <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-lg">#{initial.code}</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value.toUpperCase())} className={inputClass} placeholder="Ex: JOÃO FERREIRA" />
          </div>
          <div>
            <label className={labelClass}>Função</label>
            <div className="relative">
              <select value={position} onChange={e => setPosition(e.target.value as StaffPosition)} className={`${inputClass} appearance-none`}>
                {Object.entries(POSITION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Valor Hora (R$)</label>
            <input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className={inputClass} placeholder="Ex: 18.50" />
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 px-6 py-3 bg-primary hover:bg-secondary text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
              {initial?.id ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ─── Main TeamView ────────────────────────────────────────────────────────────

type Tab = 'usuarios' | 'producao';

interface TeamViewProps {
  appUsers: AppUser[];
  onSaveUser: (u: AppUser, password?: string) => Promise<string | undefined>;
  onDeleteUser: (id: string) => void;
  staff: ProductionStaff[];
  onSaveStaff: (s: ProductionStaff) => void;
  onDeleteStaff: (id: string) => void;
  permissionProfiles: PermissionProfile[];
}

export const TeamView: React.FC<TeamViewProps> = ({ appUsers, onSaveUser, onDeleteUser, staff, onSaveStaff, onDeleteStaff, permissionProfiles }) => {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [editingStaff, setEditingStaff] = useState<ProductionStaff | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return <ArrowUpDown size={14} className="text-primary" />;
  };

  const filteredUsers = useMemo(() => appUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : (u.status || 'ativo') === 'ativo';
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    if (sortField === 'email') cmp = a.email.localeCompare(b.email);
    if (sortField === 'createdAt') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
    return sortDirection === 'asc' ? cmp : -cmp;
  }), [appUsers, searchTerm, showInactive, sortField, sortDirection]);

  const filteredStaff = useMemo(() => staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      POSITION_LABELS[s.position].toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : (s.status || 'ativo') === 'ativo';
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    if (sortField === 'position') cmp = POSITION_LABELS[a.position].localeCompare(POSITION_LABELS[b.position]);
    if (sortField === 'hourlyRate') cmp = a.hourlyRate - b.hourlyRate;
    return sortDirection === 'asc' ? cmp : -cmp;
  }), [staff, searchTerm, showInactive, sortField, sortDirection]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="management-title">Gestão de Equipe</h1>
          <p className="management-subtitle">Usuários do sistema e colaboradores de produção</p>
        </div>
        <button
          onClick={() => tab === 'usuarios' ? setShowUserForm(true) : setShowStaffForm(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} />
          {tab === 'usuarios' ? 'Novo Usuário' : 'Novo Colaborador'}
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="management-header-card flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou função..."
            className="management-input w-full pl-12 pr-4 py-3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            <Users size={16} />
            {tab === 'usuarios' 
              ? appUsers.filter(u => !u.status || u.status === 'ativo').length 
              : staff.filter(s => !s.status || s.status === 'ativo').length} Ativos
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            <PowerOff size={14} />
            {tab === 'usuarios' 
              ? appUsers.filter(u => u.status === 'inativo').length 
              : staff.filter(s => s.status === 'inativo').length} Inativos
          </div>
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${showInactive ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 text-amber-600' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'}`}
          >
            <PowerOff size={14} />
            {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${tab === 'usuarios' ? 'bg-primary text-white shadow-lg shadow-primary/20 border-primary' : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300'}`}
        >
          <Shield size={14} />
          Usuários do App
        </button>
        <button
          onClick={() => setTab('producao')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${tab === 'producao' ? 'bg-primary text-white shadow-lg shadow-primary/20 border-primary' : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300'}`}
        >
          <HardHat size={14} />
          Equipe de Produção
        </button>
      </div>

      {/* Table */}
      <div className="management-container">
        <div className="overflow-x-auto">
          {tab === 'usuarios' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <th className="px-6 py-5"><div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cód</div></th>
                  <th onClick={() => handleSort('name')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Nome <SortIcon field="name" /></div>
                  </th>
                  <th onClick={() => handleSort('email')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Email <SortIcon field="email" /></div>
                  </th>
                  <th className="px-6 py-5"><div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Perfil</div></th>
                  <th onClick={() => handleSort('createdAt')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Desde <SortIcon field="createdAt" /></div>
                  </th>
                  <th className="px-6 py-5 text-right"><div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {filteredUsers.map((user, index) => (
                  <tr key={user.id} className="management-row-hover group">
                    <td className="px-6 py-6">
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        #{user.code || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                          {user.avatarUrl
                            ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            : initials(user.name)
                          }
                        </div>
                        <div className="text-sm font-black text-slate-800 dark:text-white leading-tight">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <Mail size={14} className="text-slate-300" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${ROLE_COLORS[user.role]}`}>
                        {permissionProfiles.find(p => p.id === user.profileId)?.name || ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-sm font-bold text-slate-600">{formatDateBR(user.createdAt)}</div>
                      <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${user.status === 'ativo' ? 'text-green-500' : 'text-slate-400'}`}>
                        {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingUser(user); setShowUserForm(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (user.status === 'inativo') {
                              onSaveUser({ ...user, status: 'ativo' });
                            } else {
                              onDeleteUser(user.id);
                            }
                          }}
                          className={`p-2 rounded-xl transition-all border border-transparent ${
                            user.status === 'inativo' 
                              ? 'text-green-500 hover:bg-green-50 hover:border-green-100' 
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                          }`}
                          title={user.status === 'inativo' ? 'Reativar' : 'Inativar'}
                        >
                          <PowerOff size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-30">
                        <Search size={48} className="mb-2" />
                        <p className="font-bold text-slate-400">Nenhum usuário encontrado</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <th className="px-6 py-5"><div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cód</div></th>
                  <th onClick={() => handleSort('name')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Colaborador <SortIcon field="name" /></div>
                  </th>
                  <th onClick={() => handleSort('position')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Função <SortIcon field="position" /></div>
                  </th>
                  <th onClick={() => handleSort('hourlyRate')} className="px-6 py-5 cursor-pointer group hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Valor/Hora <SortIcon field="hourlyRate" /></div>
                  </th>
                  <th className="px-6 py-5"><div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Status</div></th>
                  <th className="px-6 py-5 text-right"><div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {filteredStaff.map((s, index) => (
                  <tr key={s.id} className="management-row-hover group">
                    <td className="px-6 py-6">
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        #{s.code || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {initials(s.name)}
                        </div>
                        <div className="text-sm font-black text-slate-800 dark:text-white leading-tight">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-xs font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
                        {POSITION_LABELS[s.position]}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {s.hourlyRate > 0 ? `R$ ${s.hourlyRate.toFixed(2)}/h` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${s.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingStaff(s); setShowStaffForm(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (s.status === 'inativo') {
                              onSaveStaff({ ...s, status: 'ativo' });
                            } else {
                              onDeleteStaff(s.id);
                            }
                          }}
                          className={`p-2 rounded-xl transition-all border border-transparent ${
                            s.status === 'inativo' 
                              ? 'text-green-500 hover:bg-green-50 hover:border-green-100' 
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                          }`}
                          title={s.status === 'inativo' ? 'Reativar' : 'Inativar'}
                        >
                          <PowerOff size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-30">
                        <Search size={48} className="mb-2" />
                        <p className="font-bold text-slate-400">Nenhum colaborador encontrado</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUserForm && <UserForm initial={editingUser} profiles={permissionProfiles} existingEmails={appUsers.filter(u => u.id !== editingUser?.id).map(u => u.email.toLowerCase())} onSave={onSaveUser} onClose={() => { setShowUserForm(false); setEditingUser(undefined); }} />}
      {showStaffForm && <StaffForm initial={editingStaff} onSave={onSaveStaff} onClose={() => { setShowStaffForm(false); setEditingStaff(undefined); }} />}
    </div>
  );
};
