import React, { useState } from 'react';
import { Settings, Layout, Check, ChevronRight, Plus, Trash2, Edit2, GripVertical, Info, Building2, MapPin, Phone, Mail, ShoppingBag, FileSpreadsheet, Download, Upload, AlertCircle, Loader2, Wallet, Shield, Bell, ToggleLeft, ToggleRight, X, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PaymentTypesView } from './PaymentTypesView';
import { PaymentMethodsView } from './PaymentMethodsView';
import { PermissionsTab } from './PermissionsTab';
import { AuditLogView } from './AuditLogView';
import { PhaseConfig, CompanyInfo, SalesPhaseConfig, PaymentMethod, PaymentType, PermissionProfile, AppUser, PayablePaymentMethod, ActivityLog, User } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// ─── FinanceiroTabContent ─────────────────────────────────────────────────────
interface FinanceiroTabProps {
  payablePMs: PayablePaymentMethod[];
  paymentMethods: PaymentMethod[];
  onSave: (pm: Omit<PayablePaymentMethod, 'id' | 'createdAt'> & { id?: string }) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
}

const FinanceiroTabContent: React.FC<FinanceiroTabProps> = ({ payablePMs, paymentMethods, onSave, onDelete, onToggle }) => {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCode, setEditingCode] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const nextCode = (offset = 0) => {
    const codes = payablePMs.map(pm => parseInt(pm.code || '0')).filter(c => !isNaN(c) && c > 0);
    return (Math.max(0, ...codes) + 1 + offset).toString().padStart(2, '0');
  };

  const handleImport = async () => {
    // Formas do Contas a Receber que ainda não existem no Contas a Pagar (comparando pelo nome)
    const existingNames = new Set(payablePMs.map(pm => pm.name.toLowerCase().trim()));
    const toImport = paymentMethods.filter(pm => !existingNames.has(pm.name.toLowerCase().trim()));
    if (toImport.length === 0) return alert('Todas as formas de pagamento já foram importadas.');
    setImporting(true);
    try {
      for (let i = 0; i < toImport.length; i++) {
        const pm = toImport[i];
        await onSave({ code: nextCode(i), name: pm.name, active: pm.active });
      }
    } catch (err: any) {
      alert(`Erro ao importar: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onSave({ code: nextCode(), name: newName.trim(), active: true });
      setNewName('');
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (pm: PayablePaymentMethod) => {
    if (!editingName.trim()) return;
    setEditSaving(true);
    try {
      await onSave({ id: pm.id, code: editingCode.trim() || pm.code, name: editingName.trim(), active: pm.active });
      setEditingId(null);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
          <Wallet size={16} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">Formas de Pagamento — Contas a Pagar</h2>
          <p className="text-[11px] text-slate-400 font-medium">Configure como você realiza pagamentos a fornecedores</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {/* Add new */}
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ex: PIX, TED, Boleto, Cheque..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || saving}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Plus size={15} />
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>

        {/* List */}
        {payablePMs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Nenhuma forma de pagamento cadastrada.
          </div>
        ) : (
          <div className="space-y-2">
            {payablePMs.map(pm => (
              <div key={pm.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl group">
                {editingId === pm.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editingCode}
                      onChange={e => setEditingCode(e.target.value)}
                      placeholder="Cód."
                      className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSave(pm); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button
                      onClick={() => handleEditSave(pm)}
                      disabled={editSaving}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Salvar"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pm.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      {pm.code && (
                        <span className="font-mono text-[11px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded flex-shrink-0">
                          {pm.code}
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className={`text-sm font-bold ${pm.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                          {pm.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(pm.id); setEditingName(pm.name); setEditingCode(pm.code || ''); }}
                        title="Renomear"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--primary-color)] hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onToggle(pm.id)}
                        title={pm.active ? 'Desativar' : 'Ativar'}
                        className="p-1.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-100"
                      >
                        {pm.active
                          ? <ToggleRight size={16} className="text-emerald-500" />
                          : <ToggleLeft size={16} className="text-slate-300" />}
                      </button>
                      <button
                        onClick={() => onDelete(pm.id)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Itens inativos ficam ocultos ao registrar pagamentos no Contas a Pagar.
        </p>
      </div>
    </div>
  );
};

interface SettingsViewProps {
    phases: PhaseConfig[];
    onToggleRequirement: (phaseName: string) => void;
    onAddPhase: (name: string) => void;
    onRenamePhase: (oldName: string, newName: string) => void;
    onDeletePhase: (name: string) => void;
    onReorderPhases: (startIndex: number, endIndex: number) => void;
    salesPhases: SalesPhaseConfig[];
    onAddSalesPhase: (name: string) => void;
    onRenameSalesPhase: (oldName: string, newName: string) => void;
    onDeleteSalesPhase: (name: string) => void;
    onUpdateSalesPhase: (name: string, updates: Partial<SalesPhaseConfig>) => void;
    onReorderSalesPhases: (startIndex: number, endIndex: number) => void;
    companyInfo: CompanyInfo;
    onUpdateCompany: (info: CompanyInfo) => void;
    onImportClients: (clients: any[]) => Promise<{ success: number; errors: number }>;
    paymentTypes: PaymentType[];
    onSavePaymentType: (type: any) => Promise<any>;
    onDeletePaymentType?: (id: string) => void;
    paymentMethods: PaymentMethod[];
    onSavePaymentMethod: (method: any) => Promise<any>;
    onDeletePaymentMethod: (id: string) => Promise<void>;
    onTogglePaymentMethod: (id: string) => Promise<void>;
    permissionProfiles: PermissionProfile[];
    appUsers: AppUser[];
    onSaveProfile: (profile: PermissionProfile) => void;
    onDeleteProfile: (id: string) => void;
    onSaveUser: (user: AppUser) => void;
    deadlineWarningDays: number;
    deadlineUrgentDays: number;
    onSetDeadlineWarningDays: (v: number) => void;
    onSetDeadlineUrgentDays: (v: number) => void;
    idleTimeoutMinutes: number;
    onSetIdleTimeoutMinutes: (v: number) => void;
    initialTab?: 'fluxo' | 'vendas' | 'empresa' | 'dados' | 'financeiro' | 'geral' | 'permissoes' | 'auditoria';
    payablePMs: PayablePaymentMethod[];
    onSavePayablePM: (pm: Omit<PayablePaymentMethod, 'id' | 'createdAt'> & { id?: string }) => Promise<any>;
    onDeletePayablePM: (id: string) => Promise<void>;
    onTogglePayablePM: (id: string) => Promise<void>;
    currentUser?: User;
    activities?: ActivityLog[];
    loadingActivities?: boolean;
    refreshActivities?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
    phases,
    onToggleRequirement,
    onAddPhase,
    onRenamePhase,
    onDeletePhase,
    onReorderPhases,
    salesPhases,
    onAddSalesPhase,
    onRenameSalesPhase,
    onDeleteSalesPhase,
    onUpdateSalesPhase,
    onReorderSalesPhases,
    companyInfo,
    onUpdateCompany,
    onImportClients,
    paymentMethods,
    onSavePaymentMethod,
    onDeletePaymentMethod,
    onTogglePaymentMethod,
    paymentTypes,
    onSavePaymentType,
    onDeletePaymentType,
    permissionProfiles,
    appUsers,
    onSaveProfile,
    onDeleteProfile,
    onSaveUser,
    deadlineWarningDays,
    deadlineUrgentDays,
    onSetDeadlineWarningDays,
    onSetDeadlineUrgentDays,
    idleTimeoutMinutes,
    onSetIdleTimeoutMinutes,
    initialTab,
    payablePMs,
    onSavePayablePM,
    onDeletePayablePM,
    onTogglePayablePM,
    currentUser,
    activities = [],
    loadingActivities = false,
    refreshActivities = () => {},
}) => {
    const [activeTab, setActiveTab] = useState<'fluxo' | 'vendas' | 'empresa' | 'dados' | 'financeiro' | 'geral' | 'permissoes' | 'auditoria'>(initialTab || 'fluxo');
    const [newPhaseName, setNewPhaseName] = useState('');
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editingLostReasonIdx, setEditingLostReasonIdx] = useState<number | null>(null);
    const [tempName, setTempName] = useState('');
    const [tempReasonName, setTempReasonName] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [importStats, setImportStats] = useState<{ total: number; success: number; errors: number; } | null>(null);

    const handleUpdateCompany = (field: keyof CompanyInfo, value: string) => {
        onUpdateCompany({ ...companyInfo, [field]: value });
    };

    const handleAdd = () => {
        if (newPhaseName.trim()) {
            onAddPhase(newPhaseName.trim());
            setNewPhaseName('');
        }
    };

    const handleRename = (oldName: string) => {
        if (tempName.trim()) {
            onRenamePhase(oldName, tempName.trim());
        }
        setEditingPhase(null);
    };

    return (
        <div className="h-full max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-primary">
                    <Settings size={28} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Configurações do Sistema</h1>
                    <p className="text-xs text-slate-500 font-medium">Personalize o fluxo de trabalho e informações da empresa</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sidebar Nav */}
                <div className="space-y-2">
                    <button 
                        onClick={() => setActiveTab('fluxo')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'fluxo' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Layout size={18} />
                            Fluxo de Produção
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('vendas')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'vendas' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <ShoppingBag size={18} />
                            Fluxo de Vendas
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('empresa')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'empresa' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 size={18} />
                            Cadastro da Empresa
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('dados')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'dados' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet size={18} />
                            Importação de Dados
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    <button
                        onClick={() => setActiveTab('financeiro')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'financeiro' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Wallet size={18} />
                            Financeiro
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    <button
                        onClick={() => setActiveTab('geral')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'geral' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Settings size={18} />
                            Geral
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    <button
                        onClick={() => setActiveTab('permissoes')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'permissoes' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Shield size={18} />
                            Permissões
                        </div>
                        <ChevronRight size={14} />
                    </button>
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => setActiveTab('auditoria')}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold border transition-all ${activeTab === 'auditoria' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Shield size={18} />
                                Auditoria
                            </div>
                            <ChevronRight size={14} />
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'auditoria' ? (
                        <AuditLogView
                            activities={activities}
                            loadingActivities={loadingActivities}
                            refreshActivities={refreshActivities}
                        />
                    ) : activeTab === 'permissoes' ? (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Perfis de Permissão</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Gerencie os níveis de acesso por módulo e atribua perfis aos usuários</p>
                            </div>
                            <div className="p-6">
                                <PermissionsTab
                                    profiles={permissionProfiles}
                                    appUsers={appUsers}
                                    onSaveProfile={onSaveProfile}
                                    onDeleteProfile={onDeleteProfile}
                                    onSaveUser={onSaveUser}
                                />
                            </div>
                        </div>
                    ) : activeTab === 'financeiro' ? (
                        <FinanceiroTabContent
                            payablePMs={payablePMs}
                            paymentMethods={paymentMethods}
                            onSave={onSavePayablePM}
                            onDelete={onDeletePayablePM}
                            onToggle={onTogglePayablePM}
                        />
                    ) : activeTab === 'geral' ? (
                        <>
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Geral</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Configurações gerais exibidas nos documentos gerados</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nota Legal (rodapé do orçamento/pedido)</label>
                                    <p className="text-xs text-slate-400 mb-2">Texto exibido abaixo do campo de Observações na impressão do orçamento.</p>
                                    <textarea
                                        value={companyInfo.legalNote ?? 'Mármores e granitos, por sua natureza, estão sujeitos a variações de tonalidade, veios, buracos, fissuras e/ou manchas, não podendo ser recusados ou devolvidos por essa razão.\nServiços em obra (colagem, calafetagem, polimento etc.) só serão executados se explicitamente inclusos neste orçamento.'}
                                        onChange={e => handleUpdateCompany('legalNote', e.target.value)}
                                        rows={5}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium resize-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Segurança de Sessão */}
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                    <Shield size={16} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">Segurança de Sessão</h2>
                                    <p className="text-[11px] text-slate-400 font-medium">Desloga automaticamente usuários inativos</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    Tempo de inatividade para deslogar
                                </label>
                                <p className="text-xs text-slate-400 mb-3">
                                    Após esse tempo sem interação (mouse, teclado ou scroll), o sistema exibirá um aviso de 60 segundos antes de encerrar a sessão.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[5, 10, 15, 30, 60].map(min => (
                                        <button
                                            key={min}
                                            onClick={() => onSetIdleTimeoutMinutes(min)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all
                                                ${idleTimeoutMinutes === min
                                                    ? 'bg-primary/10 text-primary border-primary/20'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            {min} min
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-slate-400">
                                    Configuração atual: <span className="font-bold text-slate-600">{idleTimeoutMinutes} minutos</span> de inatividade.
                                </p>
                            </div>
                        </div>
                        </>
                    ) : activeTab === 'fluxo' ? (
                        <>
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Fases do Kanban</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Configure a ordem e as obrigatoriedades de cada etapa</p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Add New Phase */}
                                <div className="flex gap-2 mb-6">
                                    <input
                                        value={newPhaseName}
                                        onChange={(e) => setNewPhaseName(e.target.value)}
                                        placeholder="Nome da nova fase..."
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                                    />
                                    <button
                                        onClick={handleAdd}
                                        className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={18} /> Adicionar
                                    </button>
                                </div>

                                {/* List of Phases */}
                                <DragDropContext onDragEnd={(result) => {
                                    if (!result.destination) return;
                                    onReorderPhases(result.source.index, result.destination.index);
                                }}>
                                    <Droppable droppableId="phases">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                                {phases.map((phase, index) => (
                                                    <Draggable key={phase.name} draggableId={phase.name} index={index}>
                                                        {(draggableProvided) => (
                                                            <div
                                                                ref={draggableProvided.innerRef}
                                                                {...draggableProvided.draggableProps}
                                                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-orange-200 hover:bg-white transition-all gap-4"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div {...draggableProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300">
                                                                        <GripVertical size={18} />
                                                                    </div>

                                                                    {editingPhase === phase.name ? (
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <input
                                                                                autoFocus
                                                                                value={tempName}
                                                                                onChange={(e) => setTempName(e.target.value)}
                                                                                onBlur={() => handleRename(phase.name)}
                                                                                onKeyDown={(e) => e.key === 'Enter' && handleRename(phase.name)}
                                                                                className="w-full bg-white border border-[var(--primary-color)] rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-sm font-bold text-slate-700 truncate">{phase.name}</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-6">
                                                                    {/* Requirement Toggle */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exigir Responsável</span>
                                                                        <button
                                                                            onClick={() => onToggleRequirement(phase.name)}
                                                                            className={`relative w-11 h-6 rounded-full transition-colors ${phase.requiresResponsible ? 'bg-primary' : 'bg-slate-200'}`}
                                                                        >
                                                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${phase.requiresResponsible ? 'translate-x-5' : ''}`} />
                                                                        </button>
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => { setEditingPhase(phase.name); setTempName(phase.name); }}
                                                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => onDeletePhase(phase.name)}
                                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>

                                {/* Info Alert */}
                                <div className="mt-8 p-3 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                                    <Info size={18} className="shrink-0" />
                                    <div className="text-[11px]">
                                        <p className="font-bold mb-0.5 uppercase tracking-wide">Sobre a Responsabilidade Obrigatória</p>
                                        <p className="font-medium opacity-80 leading-relaxed">Ao ativar esta opção, o sistema impedirá que uma O.S. seja movida para esta fase sem que um colaborador de produção seja selecionado no momento da ação.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alertas de Prazo de Entrega */}
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mt-6">
                            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                                <Bell size={18} className="text-amber-500" />
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">Alertas de Prazo de Entrega</h2>
                                    <p className="text-[11px] text-slate-400 font-medium">Define quando os cards de O.S. mudam de cor no kanban</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                                            Alerta de atenção (amarelo)
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">Exibe o aviso amarelo quando restar este número de dias ou menos</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <input
                                            type="number"
                                            min={1}
                                            max={90}
                                            value={deadlineWarningDays}
                                            onChange={e => onSetDeadlineWarningDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        />
                                        <span className="text-xs text-slate-400 font-medium">dias</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                                            Alerta urgente (vermelho)
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">Exibe o aviso vermelho quando restar este número de dias ou menos</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <input
                                            type="number"
                                            min={0}
                                            max={deadlineWarningDays - 1}
                                            value={deadlineUrgentDays}
                                            onChange={e => onSetDeadlineUrgentDays(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                                        />
                                        <span className="text-xs text-slate-400 font-medium">dias</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 font-medium space-y-1">
                                    <p>🟢 Mais de <strong>{deadlineWarningDays} dias</strong> restantes → verde (normal)</p>
                                    <p>🟡 Entre <strong>{deadlineUrgentDays + 1}</strong> e <strong>{deadlineWarningDays} dias</strong> → amarelo (atenção)</p>
                                    <p>🔴 <strong>{deadlineUrgentDays} dias</strong> ou menos → vermelho (urgente)</p>
                                    <p>⛔ Vencido → vermelho (atrasado)</p>
                                </div>
                            </div>
                        </div>
                        </>
                    ) : activeTab === 'vendas' ? (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Fases de Vendas</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Configure as etapas do seu funil comercial</p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Add New Sales Phase */}
                                <div className="flex gap-2 mb-6">
                                    <input
                                        value={newPhaseName}
                                        onChange={(e) => setNewPhaseName(e.target.value)}
                                        placeholder="Nome da nova etapa de venda..."
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newPhaseName.trim()) {
                                                onAddSalesPhase(newPhaseName.trim());
                                                setNewPhaseName('');
                                            }
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={18} /> Adicionar
                                    </button>
                                </div>

                                {/* List of Sales Phases */}
                                <DragDropContext onDragEnd={(result) => {
                                    if (!result.destination) return;
                                    onReorderSalesPhases(result.source.index, result.destination.index);
                                }}>
                                    <Droppable droppableId="salesPhases">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                                {salesPhases.map((phase, index) => (
                                                    <Draggable key={phase.name} draggableId={phase.name} index={index}>
                                                        {(draggableProvided) => (
                                                            <div
                                                                ref={draggableProvided.innerRef}
                                                                {...draggableProvided.draggableProps}
                                                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-orange-200 hover:bg-white transition-all gap-4"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div {...draggableProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300">
                                                                        <GripVertical size={18} />
                                                                    </div>

                                                                    {editingPhase === phase.name ? (
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <input
                                                                                autoFocus
                                                                                value={tempName}
                                                                                onChange={(e) => setTempName(e.target.value)}
                                                                                onBlur={() => {
                                                                                    if (tempName.trim()) onRenameSalesPhase(phase.name, tempName.trim());
                                                                                    setEditingPhase(null);
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        if (tempName.trim()) onRenameSalesPhase(phase.name, tempName.trim());
                                                                                        setEditingPhase(null);
                                                                                    }
                                                                                }}
                                                                                className="w-full bg-white border border-primary rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-sm font-bold text-slate-700 truncate">{phase.name}</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Código</label>
                                                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                                                                            <input
                                                                                type="text"
                                                                                value={phase.code ?? ''}
                                                                                onChange={e => onUpdateSalesPhase(phase.name, { code: e.target.value })}
                                                                                placeholder="--"
                                                                                className="w-10 text-xs font-bold text-slate-700 bg-transparent focus:outline-none text-center"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Tempo Desejável</label>
                                                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                value={phase.desirableDays ?? ''}
                                                                                onChange={e => onUpdateSalesPhase(phase.name, { desirableDays: parseInt(e.target.value) || undefined })}
                                                                                placeholder="--"
                                                                                className="w-10 text-xs font-bold text-slate-700 bg-transparent focus:outline-none text-center"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-slate-400">dias</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Alerta</label>
                                                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                value={phase.alertDays ?? ''}
                                                                                onChange={e => onUpdateSalesPhase(phase.name, { alertDays: parseInt(e.target.value) || undefined })}
                                                                                placeholder="--"
                                                                                className="w-10 text-xs font-bold text-slate-700 bg-transparent focus:outline-none text-center"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-slate-400">dias</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => { setEditingPhase(phase.name); setTempName(phase.name); }}
                                                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => onDeleteSalesPhase(phase.name)}
                                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>

                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] mb-3">Parâmetros de Desconto</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mb-4">Defina o limite máximo de desconto que um vendedor pode conceder sem autorização</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 max-w-xs">
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Desconto máximo permitido (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                value={companyInfo.maxDiscountPct ?? ''}
                                                onChange={e => {
                                                    const v = parseFloat(e.target.value);
                                                    onUpdateCompany({ ...companyInfo, maxDiscountPct: isNaN(v) ? undefined : v });
                                                }}
                                                placeholder="Ex: 10"
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-5">Se vazio, não há limite de desconto.</p>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-100">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] mb-3">Motivos de Orçamento Perdido</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mb-6">Cadastre as opções que o vendedor deverá selecionar ao perder um orçamento</p>
                                    
                                    <div className="flex gap-2 mb-6">
                                        <input
                                            id="newLostReason"
                                            placeholder="Ex: Preço da concorrência..."
                                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                                        />
                                        <button
                                            onClick={() => {
                                                const el = document.getElementById('newLostReason') as HTMLInputElement;
                                                if (el && el.value.trim()) {
                                                    const current = companyInfo.lostReasonOptions || [];
                                                    onUpdateCompany({ ...companyInfo, lostReasonOptions: [...current, el.value.trim()] });
                                                    el.value = '';
                                                }
                                            }}
                                            className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-secondary transition-colors flex items-center justify-center h-10 w-10 shrink-0"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(companyInfo.lostReasonOptions || []).map((reason, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:bg-white hover:border-orange-100 transition-all">
                                                {editingLostReasonIdx === idx ? (
                                                    <input
                                                        autoFocus
                                                        value={tempReasonName}
                                                        onChange={(e) => setTempReasonName(e.target.value)}
                                                        onBlur={() => {
                                                            if (tempReasonName.trim()) {
                                                                const current = [...(companyInfo.lostReasonOptions || [])];
                                                                current[idx] = tempReasonName.trim();
                                                                onUpdateCompany({ ...companyInfo, lostReasonOptions: current });
                                                            }
                                                            setEditingLostReasonIdx(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                if (tempReasonName.trim()) {
                                                                    const current = [...(companyInfo.lostReasonOptions || [])];
                                                                    current[idx] = tempReasonName.trim();
                                                                    onUpdateCompany({ ...companyInfo, lostReasonOptions: current });
                                                                }
                                                                setEditingLostReasonIdx(null);
                                                            }
                                                        }}
                                                        className="flex-1 bg-white border border-primary rounded-lg px-2 py-1 text-sm font-bold focus:outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-bold text-slate-600">{reason}</span>
                                                )}
                                                
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingLostReasonIdx(idx);
                                                            setTempReasonName(reason);
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const current = companyInfo.lostReasonOptions || [];
                                                            onUpdateCompany({ ...companyInfo, lostReasonOptions: current.filter((_, i) => i !== idx) });
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'empresa' ? (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Dados da Empresa</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Informações básicas e endereço principal</p>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    {/* Logo Upload Section */}
                                    <div className="md:col-span-2 p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                                                {companyInfo.logoUrl ? (
                                                    <img src={companyInfo.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Building2 size={28} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-0.5">
                                                <h3 className="text-xs font-bold text-slate-800">Logotipo da Empresa</h3>
                                                <p className="text-[10px] text-slate-400 font-medium">PNG ou JPG. Recomendado: Quadrado, máx. 500x500px.</p>
                                                <div className="flex gap-2 pt-1">
                                                    <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-all">
                                                        Alterar Logo
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        handleUpdateCompany('logoUrl', reader.result as string);
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {companyInfo.logoUrl && (
                                                        <button 
                                                            onClick={() => handleUpdateCompany('logoUrl', '')}
                                                            className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-all"
                                                        >
                                                            Remover
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logo de Impressão Upload Section */}
                                    <div className="md:col-span-2 p-5 bg-white border border-slate-200 rounded-3xl space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                                                    {companyInfo.printLogoUrl ? (
                                                        <img src={companyInfo.printLogoUrl} alt="Print Logo Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Layout size={28} className="text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xs font-bold text-slate-800">Logotipo para Impressão</h3>
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase">Novo</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">Otimizado para documentos. Recomendado: Horizontal (ex: 600x200px).</p>
                                                    <div className="flex gap-2 pt-1">
                                                        <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-all">
                                                            Alterar Logo de Impressão
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => {
                                                                            handleUpdateCompany('printLogoUrl', reader.result as string);
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                        {companyInfo.printLogoUrl && (
                                                            <button 
                                                                onClick={() => handleUpdateCompany('printLogoUrl', '')}
                                                                className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-all"
                                                            >
                                                                Remover
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Building2 size={14} /> Nome da Empresa
                                        </label>
                                        <input 
                                            value={companyInfo.name}
                                            onChange={(e) => handleUpdateCompany('name', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Phone size={14} /> Telefone
                                        </label>
                                        <input 
                                            value={companyInfo.phone}
                                            onChange={(e) => handleUpdateCompany('phone', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin size={14} /> Endereço da Sede
                                        </label>
                                        <input 
                                            value={companyInfo.address}
                                            onChange={(e) => handleUpdateCompany('address', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                        <p className="text-[10px] text-slate-400 italic">Este endereço será usado como ponto de partida (Saída) para todas as rotas na Agenda de Entregas.</p>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Mail size={14} /> E-mail de Contato
                                        </label>
                                        <input 
                                            value={companyInfo.email}
                                            onChange={(e) => handleUpdateCompany('email', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>

                                    {/* Sidebar Customization Section */}
                                    <div className="md:col-span-2 p-5 bg-slate-100/50 border border-slate-200 rounded-3xl space-y-4 shadow-inner">
                                        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                            <Layout size={16} className="text-primary" /> Personalização Visual
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Botões e Destaques (Marca)</label>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="color" 
                                                        value={companyInfo.buttonColor || '#ec5b13'}
                                                        onChange={(e) => handleUpdateCompany('buttonColor', e.target.value)}
                                                        className="w-12 h-12 rounded-xl bg-white border-4 border-white shadow-sm cursor-pointer"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black text-slate-700 font-mono uppercase leading-none mb-1">{companyInfo.buttonColor || '#EC5B13'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium italic">Cor principal dos elementos</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Barra Lateral (Fundo)</label>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="color" 
                                                        value={companyInfo.sidebarColor || '#0f172a'}
                                                        onChange={(e) => handleUpdateCompany('sidebarColor', e.target.value)}
                                                        className="w-12 h-12 rounded-xl bg-white border-4 border-white shadow-sm cursor-pointer"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black text-slate-700 font-mono uppercase leading-none mb-1">{companyInfo.sidebarColor || '#0F172A'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium italic">Cor de fundo da sidebar</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Barra Lateral (Texto/Ícones)</label>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="color" 
                                                        value={companyInfo.sidebarTextColor || '#cbd5e1'}
                                                        onChange={(e) => handleUpdateCompany('sidebarTextColor', e.target.value)}
                                                        className="w-12 h-12 rounded-xl bg-white border-4 border-white shadow-sm cursor-pointer"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black text-slate-700 font-mono uppercase leading-none mb-1">{companyInfo.sidebarTextColor || '#CBD5E1'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium italic">Cor de contraste para as fontes</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden text-center p-12">
                            <div className="max-w-md mx-auto space-y-6">
                                <div className="w-16 h-16 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <FileSpreadsheet size={32} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800">Importação de Clientes</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed"> Suba sua planilha do Excel (.xlsx) para importar seus clientes em lote para o sistema.</p>
                                
                                <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 text-left">
                                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                                        <Download size={14} className="text-blue-500" /> Instruções Importantes:
                                    </h3>
                                    <ul className="text-xs text-slate-400 space-y-2 font-medium">
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            Certifique-se que a primeira linha contém os cabeçalhos.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            Colunas obrigatórias: <strong className="text-slate-600">nome, tipo, documento</strong>.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            Colunas de endereço recomendadas: <strong className="text-slate-600">rua, numero, bairro, cidade, estado, cep</strong>.
                                        </li>
                                    </ul>
                                    <button 
                                        onClick={() => {
                                            const template = [
                                                ['codigo', 'nome', 'tipo', 'documento', 'email', 'telefone', 'celular', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep'],
                                                ['1', 'João Silva', 'Pessoa Física', '000.000.000-00', 'joao@email.com', '(11) 9999-9999', '(11) 99999-9999', 'Av. Paulista', '1000', 'Sala 1', 'Centro', 'São Paulo', 'SP', '01310-100']
                                            ];
                                            const ws = XLSX.utils.aoa_to_sheet(template);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Modelo");
                                            XLSX.writeFile(wb, "modelo_importacao_clientes.xlsx");
                                        }}

                                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={14} /> Baixar Planilha Modelo
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${importLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}`}>
                                        {importLoading ? (
                                            <>
                                                <Loader2 size={32} className="text-primary animate-spin mb-3" />
                                                <p className="text-sm font-bold text-slate-700">Processando planilha...</p>
                                                <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns minutos para listas grandes.</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={32} className="text-slate-300 mb-3" />
                                                <p className="text-sm font-bold text-slate-700">Clique para selecionar ou arraste o arquivo</p>
                                                <p className="text-xs text-slate-400 mt-1">Suporta arquivos .xlsx e .csv</p>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".xlsx, .csv"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                setImportLoading(true);
                                                setImportStats(null);

                                                try {
                                                    const data: any[] = await new Promise((resolve, reject) => {
                                                        const reader = new FileReader();
                                                        reader.onload = (evt) => {
                                                            try {
                                                                const bstr = evt.target?.result;
                                                                const wb = XLSX.read(bstr, { type: 'binary' });
                                                                const ws = wb.Sheets[wb.SheetNames[0]];
                                                                resolve(XLSX.utils.sheet_to_json(ws));
                                                            } catch (err) { reject(err); }
                                                        };
                                                        reader.onerror = reject;
                                                        reader.readAsBinaryString(file);
                                                    });

                                                    const { success, errors } = await onImportClients(data);

                                                    setImportStats({ total: data.length, success, errors });
                                                } catch (error) {
                                                    console.error("Erro na importação:", error);
                                                } finally {
                                                    setImportLoading(false);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </label>

                                    {importStats && (
                                        <div className={`p-4 border rounded-2xl flex items-center gap-4 text-left animate-in fade-in slide-in-from-bottom-2 ${importStats.errors > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                                            <div className={`w-10 h-10 text-white rounded-full flex items-center justify-center shrink-0 ${importStats.errors > 0 ? 'bg-amber-500' : 'bg-green-500'}`}>
                                                <Check size={20} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${importStats.errors > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                                                    Importação Concluída!
                                                </p>
                                                <p className={`text-xs font-medium ${importStats.errors > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {importStats.success} importado(s) com sucesso
                                                    {importStats.errors > 0 && ` · ${importStats.errors} com erro (verifique o console)`}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
