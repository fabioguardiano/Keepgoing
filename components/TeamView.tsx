import React, { useState } from 'react';
import { Users, Shield, HardHat, Plus, X, Mail, Edit2, Trash2, ChevronDown, Search, PowerOff } from 'lucide-react';
import { AppUser, ProductionStaff, StaffPosition } from '../types';

const POSITION_LABELS: Record<StaffPosition, string> = {
  serrador: 'Serrador',
  acabador: 'Acabador',
  ajudante_serrador: 'Ajudante de Serrador',
  ajudante_acabador: 'Ajudante de Acabador',
  motorista: 'Motorista',
  medidor: 'Medidor',
};

const ROLE_LABELS: Record<AppUser['role'], string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  driver: 'Motorista/Entregador',
};

const ROLE_COLORS: Record<AppUser['role'], string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  seller: 'bg-green-100 text-green-700',
  driver: 'bg-orange-100 text-orange-700',
};

const AVATAR_COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-pink-500', 'bg-teal-500'];
const avatarColor = (id: string) => AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length] || 'bg-slate-500';
const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

// ─── Modal: Add/Edit App User ─────────────────────────────────────────────────

interface UserFormProps {
  initial?: Partial<AppUser>;
  onSave: (u: AppUser) => void;
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<AppUser['role']>(initial?.role ?? 'seller');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || String(Date.now()),
      name, email, role,
      status: initial?.status || 'ativo',
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm";
  const labelClass = "block text-sm font-bold text-slate-700 mb-2 ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4" onClick={onClose}>
      <form className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{initial?.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <p className="text-slate-500 text-sm">Acesso ao sistema</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>
        <div className="p-8 space-y-4">
          <div>
            <label className={labelClass}>Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="joao@empresa.com" />
          </div>
          {!initial?.id && (
            <div>
              <label className={labelClass}>Senha (inicial)</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className={labelClass}>Perfil de Acesso</label>
            <div className="relative">
              <select value={role} onChange={e => setRole(e.target.value as AppUser['role'])} className={`${inputClass} appearance-none`}>
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="seller">Vendedor</option>
                <option value="driver">Motorista/Entregador</option>
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 px-6 py-3 bg-primary hover:bg-secondary text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
              {initial?.id ? 'Salvar' : 'Criar Usuário'}
            </button>
          </div>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || String(Date.now()),
      name, position,
      hourlyRate: parseFloat(hourlyRate) || 0,
      status: initial?.status || 'ativo',
    });
    onClose();
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm";
  const labelClass = "block text-sm font-bold text-slate-700 mb-2 ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4" onClick={onClose}>
      <form className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{initial?.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
            <p className="text-slate-500 text-sm">Equipe de produção</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>
        <div className="p-8 space-y-4">
          <div>
            <label className={labelClass}>Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ex: João Ferreira" />
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
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button>
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
  onSaveUser: (u: AppUser) => void;
  onDeleteUser: (id: string) => void;
  staff: ProductionStaff[];
  onSaveStaff: (s: ProductionStaff) => void;
  onDeleteStaff: (id: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ appUsers, onSaveUser, onDeleteUser, staff, onSaveStaff, onDeleteStaff }) => {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [editingStaff, setEditingStaff] = useState<ProductionStaff | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = appUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    POSITION_LABELS[s.position].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Equipe</h1>
          <p className="text-slate-500 font-medium">Usuários do sistema e colaboradores de produção</p>
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
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou função..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${tab === 'usuarios' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
        >
          <Shield size={14} />
          Usuários do App
          <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">{appUsers.length}</span>
        </button>
        <button
          onClick={() => setTab('producao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${tab === 'producao' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
        >
          <HardHat size={14} />
          Equipe de Produção
          <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">{staff.length}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'usuarios' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Nome</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Perfil</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Desde</th>
                  <th className="px-6 py-5 text-right text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6">
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${avatarColor(user.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                          {initials(user.name)}
                        </div>
                        <div className="font-black text-slate-800 leading-tight">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                        <Mail size={14} className="text-slate-300" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-sm font-bold text-slate-600">{user.createdAt}</div>
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
                          onClick={() => onDeleteUser(user.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Cód</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Função</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Valor/Hora</th>
                  <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-right text-sm font-bold text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStaff.map((s, index) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6">
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${avatarColor(s.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                          {initials(s.name)}
                        </div>
                        <div className="font-black text-slate-800 leading-tight">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-xs font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {POSITION_LABELS[s.position]}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-sm font-bold text-slate-700">
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
                          onClick={() => onDeleteStaff(s.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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

      {showUserForm && <UserForm initial={editingUser} onSave={onSaveUser} onClose={() => { setShowUserForm(false); setEditingUser(undefined); }} />}
      {showStaffForm && <StaffForm initial={editingStaff} onSave={onSaveStaff} onClose={() => { setShowStaffForm(false); setEditingStaff(undefined); }} />}
    </div>
  );
};
