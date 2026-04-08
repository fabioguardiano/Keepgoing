import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Download, ChevronRight, ChevronDown, CheckSquare, Square, ToggleLeft, ToggleRight, X, Check, AlertTriangle } from 'lucide-react';
import { AccountGroup, AccountPlanItem } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanoContasViewProps {
  groups: AccountGroup[];
  plan: AccountPlanItem[];
  loading: boolean;
  canEdit: boolean;
  onSaveGroup: (group: Partial<AccountGroup> & { code: number; name: string }) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onSavePlanItem: (item: Partial<AccountPlanItem> & { code: number; groupId: string; name: string; costType: 'Fixo' | 'Variável' }) => Promise<void>;
  onDeletePlanItem: (id: string) => Promise<void>;
  onTogglePlanActive: (id: string) => Promise<void>;
  onImportDefaults: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClass = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30';
const labelClass = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1';

const COST_TYPES = ['Fixo', 'Variável'] as const;
const PAYMENT_METHODS = ['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro', 'Cheque'];

// ─── Group Form ───────────────────────────────────────────────────────────────

interface GroupFormProps {
  initial?: Partial<AccountGroup>;
  usedCodes: number[];
  onSave: (g: Partial<AccountGroup> & { code: number; name: string }) => Promise<void>;
  onCancel: () => void;
}

const GroupForm: React.FC<GroupFormProps> = ({ initial, usedCodes, onSave, onCancel }) => {
  const [code, setCode]     = useState(initial?.code?.toString() ?? '');
  const [name, setName]     = useState(initial?.name ?? '');
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [saving, setSaving] = useState(false);

  const codeNum = parseInt(code);
  const codeConflict = !isNaN(codeNum) && usedCodes.includes(codeNum) && codeNum !== initial?.code;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || codeConflict) return;
    setSaving(true);
    await onSave({ id: initial?.id, code: codeNum, name: name.toUpperCase(), isAdmin });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 dark:text-white">{initial?.id ? 'Editar Grupo' : 'Novo Grupo'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Código</label>
          <input type="number" min={1} required className={inputClass} value={code}
            onChange={e => setCode(e.target.value)} placeholder="Ex: 4" />
          {codeConflict && <p className="text-[10px] text-red-500 mt-1">Código já usado</p>}
        </div>
        <div className="flex items-center gap-2 pt-5">
          <button type="button" onClick={() => setIsAdmin(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            {isAdmin ? <CheckSquare size={14} /> : <Square size={14} />} D.A.
          </button>
        </div>
      </div>
      <div>
        <label className={labelClass}>Descrição</label>
        <input required className={inputClass} value={name}
          onChange={e => setName(e.target.value)} placeholder="Ex: DESPESAS ADMINISTRATIVAS" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || codeConflict}
          className="flex-1 py-2 bg-[var(--primary-color)] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Check size={14} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
          <X size={14} />
        </button>
      </div>
    </form>
  );
};

// ─── Plan Item Form ───────────────────────────────────────────────────────────

interface PlanItemFormProps {
  initial?: Partial<AccountPlanItem>;
  groups: AccountGroup[];
  usedCodes: number[];
  onSave: (item: Partial<AccountPlanItem> & { code: number; groupId: string; name: string; costType: 'Fixo' | 'Variável' }) => Promise<void>;
  onCancel: () => void;
}

const PlanItemForm: React.FC<PlanItemFormProps> = ({ initial, groups, usedCodes, onSave, onCancel }) => {
  const [code, setCode]     = useState(initial?.code?.toString() ?? '');
  const [groupId, setGroupId] = useState(initial?.groupId ?? groups[0]?.id ?? '');
  const [name, setName]     = useState(initial?.name ?? '');
  const [costType, setCostType] = useState<'Fixo' | 'Variável'>(initial?.costType ?? 'Fixo');
  const [defPM, setDefPM]   = useState(initial?.defaultPaymentMethod ?? '');
  const [isOp, setIsOp]     = useState(initial?.isOperational ?? true);
  const [saving, setSaving] = useState(false);

  const codeNum = parseInt(code);
  const codeConflict = !isNaN(codeNum) && usedCodes.includes(codeNum) && codeNum !== initial?.code;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !groupId || !name || codeConflict) return;
    setSaving(true);
    await onSave({ id: initial?.id, code: codeNum, groupId, name, costType, defaultPaymentMethod: defPM || undefined, isOperational: isOp });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-[var(--primary-color)]/30 rounded-2xl p-5 space-y-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 dark:text-white">{initial?.id ? 'Editar Conta' : 'Nova Conta Analítica'}</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Código</label>
          <input type="number" required className={inputClass} value={code}
            onChange={e => setCode(e.target.value)} placeholder="Ex: 4010" />
          {codeConflict && <p className="text-[10px] text-red-500 mt-1">Código já usado</p>}
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Grupo</label>
          <select required className={inputClass} value={groupId} onChange={e => setGroupId(e.target.value)}>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Descrição da Conta</label>
        <input required className={inputClass} value={name}
          onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tipo de Custo</label>
          <div className="flex gap-2">
            {COST_TYPES.map(ct => (
              <button key={ct} type="button" onClick={() => setCostType(ct)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${costType === ct ? 'bg-[var(--primary-color)] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                {ct}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Meio de Pagamento Padrão</label>
          <select className={inputClass} value={defPM} onChange={e => setDefPM(e.target.value)}>
            <option value="">— Nenhum —</option>
            {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setIsOp(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isOp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {isOp ? <CheckSquare size={14} /> : <Square size={14} />} C.OP. (Conta Operacional)
        </button>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || codeConflict}
          className="flex-1 py-2 bg-[var(--primary-color)] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Check size={14} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
          <X size={14} />
        </button>
      </div>
    </form>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export const PlanoContasView: React.FC<PlanoContasViewProps> = ({
  groups, plan, loading, canEdit,
  onSaveGroup, onDeleteGroup,
  onSavePlanItem, onDeletePlanItem, onTogglePlanActive,
  onImportDefaults,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup]     = useState<AccountGroup | 'new' | null>(null);
  const [editingItem, setEditingItem]       = useState<AccountPlanItem | 'new' | null>(null);
  const [newItemGroupId, setNewItemGroupId] = useState<string | null>(null);
  const [filterOp, setFilterOp]             = useState<'all' | 'op' | 'non-op'>('all');
  const [filterCost, setFilterCost]         = useState<'all' | 'Fixo' | 'Variável'>('all');
  const [importing, setImporting]           = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState<{ type: 'group' | 'item'; id: string; name: string } | null>(null);

  const toggleGroup = (id: string) => setExpandedGroups(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const planByGroup = useMemo(() => {
    const map: Record<string, AccountPlanItem[]> = {};
    plan.forEach(p => {
      if (!map[p.groupId]) map[p.groupId] = [];
      map[p.groupId].push(p);
    });
    return map;
  }, [plan]);

  const filteredPlan = (groupId: string) => {
    return (planByGroup[groupId] ?? []).filter(p => {
      if (filterOp === 'op' && !p.isOperational) return false;
      if (filterOp === 'non-op' && p.isOperational) return false;
      if (filterCost !== 'all' && p.costType !== filterCost) return false;
      return true;
    });
  };

  const usedGroupCodes = groups.map(g => g.code);
  const usedPlanCodes  = plan.map(p => p.code);

  const handleImport = async () => {
    setImporting(true);
    await onImportDefaults();
    setImporting(false);
    setExpandedGroups(new Set(groups.map(g => g.id)));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Plano de Contas</h1>
          <p className="text-xs text-slate-400 mt-0.5">{groups.length} grupos · {plan.length} contas analíticas</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {groups.length === 0 && (
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black hover:opacity-90 transition-all disabled:opacity-50">
                <Download size={14} /> {importing ? 'Importando...' : 'Importar Padrão'}
              </button>
            )}
            <button onClick={() => { setEditingGroup('new'); setEditingItem(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">
              <Plus size={14} /> Novo Grupo
            </button>
            <button onClick={() => { setEditingItem('new'); setNewItemGroupId(groups[0]?.id ?? null); setEditingGroup(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary-color)] text-white rounded-xl text-xs font-black hover:opacity-90 transition-all">
              <Plus size={14} /> Nova Conta
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtrar:</span>
        {([['all', 'Todos'], ['op', 'Somente C.OP.'], ['non-op', 'Somente Não C.OP.']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilterOp(v)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterOp === v ? 'bg-[var(--primary-color)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
            {l}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
        {([['all', 'Todos os Tipos'], ['Fixo', 'Fixo'], ['Variável', 'Variável']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilterCost(v as any)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterCost === v ? 'bg-[var(--primary-color)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* New Group Form */}
      {editingGroup === 'new' && (
        <GroupForm usedCodes={usedGroupCodes} onSave={async g => { await onSaveGroup(g); setEditingGroup(null); }} onCancel={() => setEditingGroup(null)} />
      )}

      {/* New Plan Item Form (global) */}
      {editingItem === 'new' && (
        <PlanItemForm groups={groups} usedCodes={usedPlanCodes}
          onSave={async item => { await onSavePlanItem(item); setEditingItem(null); }}
          onCancel={() => setEditingItem(null)} />
      )}

      {/* Groups + Items */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Download size={40} className="mb-3 opacity-20" />
          <p className="font-black text-lg">Nenhum grupo cadastrado</p>
          <p className="text-sm mt-1">Clique em "Importar Padrão" para carregar a estrutura recomendada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const items = filteredPlan(group.id);
            const isExpanded = expandedGroups.has(group.id);
            const totalItems = (planByGroup[group.id] ?? []).length;

            return (
              <div key={group.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">

                {/* Group header */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <span className="text-[11px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">{group.code}</span>
                    <span className="text-sm font-black text-slate-700 dark:text-white">{group.name}</span>
                    {group.isAdmin && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">D.A.</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className="text-[10px] text-slate-400 font-bold">{totalItems} conta{totalItems !== 1 ? 's' : ''}</span>
                    {canEdit && (
                      <>
                        <button onClick={() => { setEditingGroup(group); setEditingItem(null); }}
                          className="p-1.5 text-slate-400 hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-all">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ type: 'group', id: group.id, name: group.name })}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={13} />
                        </button>
                        <button onClick={() => { setNewItemGroupId(group.id); setEditingItem('new'); setEditingGroup(null); }}
                          className="flex items-center gap-1 text-[10px] font-black text-[var(--primary-color)] hover:underline ml-1">
                          <Plus size={12} /> Conta
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline edit group form */}
                {editingGroup && editingGroup !== 'new' && (editingGroup as AccountGroup).id === group.id && (
                  <div className="px-5 pb-4">
                    <GroupForm initial={group} usedCodes={usedGroupCodes}
                      onSave={async g => { await onSaveGroup(g); setEditingGroup(null); }}
                      onCancel={() => setEditingGroup(null)} />
                  </div>
                )}

                {/* Items */}
                {isExpanded && (
                  <div className="border-t border-slate-50 dark:border-slate-700">

                    {/* New item inline for this group */}
                    {editingItem === 'new' && newItemGroupId === group.id && (
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <PlanItemForm groups={groups} usedCodes={usedPlanCodes}
                          initial={{ groupId: group.id }}
                          onSave={async item => { await onSavePlanItem(item); setEditingItem(null); }}
                          onCancel={() => setEditingItem(null)} />
                      </div>
                    )}

                    {/* Table header */}
                    {items.length > 0 && (
                      <div className="grid grid-cols-12 px-5 py-2 bg-slate-50 dark:bg-slate-700/40 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="col-span-1">Código</span>
                        <span className="col-span-4">Descrição</span>
                        <span className="col-span-2">Tipo</span>
                        <span className="col-span-2">Meio Pgto</span>
                        <span className="col-span-1 text-center">C.OP.</span>
                        <span className="col-span-1 text-center">Ativo</span>
                        <span className="col-span-1" />
                      </div>
                    )}

                    {items.length === 0 && (
                      <div className="px-5 py-4 text-xs text-slate-400 italic">
                        {(planByGroup[group.id] ?? []).length === 0
                          ? 'Nenhuma conta analítica neste grupo.'
                          : 'Nenhuma conta corresponde aos filtros ativos.'}
                      </div>
                    )}

                    {items.map(item => (
                      <div key={item.id}>
                        <div className={`grid grid-cols-12 items-center px-5 py-3 border-b border-slate-50 dark:border-slate-700/60 transition-all ${!item.active ? 'opacity-50' : ''}`}>
                          <span className="col-span-1 text-[11px] font-black text-slate-400">{item.code}</span>
                          <span className="col-span-4 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.name}</span>
                          <span className={`col-span-2 text-[10px] font-black px-2 py-0.5 rounded-full w-fit ${item.costType === 'Fixo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.costType}
                          </span>
                          <span className="col-span-2 text-[10px] text-slate-500 truncate">{item.defaultPaymentMethod || '—'}</span>
                          <span className="col-span-1 flex justify-center">
                            {item.isOperational
                              ? <CheckSquare size={14} className="text-emerald-500" />
                              : <Square size={14} className="text-slate-300" />}
                          </span>
                          <span className="col-span-1 flex justify-center">
                            <button onClick={() => onTogglePlanActive(item.id)} title={item.active ? 'Desativar' : 'Ativar'}>
                              {item.active
                                ? <ToggleRight size={18} className="text-emerald-500" />
                                : <ToggleLeft size={18} className="text-slate-300" />}
                            </button>
                          </span>
                          {canEdit && (
                            <div className="col-span-1 flex justify-end gap-1">
                              <button onClick={() => { setEditingItem(item); setEditingGroup(null); }}
                                className="p-1 text-slate-400 hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-all">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => setDeleteConfirm({ type: 'item', id: item.id, name: item.name })}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Inline edit item form */}
                        {editingItem && editingItem !== 'new' && (editingItem as AccountPlanItem).id === item.id && (
                          <div className="px-5 pb-4 pt-2 bg-slate-50 dark:bg-slate-700/30">
                            <PlanItemForm groups={groups} usedCodes={usedPlanCodes} initial={item}
                              onSave={async i => { await onSavePlanItem(i); setEditingItem(null); }}
                              onCancel={() => setEditingItem(null)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={20} />
              <span className="font-black text-sm">Confirmar exclusão</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja excluir {deleteConfirm.type === 'group' ? 'o grupo' : 'a conta'} <strong>"{deleteConfirm.name}"</strong>?
              {deleteConfirm.type === 'group' && <span className="block mt-1 text-red-500 text-xs">Atenção: o grupo só pode ser excluído se não houver contas vinculadas.</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (deleteConfirm.type === 'group') await onDeleteGroup(deleteConfirm.id);
                else await onDeletePlanItem(deleteConfirm.id);
                setDeleteConfirm(null);
              }} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:opacity-90">
                Excluir
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
