import React, { useState, useEffect } from 'react';
import { Users, Shield, HardHat, Plus, X, Mail, Phone, Edit2, Trash2, ChevronDown, Send } from 'lucide-react';
import { AppUser, ProductionStaff, StaffPosition } from '../types';
import { supabase } from '../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POSITION_LABELS: Record<StaffPosition, string> = {
  serrador: 'Serrador',
  acabador: 'Acabador',
  ajudante_serrador: 'Ajudante de Serrador',
  ajudante_acabador: 'Ajudante de Acabador',
  motorista: 'Motorista',
  medidor: 'Medidor',
  instalador: 'Instalador',
  vendedor: 'Vendedor',
  gerente: 'Gerente'
};

const ROLE_LABELS: Record<AppUser['role'], string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  driver: 'Motorista/Entregador',
  viewer: 'Visualizador',
  medidor: 'Medidor'
};

const getRoleLabel = (user: AppUser) => {
  if (user.isMaster) return 'Administrador Master';
  return ROLE_LABELS[user.role];
};

const ROLE_COLORS: Record<AppUser['role'], string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  seller: 'bg-green-100 text-green-700',
  driver: 'bg-orange-100 text-orange-700',
  viewer: 'bg-slate-100 text-slate-700',
  medidor: 'bg-purple-100 text-purple-700'
};

const AVATAR_COLORS = [
  'bg-primary', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-pink-500', 'bg-teal-500'
];
const avatarColor = (id: string) => AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length] || 'bg-slate-500';

const initials = (name?: string) => {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

// ─── Modal: Invite New User ───────────────────────────────────────────────────

interface InviteFormProps {
  onSave: (email: string, name: string, role: string, skipEmail: boolean) => void;
  onClose: () => void;
}

const InviteForm: React.FC<InviteFormProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppUser['role']>('seller');
  const [skipEmail, setSkipEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(email, name, role, skipEmail);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Cadastrar Novo Usuário</h2>
          <button type="button" onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <p className="text-sm text-slate-500 font-normal">
          O usuário receberá um e-mail para confirmar o acesso e cadastrar sua senha.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="joao@empresa.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil de Acesso</label>
            <div className="relative mt-1">
              <select value={role} onChange={e => setRole(e.target.value as AppUser['role'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="seller">Vendedor</option>
                <option value="driver">Motorista/Entregador</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="skipEmail"
              checked={skipEmail}
              onChange={e => setSkipEmail(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
            />
            <label htmlFor="skipEmail" className="text-sm text-slate-600 font-medium cursor-pointer">
              Somente cadastrar (não enviar convite por e-mail)
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-secondary transition-colors flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send size={16} />}
            Cadastrar Usuário
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Modal: Edit User ─────────────────────────────────────────────────────────

interface EditUserFormProps {
  user: AppUser;
  onSave: (u: AppUser) => void;
  onClose: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user: initialUser, onSave, onClose }) => {
  const [name, setName] = useState(initialUser.name);
  const [role, setRole] = useState<AppUser['role']>(initialUser.role);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...initialUser, name, role, avatarUrl });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Editar Usuário</h2>
          <button type="button" onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full ${avatarColor(initialUser.id)} flex items-center justify-center text-white text-2xl font-bold uppercase`}>
                  {initials(name || initialUser.name)}
                </div>
              )}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <Plus size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            {avatarUrl && (
              <button 
                type="button" 
                onClick={() => setAvatarUrl('')}
                className="text-[10px] font-bold text-red-500 uppercase hover:underline"
              >
                Remover Foto
              </button>
            )}
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Clique no círculo para alterar a foto</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <input disabled value={initialUser.email}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil de Acesso</label>
            <div className="relative mt-1">
              <select value={role} onChange={e => setRole(e.target.value as AppUser['role'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="seller">Vendedor</option>
                <option value="driver">Motorista/Entregador</option>
                <option value="viewer">Visualizador</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
            {initialUser.isMaster && (
              <p className="mt-2 text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                <Shield size={10} /> Este é o Administrador Master (Protegido)
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-secondary transition-colors flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Edit2 size={16} />}
            Salvar Alterações
          </button>
        </div>
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
  const [phone, setPhone] = useState(initial?.phone ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || String(Date.now()),
      name,
      position,
      hourlyRate: parseFloat(hourlyRate) || 0,
      phone,
      status: initial?.status || 'ativo',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{initial?.id ? 'Editar Colaborador' : 'Novo Colaborador de Produção'}</h2>
          <button type="button" onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: João Ferreira" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Função</label>
              <div className="relative mt-1">
                <select value={position} onChange={e => setPosition(e.target.value as StaffPosition)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {Object.entries(POSITION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Hora (R$)</label>
              <input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ex: 18.50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Telefone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-secondary transition-colors">
            {initial?.id ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Main TeamView ────────────────────────────────────────────────────────────

type Tab = 'usuarios' | 'convites' | 'producao';

interface Invite {
  email: string;
  name: string;
  role: AppUser['role'];
  created_at: string;
}

interface TeamViewProps {
  appUsers: AppUser[];
  onSaveUser: (u: AppUser) => void;
  onDeleteUser: (id: string) => void;
  staff: ProductionStaff[];
  onSaveStaff: (s: ProductionStaff) => void;
  onDeleteStaff: (id: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  appUsers,
  onSaveUser,
  onDeleteUser,
  staff,
  onSaveStaff,
  onDeleteStaff
}) => {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showExportUserForm, setShowExportUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [editingStaff, setEditingStaff] = useState<ProductionStaff | undefined>();
  
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    setLoadingInvites(true);
    const { data, error } = await supabase.from('user_invites').select('*');
    if (!error && data) setInvites(data);
    setLoadingInvites(false);
  };

  const handleSendInvite = async (email: string, name: string, role: string, skipEmail: boolean) => {
    const { error } = await supabase.from('user_invites').insert([{ 
      email, 
      name, 
      role,
      skip_email: skipEmail
    }]);
    if (error) {
      alert('Erro ao enviar convite: ' + error.message);
      throw error;
    }
    fetchInvites();
  };

  const handleDeleteInvite = async (email: string) => {
    const { error } = await supabase.from('user_invites').delete().eq('email', email);
    if (!error) fetchInvites();
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestão de Equipe</h2>
          <p className="text-sm text-slate-500 font-normal">Usuários com acesso e colaboradores de fábrica</p>
        </div>
        <div className="flex gap-2">
          {tab === 'usuarios' || tab === 'convites' ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-secondary transition-colors"
            >
              <Plus size={16} />
              Cadastrar Usuário
            </button>
          ) : (
            <button
              onClick={() => setShowStaffForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-secondary transition-colors"
            >
              <Plus size={16} />
              Novo Colaborador
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6 gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'usuarios' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} />
          Usuários Ativos
          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{appUsers.length}</span>
        </button>
        <button
          onClick={() => setTab('convites')}
          className={`flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'convites' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Send size={16} />
          Cadastros Pendentes
          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{invites.length}</span>
        </button>
        <button
          onClick={() => setTab('producao')}
          className={`flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'producao' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <HardHat size={16} />
          Equipe de Produção
          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{staff.length}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 font-medium">
        {tab === 'usuarios' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {appUsers.map(user => (
              <div key={user.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full ${user.avatarUrl ? '' : avatarColor(user.id)} flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden border border-slate-100 shadow-sm`}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        initials(user.name)
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                        {user.name}
                        {user.isMaster && <Shield size={12} className="text-primary" />}
                      </h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${user.isMaster ? 'bg-primary/10 text-primary' : ROLE_COLORS[user.role]}`}>
                        {getRoleLabel(user)}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-100 font-normal">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <p className="text-xs text-slate-400">Desde {user.createdAt}</p>
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingUser(user); setShowExportUserForm(true); }}
                    className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  {!user.isMaster && (
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="flex-1 py-1.5 border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={12} /> Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'convites' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {invites.map(invite => (
              <div key={invite.email} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm shrink-0 uppercase">
                      {invite.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{invite.name}</h3>
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${ROLE_COLORS[invite.role]}`}>
                        {ROLE_LABELS[invite.role]}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-tighter">
                    Aguardando Primeiro Acesso
                  </span>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-100 font-normal">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{invite.email}</span>
                  </div>
                  <p className="text-xs text-slate-400 italic">Enviado em {new Date(invite.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleDeleteInvite(invite.email)}
                    className="flex-1 py-1.5 bg-red-50 rounded-lg text-xs font-bold text-red-600 hover:bg-red-100 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={12} /> Excluir Cadastro
                  </button>
                </div>
              </div>
            ))}
            {invites.length === 0 && !loadingInvites && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Send size={48} className="opacity-20" />
                <p className="font-semibold text-center">Nenhum cadastro pendente.<br/><span className="text-xs font-normal">Cadastre novos membros para que eles possam acessar o sistema.</span></p>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden font-normal text-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Colaborador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Função</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Valor/Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 leading-relaxed">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${avatarColor(s.id)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                          {initials(s.name)}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">{POSITION_LABELS[s.position]}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 text-center">
                      {s.hourlyRate > 0 ? `R$ ${s.hourlyRate.toFixed(2)}/h` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingStaff(s); setShowStaffForm(true); }} className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => onDeleteStaff(s.id)} className="p-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInviteForm && <InviteForm onSave={handleSendInvite} onClose={() => setShowInviteForm(false)} />}
      {showExportUserForm && editingUser && <EditUserForm user={editingUser} onSave={onSaveUser} onClose={() => { setShowExportUserForm(false); setEditingUser(undefined); }} />}
      {showStaffForm && <StaffForm initial={editingStaff} onSave={onSaveStaff} onClose={() => { setShowStaffForm(false); setEditingStaff(undefined); }} />}
    </div>
  );
};
