import React, { useState } from 'react';
import { Users, Shield, HardHat, Plus, X, Mail, Phone, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { AppUser, ProductionStaff, StaffPosition } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const AVATAR_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-pink-500', 'bg-teal-500'
];
const avatarColor = (id: string) => AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length] || 'bg-slate-500';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

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
      name,
      email,
      role,
      status: initial?.status || 'ativo',
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
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
          <h2 className="text-lg font-bold text-slate-800">{initial?.id ? 'Editar Usuário' : 'Novo Usuário do App'}</h2>
          <button type="button" onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="joao@empresa.com" />
          </div>
          {!initial?.id && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Senha (inicial)</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil de Acesso</label>
            <div className="relative mt-1">
              <select value={role} onChange={e => setRole(e.target.value as AppUser['role'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="seller">Vendedor</option>
                <option value="driver">Motorista/Entregador</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" className="flex-1 py-2 rounded-lg bg-[#ec5b13] text-white text-sm font-bold hover:bg-orange-700 transition-colors">
            {initial?.id ? 'Salvar' : 'Criar Usuário'}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || String(Date.now()),
      name,
      position,
      hourlyRate: parseFloat(hourlyRate) || 0,
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
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ex: João Ferreira" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Função</label>
            <div className="relative mt-1">
              <select value={position} onChange={e => setPosition(e.target.value as StaffPosition)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400">
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
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ex: 18.50" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" className="flex-1 py-2 rounded-lg bg-[#ec5b13] text-white text-sm font-bold hover:bg-orange-700 transition-colors">
            {initial?.id ? 'Salvar' : 'Cadastrar'}
          </button>
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

export const TeamView: React.FC<TeamViewProps> = ({
  appUsers,
  onSaveUser,
  onDeleteUser,
  staff,
  onSaveStaff,
  onDeleteStaff
}) => {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [editingStaff, setEditingStaff] = useState<ProductionStaff | undefined>();

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestão de Equipe</h2>
          <p className="text-sm text-slate-500">Usuários do sistema e colaboradores de produção</p>
        </div>
        <button
          onClick={() => tab === 'usuarios' ? setShowUserForm(true) : setShowStaffForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition-colors"
        >
          <Plus size={16} />
          {tab === 'usuarios' ? 'Novo Usuário' : 'Novo Colaborador'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6 gap-6">
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'usuarios' ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Shield size={16} />
          Usuários do App
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{appUsers.length}</span>
        </button>
        <button
          onClick={() => setTab('producao')}
          className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'producao' ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <HardHat size={16} />
          Equipe de Produção
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{staff.length}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 text-slate-900 font-medium">
        {tab === 'usuarios' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {appUsers.map(user => (
              <div key={user.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full ${avatarColor(user.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {initials(user.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{user.name}</h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal">Desde {user.createdAt}</p>
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingUser(user); setShowUserForm(true); }}
                    className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="py-1.5 px-3 border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Colaborador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Função</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor/Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                    <td className="px-4 py-3 font-semibold text-slate-700 uppercase">
                      {s.hourlyRate > 0 ? `R$ ${s.hourlyRate.toFixed(2)}/h` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingStaff(s); setShowStaffForm(true); }} className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"><Edit2 size={13} /></button>
                        <button onClick={() => onDeleteStaff(s.id)} className="p-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUserForm && <UserForm initial={editingUser} onSave={onSaveUser} onClose={() => { setShowUserForm(false); setEditingUser(undefined); }} />}
      {showStaffForm && <StaffForm initial={editingStaff} onSave={onSaveStaff} onClose={() => { setShowStaffForm(false); setEditingStaff(undefined); }} />}
    </div>
  );
};
