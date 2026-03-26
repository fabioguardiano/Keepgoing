import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Plus, Briefcase, Calendar, Layers, User, ChevronDown, Trash2, Clock, ZoomIn, Lock, Pencil, XCircle, AlertTriangle } from 'lucide-react';
import { WorkOrder, WorkOrderLog, PhaseConfig, AppUser } from '../types';
import { formatOsLabel } from '../hooks/useWorkOrders';

interface WorkOrderModalProps {
  workOrder: WorkOrder;
  allWorkOrders: WorkOrder[];
  phases: PhaseConfig[];
  appUsers: AppUser[];
  currentUserName: string;
  onUpdatePhase: (id: string, toPhase: string, fromPhase: string, userName: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onUpdateDeliveryDate: (id: string, newDate: string, justification: string, authorizedBy: string) => Promise<void>;
  onCancelWorkOrder: (id: string, reason: string, authorizedBy: string) => Promise<void>;
  canCancelOS: boolean;
  canEditDeadline: boolean;
  onAddDrawing: (id: string, file: File) => Promise<void>;
  onDeleteDrawing: (id: string, url: string) => Promise<void>;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const diffH = (Date.now() - date.getTime()) / 3600000;
  if (diffH < 1) return 'agora';
  if (diffH < 24) return `${Math.floor(diffH)}h atrás`;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const PRIORITY_CONFIG = {
  alta:  { label: 'Alta',  bg: 'bg-red-500',   text: 'text-white' },
  media: { label: 'Média', bg: 'bg-amber-400',  text: 'text-white' },
  baixa: { label: 'Baixa', bg: 'bg-green-500',  text: 'text-white' },
};

const getInitials = (name: string) => name.trim().slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  'bg-blue-500','bg-purple-500','bg-pink-500','bg-indigo-500',
  'bg-teal-500','bg-orange-500','bg-cyan-500','bg-rose-500',
];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const LogEntry: React.FC<{ log: WorkOrderLog }> = ({ log }) => {
  let message = '';
  if (log.action === 'phase_changed') {
    message = `Movido de "${log.fromPhase || '—'}" para "${log.toPhase || '—'}"`;
  } else if (log.action === 'created') {
    message = `O.S. criada${log.environment ? ` — ${log.environment}` : ''}`;
  } else if (log.action === 'reissued') {
    message = `Reemissão: ${log.reason || ''}${log.environment ? ` — ${log.environment}` : ''}`;
  } else if (log.action === 'deadline_changed') {
    message = `Prazo alterado — ${log.reason || ''}`;
  } else if (log.action === 'cancelled') {
    message = `O.S. cancelada — ${log.reason || ''}`;
  } else {
    message = log.action;
  }
  return (
    <div className="flex gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-[var(--primary-color)] mt-1.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 font-medium leading-snug">{message}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {log.userName && <span className="font-medium text-gray-500">{log.userName} · </span>}
          {formatRelativeTime(log.createdAt)}
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CANCEL_REASONS = [
  'Erro de medição',
  'Alteração solicitada pelo cliente',
  'Material danificado',
  'Pedido cancelado pelo cliente',
  'Duplicidade',
  'Outro',
];

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  workOrder, allWorkOrders, phases, appUsers, currentUserName,
  onUpdatePhase, onUpdate, onUpdateDeliveryDate, onCancelWorkOrder, canCancelOS, canEditDeadline,
  onAddDrawing, onDeleteDrawing, onClose,
}) => {
  const [localNotes, setLocalNotes] = useState(workOrder.notes || '');
  const [uploading, setUploading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPhaseDropdown, setShowPhaseDropdown] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingDeadline, setEditingDeadline] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState(workOrder.deliveryDate || '');
  const [deadlineJustification, setDeadlineJustification] = useState('');
  const [deadlinePassword, setDeadlinePassword] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonFree, setCancelReasonFree] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const currentPhase = workOrder.productionPhase || phases[0]?.name || '';
  const sortedLogs = [...(workOrder.logs || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const drawings = workOrder.drawingUrls || [];
  const assignedNames = new Set((workOrder.assignedUsers || []).map(u => u.name));
  const availableUsers = appUsers.filter(u => !assignedNames.has(u.name));

  const handlePhaseSelect = (name: string) => {
    if (name !== currentPhase) onUpdatePhase(workOrder.id, name, currentPhase, currentUserName);
    setShowPhaseDropdown(false);
  };

  const handleNotesBlur = () => {
    if (localNotes !== workOrder.notes) onUpdate(workOrder.id, { notes: localNotes });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onAddDrawing(workOrder.id, file);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUser = (user: AppUser) => {
    const updated = [...(workOrder.assignedUsers || []), { name: user.name, role: user.role }];
    onUpdate(workOrder.id, { assignedUsers: updated });
    setShowUserDropdown(false);
  };

  const handleRemoveUser = (name: string) => {
    onUpdate(workOrder.id, { assignedUsers: (workOrder.assignedUsers || []).filter(u => u.name !== name) });
  };

  const osLabel = formatOsLabel(workOrder, allWorkOrders);

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="Desenho" className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain" />
            {/* Watermark — visível apenas ao imprimir */}
            <div className="absolute inset-0 hidden print:flex items-center justify-center pointer-events-none rounded-xl overflow-hidden">
              <span style={{
                transform: 'rotate(-45deg)',
                color: 'rgba(185,28,28,0.50)',
                fontSize: '28px',
                fontWeight: 900,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                border: '3px solid rgba(185,28,28,0.35)',
                padding: '8px 20px',
              }}>
                CÓPIA NÃO OFICIAL<br/>USE O DESENHO ORIGINAL
              </span>
            </div>
          </div>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors">
            <X size={22} />
          </button>
        </div>
      )}

      <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--primary-color)] text-white flex-shrink-0">
                <Briefcase size={18} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">{osLabel}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Criado em {formatDate(workOrder.createdAt)}</p>
              </div>
              {workOrder.status === 'Cancelada' && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-700 text-sm font-black">
                  <XCircle size={14} /> CANCELADA
                </span>
              )}
              {/* Phase selector */}
              {workOrder.status !== 'Cancelada' && <div className="relative">
                <button
                  onClick={() => setShowPhaseDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary-color)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {currentPhase || 'Sem fase'} <ChevronDown size={14} />
                </button>
                {showPhaseDropdown && (
                  <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 z-10 min-w-[180px] py-1 overflow-hidden">
                    {phases.map(ph => (
                      <button key={ph.name} onClick={() => handlePhaseSelect(ph.name)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${ph.name === currentPhase ? 'font-bold text-[var(--primary-color)]' : 'text-gray-700'}`}>
                        {ph.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>}
            </div>
            <div className="flex items-center gap-2">
              {/* Priority */}
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 overflow-hidden">
                {(['alta', 'media', 'baixa'] as const).map(p => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button key={p} onClick={() => onUpdate(workOrder.id, { priority: p })}
                      className={`px-3 py-1.5 text-xs font-bold transition-all ${workOrder.priority === p ? `${cfg.bg} ${cfg.text}` : 'text-gray-400 hover:bg-gray-50'}`}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* LEFT PANEL */}
              <div className="p-6 space-y-6">

                {/* Informações do Projeto */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Informações do Projeto</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="font-semibold">{workOrder.clientName || '—'}</span>
                    </div>
                    {workOrder.environments.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-gray-500">
                        <Layers size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <span>{workOrder.environments.join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{formatDate(workOrder.createdAt)}</span>
                    </div>
                    {workOrder.deliveryDate && !editingDeadline && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={14} className="text-gray-400 flex-shrink-0" />
                        <span>
                          Entrega: <strong className="text-gray-700">{formatDate(workOrder.deliveryDate + 'T12:00:00')}</strong>
                          {workOrder.deliveryDeadline && parseInt(workOrder.deliveryDeadline) > 0 && (
                            <span className="text-xs text-gray-400 ml-1">({workOrder.deliveryDeadline} dias úteis)</span>
                          )}
                        </span>
                        {canEditDeadline && (
                          <button
                            onClick={() => { setNewDeliveryDate(workOrder.deliveryDate || ''); setEditingDeadline(true); }}
                            className="ml-auto p-1 text-gray-400 hover:text-[var(--primary-color)] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Alterar prazo"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    )}
                    {editingDeadline && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-amber-700 text-xs font-black">
                          <Lock size={12} /> Alterar prazo de entrega
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Nova data de entrega</label>
                          <input
                            type="date"
                            value={newDeliveryDate}
                            onChange={e => setNewDeliveryDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Justificativa</label>
                          <input
                            type="text"
                            value={deadlineJustification}
                            onChange={e => setDeadlineJustification(e.target.value)}
                            placeholder="Motivo da alteração..."
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                            <Lock size={10} className="inline mr-1" />Senha de autorização
                          </label>
                          <input
                            type="password"
                            value={deadlinePassword}
                            onChange={e => setDeadlinePassword(e.target.value)}
                            placeholder="Senha"
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <button
                            onClick={() => { setEditingDeadline(false); setDeadlineJustification(''); setDeadlinePassword(''); }}
                            className="flex-1 py-1.5 text-xs font-bold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            disabled={savingDeadline || !newDeliveryDate || !deadlineJustification || !deadlinePassword}
                            onClick={async () => {
                              setSavingDeadline(true);
                              await onUpdateDeliveryDate(workOrder.id, newDeliveryDate, deadlineJustification, deadlinePassword);
                              setSavingDeadline(false);
                              setEditingDeadline(false);
                              setDeadlineJustification('');
                              setDeadlinePassword('');
                            }}
                            className="flex-1 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {savingDeadline ? 'Salvando...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    )}
                    {workOrder.saleOrderNumber && (
                      <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-bold rounded-lg">
                        Pedido #{workOrder.saleOrderNumber}
                      </div>
                    )}
                  </div>
                </section>

                {/* Metragens */}
                {(workOrder.materialsM2.length > 0 || workOrder.finishingsLinear.length > 0) && (
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Metragens</h3>
                    <div className="space-y-1.5">
                      {workOrder.materialsM2.map((m, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 truncate">{m.materialName}</span>
                          <span className="font-semibold text-gray-800 ml-2 flex-shrink-0">{m.totalM2.toFixed(4)} m²</span>
                        </div>
                      ))}
                      {workOrder.finishingsLinear.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 truncate">{f.itemName}</span>
                          <span className="font-semibold text-gray-800 ml-2 flex-shrink-0">{f.totalLinear.toFixed(3)} m lin.</span>
                        </div>
                      ))}
                      {workOrder.totalM2 > 0 && (
                        <div className="pt-1.5 border-t border-gray-100 flex justify-between text-sm font-bold text-gray-800">
                          <span>Total m²</span>
                          <span>{workOrder.totalM2.toFixed(4)} m²</span>
                        </div>
                      )}
                      {workOrder.totalLinear > 0 && (
                        <div className="flex justify-between text-sm font-bold text-gray-800">
                          <span>Total linear</span>
                          <span>{workOrder.totalLinear.toFixed(3)} m lin.</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Desenhos Técnicos */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Desenhos Técnicos / Fotos OS</h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary-color)] text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      {uploading ? 'Enviando...' : 'Adicionar'}
                    </button>
                  </div>

                  {drawings.length === 0 ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ImageIcon size={24} />
                      <span className="text-xs font-medium">Clique para enviar imagem</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {drawings.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                          <img src={url} alt={`Desenho ${idx + 1}`} className="w-full h-full object-cover" />
                          {/* Watermark — visível apenas ao imprimir */}
                          <div className="absolute inset-0 hidden print:flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
                            <span style={{
                              transform: 'rotate(-45deg)',
                              color: 'rgba(185,28,28,0.55)',
                              fontSize: '9px',
                              fontWeight: 900,
                              textAlign: 'center',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              lineHeight: 1.4,
                              whiteSpace: 'nowrap',
                              border: '1.5px solid rgba(185,28,28,0.4)',
                              padding: '2px 6px',
                            }}>
                              CÓPIA NÃO OFICIAL<br/>USE O DESENHO ORIGINAL
                            </span>
                          </div>
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => setLightbox(url)}
                              className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white transition-colors"
                              title="Ver em tela cheia"
                            >
                              <ZoomIn size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteDrawing(workOrder.id, url)}
                              className="p-1.5 bg-white/90 rounded-lg text-red-500 hover:bg-white transition-colors"
                              title="Remover desenho"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </section>

                {/* Observações */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Observações</h3>
                  <textarea
                    value={localNotes}
                    onChange={e => setLocalNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Adicione observações sobre esta O.S..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                  />
                </section>
              </div>

              {/* RIGHT PANEL */}
              <div className="p-6 space-y-6">
                {/* Atividade Recente */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Atividade Recente</h3>
                  {sortedLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Nenhuma atividade registrada.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {sortedLogs.map(log => <LogEntry key={log.id} log={log} />)}
                    </div>
                  )}
                </section>

                {/* Responsáveis */}
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Responsáveis</h3>
                  <div className="space-y-2">
                    {(workOrder.assignedUsers || []).length === 0 && (
                      <p className="text-sm text-gray-400 italic">Nenhum responsável atribuído.</p>
                    )}
                    {(workOrder.assignedUsers || []).map(u => (
                      <div key={u.name} className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(u.name)}`}>
                          {getInitials(u.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                          {u.role && <p className="text-xs text-gray-400 truncate">{u.role}</p>}
                        </div>
                        <button onClick={() => handleRemoveUser(u.name)} className="p-1 text-gray-300 hover:text-red-400 rounded-lg transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="relative mt-2">
                      <button
                        onClick={() => setShowUserDropdown(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] transition-colors"
                      >
                        <Plus size={14} /> Adicionar responsável
                      </button>
                      {showUserDropdown && (
                        <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 z-10 min-w-[220px] py-1 max-h-48 overflow-y-auto">
                          {availableUsers.length === 0 ? (
                            <p className="px-4 py-2 text-sm text-gray-400 italic">Todos adicionados</p>
                          ) : availableUsers.map(u => (
                            <button key={u.id} onClick={() => handleAddUser(u)}
                              className="w-full text-left flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-colors">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(u.name)}`}>
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-700 truncate">{u.name}</p>
                                {u.role && <p className="text-xs text-gray-400 truncate">{u.role}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            {canCancelOS && workOrder.status !== 'Cancelada' ? (
              <button
                onClick={() => setShowCancelForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
              >
                <XCircle size={15} /> Cancelar O.S.
              </button>
            ) : <div />}
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[var(--primary-color)] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm">
              Fechar e Salvar
            </button>
          </div>
        </div>
      </div>

      {/* Cancel form overlay */}
      {showCancelForm && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b bg-red-50 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-black text-red-800 text-base">Cancelar O.S.</h3>
                <p className="text-xs text-red-600 mt-0.5">Esta ação é irreversível. Registre o motivo e a autorização.</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Motivo do cancelamento</label>
                <select
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Selecione o motivo...</option>
                  {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {cancelReason === 'Outro' && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Descreva o motivo</label>
                  <textarea
                    value={cancelReasonFree}
                    onChange={e => setCancelReasonFree(e.target.value)}
                    rows={2}
                    placeholder="Descreva o motivo..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">
                  <Lock size={10} className="inline mr-1" />Cancelado por
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700 font-semibold">
                  {currentUserName}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => { setShowCancelForm(false); setCancelReason(''); setCancelReasonFree(''); }}
                className="flex-1 py-2.5 text-sm font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
              >
                Voltar
              </button>
              <button
                disabled={cancelling || !cancelReason || (cancelReason === 'Outro' && !cancelReasonFree)}
                onClick={async () => {
                  const reason = cancelReason === 'Outro' ? cancelReasonFree : cancelReason;
                  setCancelling(true);
                  await onCancelWorkOrder(workOrder.id, reason, currentUserName);
                  setCancelling(false);
                  setShowCancelForm(false);
                  onClose();
                }}
                className="flex-1 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
