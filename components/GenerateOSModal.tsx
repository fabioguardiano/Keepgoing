import React, { useState, useMemo } from 'react';
import { X, Plus, AlertTriangle, Ruler, Package, CheckSquare, Square, Trash2, FileText, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { SalesOrder, WorkOrder, WorkOrderMaterialM2, WorkOrderFinishingLinear, OrderItem } from '../types';

const calcMetrics = (items: OrderItem[], itemIds: string[]) => {
  const filtered = items.filter(i => itemIds.includes(i.id));
  const m2Map: Record<string, WorkOrderMaterialM2> = {};
  const linMap: Record<string, WorkOrderFinishingLinear> = {};
  const resaleProducts: Array<{ description: string; quantity: number; unit: string }> = [];

  filtered.forEach(item => {
    if (item.category === 'Produtos de Revenda') {
      resaleProducts.push({
        description: item.description || 'Produto de Revenda',
        quantity: item.quantity,
        unit: item.unit || 'un'
      });
    } else if (item.category === 'Acabamentos') {
      const unit = (item.unit || 'ML').toUpperCase();
      const key = item.description || item.materialName || 'Acabamento';
      if (!linMap[key]) linMap[key] = { itemName: item.description || key, materialName: item.materialName, totalLinear: 0, totalQty: 0, unit };
      if (unit === 'ML') {
        // Para ML, quantity já é o total em metros (length=1 internamente)
        linMap[key].totalLinear = Math.round((linMap[key].totalLinear + item.quantity * (item.length || 1)) * 10000) / 10000;
      } else {
        // Para UND e outras unidades, acumula apenas quantidade
        linMap[key].totalQty += item.quantity;
      }
    } else if ((item.m2 || 0) > 0) {
      const key = item.materialName || 'Sem Material';
      if (!m2Map[key]) m2Map[key] = { materialName: item.materialName || key, materialId: item.materialId, totalM2: 0 };
      m2Map[key].totalM2 = Math.round((m2Map[key].totalM2 + item.m2!) * 10000) / 10000;
    }
  });

  const materialsM2 = Object.values(m2Map);
  const finishingsLinear = Object.values(linMap);
  return {
    materialsM2,
    finishingsLinear,
    resaleProducts,
    totalM2: Math.round(materialsM2.reduce((a, x) => a + x.totalM2, 0) * 10000) / 10000,
    totalLinear: Math.round(finishingsLinear.reduce((a, x) => a + (x.unit === 'ML' ? x.totalLinear : 0), 0) * 10000) / 10000,
    totalQty: finishingsLinear.reduce((a, x) => a + (x.unit !== 'ML' ? x.totalQty : 0), 0),
  };
};

const fmtDim = (item: OrderItem) => {
  const l = item.length ? item.length.toFixed(2).replace('.', ',') : null;
  const w = item.width ? item.width.toFixed(2).replace('.', ',') : null;
  if (l && w) return `${l} × ${w} m`;
  if (l) return `${l} m`;
  return null;
};

const fmtM2 = (v: number) => v.toFixed(4).replace('.', ',') + ' m²';
const fmtLin = (v: number) => v.toFixed(3).replace('.', ',') + ' m';

export interface OSGroup {
  id: string;
  environments: string[];
  saleItemIds: string[];
  notes: string;
  materialsM2: WorkOrderMaterialM2[];
  finishingsLinear: WorkOrderFinishingLinear[];
  totalM2: number;
  totalLinear: number;
  resaleProducts?: Array<{ description: string; quantity: number; unit: string }>;
  items: OrderItem[];
  logs: Array<{ environment: string; action: 'created' | 'reissued'; reason?: string; userName?: string }>;
}

interface ReissueForm {
  environment: string;
  password: string;
  reason: string;
}

interface Props {
  sale: SalesOrder;
  companyId: string;
  existingOSMap: Record<string, WorkOrder[]>;
  onConfirm: (groups: OSGroup[]) => Promise<void>;
  onClose: () => void;
}

export const GenerateOSModal: React.FC<Props> = ({ sale, existingOSMap, onConfirm, onClose }) => {
  const allItems = sale.items || [];

  const itemsByEnv = useMemo(() => {
    const map: Record<string, OrderItem[]> = {};
    allItems.forEach(item => {
      const env = item.environment || 'Sem Ambiente';
      if (!map[env]) map[env] = [];
      map[env].push(item);
    });
    return map;
  }, [allItems]);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<OSGroup[]>([]);
  const [saving, setSaving] = useState(false);

  const [reissueQueue, setReissueQueue] = useState<string[]>([]);
  const [reissueForms, setReissueForms] = useState<Record<string, ReissueForm>>({});
  const [pendingItemIds, setPendingItemIds] = useState<string[] | null>(null);

  const REISSUE_REASONS = ['Retrabalho', 'Complemento', 'Alteração por parte do cliente', 'Outro'];

  const assignedItemIds = useMemo(() => new Set(groups.flatMap(g => g.saleItemIds)), [groups]);

  const availableEnvs = useMemo(() =>
    Object.keys(itemsByEnv).filter(env => itemsByEnv[env].some(i => !assignedItemIds.has(i.id))),
    [itemsByEnv, assignedItemIds]
  );

  const envSelectionState = (env: string): 'all' | 'partial' | 'none' => {
    const availItems = itemsByEnv[env]?.filter(i => !assignedItemIds.has(i.id)) || [];
    if (availItems.length === 0) return 'none';
    const selectedCount = availItems.filter(i => selectedItemIds.has(i.id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === availItems.length) return 'all';
    return 'partial';
  };

  const toggleEnv = (env: string) => {
    const availItems = itemsByEnv[env]?.filter(i => !assignedItemIds.has(i.id)) || [];
    const state = envSelectionState(env);
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (state === 'all') {
        availItems.forEach(i => next.delete(i.id));
      } else {
        availItems.forEach(i => next.add(i.id));
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleExpandEnv = (env: string) => {
    setExpandedEnvs(prev => {
      const next = new Set(prev);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return next;
    });
  };

  const handleAddGroup = () => {
    if (selectedItemIds.size === 0) return;
    const selectedItems = allItems.filter(i => selectedItemIds.has(i.id));
    const envs = Array.from(new Set(selectedItems.map(i => i.environment || 'Sem Ambiente')));
    const needsReissue = envs.filter(env => existingOSMap[env]?.length > 0);

    if (needsReissue.length > 0) {
      setPendingItemIds(Array.from(selectedItemIds));
      setReissueQueue(needsReissue);
      const forms: Record<string, ReissueForm> = {};
      needsReissue.forEach(env => { forms[env] = { environment: env, password: '', reason: '' }; });
      setReissueForms(forms);
    } else {
      createGroup(Array.from(selectedItemIds), []);
    }
  };

  const createGroup = (
    itemIds: string[],
    reissueLogs: Array<{ environment: string; action: 'created' | 'reissued'; reason?: string; userName?: string }>,
  ) => {
    const items = allItems.filter(i => itemIds.includes(i.id));
    const metrics = calcMetrics(allItems, itemIds);
    const envs = Array.from(new Set(items.map(i => i.environment || 'Sem Ambiente')));
    const normalLogs = envs
      .filter(env => !reissueLogs.find(l => l.environment === env))
      .map(env => ({ environment: env, action: 'created' as const }));
    const newGroup: OSGroup = {
      id: crypto.randomUUID(),
      environments: envs,
      saleItemIds: itemIds,
      notes: '',
      ...metrics,
      items,
      logs: [...normalLogs, ...reissueLogs],
    };
    setGroups(prev => [...prev, newGroup]);
    setSelectedItemIds(new Set());
    setPendingItemIds(null);
    setReissueQueue([]);
    setReissueForms({});
  };

  const confirmReissues = () => {
    if (!pendingItemIds) return;
    for (const env of reissueQueue) {
      const form = reissueForms[env];
      if (!form.password || !form.reason) {
        alert(`Preencha senha e motivo para o ambiente "${env}"`);
        return;
      }
    }
    const reissueLogs = reissueQueue.map(env => ({
      environment: env,
      action: 'reissued' as const,
      reason: reissueForms[env].reason,
      userName: reissueForms[env].password,
    }));
    createGroup(pendingItemIds, reissueLogs);
  };

  const removeItemFromGroup = (groupId: string, itemId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const newItemIds = g.saleItemIds.filter(id => id !== itemId);
      if (newItemIds.length === 0) return null as any;
      const items = allItems.filter(i => newItemIds.includes(i.id));
      const envs = Array.from(new Set(items.map(i => i.environment || 'Sem Ambiente')));
      const metrics = calcMetrics(allItems, newItemIds);
      const logs = g.logs.filter(l => envs.includes(l.environment));
      return { ...g, saleItemIds: newItemIds, environments: envs, ...metrics, logs };
    }).filter(Boolean));
  };

  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleConfirm = async () => {
    if (groups.length === 0) return;
    setSaving(true);
    try {
      await onConfirm(groups);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedItemIds.size;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Gerar O.S. de Produção</h2>
            <p className="text-xs text-slate-500 mt-0.5">Pedido #{sale.orderNumber} · {sale.clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Reissue confirmation panel */}
          {reissueQueue.length > 0 && pendingItemIds && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle size={18} />
                <span className="font-black text-sm">Reemissão necessária — os ambientes abaixo já possuem O.S.</span>
              </div>
              {reissueQueue.map(env => (
                <div key={env} className="bg-white dark:bg-slate-800 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-black text-slate-700 dark:text-white">Ambiente: {env}</p>
                  <p className="text-xs text-slate-500">O.S. existente(s): {existingOSMap[env]?.map(wo => `#${wo.osNumber}`).join(', ')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        <Lock size={10} className="inline mr-1" />Senha de autorização
                      </label>
                      <input
                        type="password"
                        value={reissueForms[env]?.password || ''}
                        onChange={e => setReissueForms(prev => ({ ...prev, [env]: { ...prev[env], password: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Senha"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Motivo da reemissão</label>
                      <select
                        value={reissueForms[env]?.reason || ''}
                        onChange={e => setReissueForms(prev => ({ ...prev, [env]: { ...prev[env], reason: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="">Selecione o motivo...</option>
                        {REISSUE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setPendingItemIds(null); setReissueQueue([]); setReissueForms({}); setSelectedItemIds(new Set()); }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReissues}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all"
                >
                  Confirmar reemissão
                </button>
              </div>
            </div>
          )}

          {/* Item picker */}
          {availableEnvs.length > 0 && !reissueQueue.length && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Peças disponíveis — selecione para agrupar em uma O.S.
              </p>
              <div className="space-y-2 mb-4">
                {availableEnvs.map(env => {
                  const hasOS = existingOSMap[env]?.length > 0;
                  const state = envSelectionState(env);
                  const isExpanded = expandedEnvs.has(env);
                  const availItems = itemsByEnv[env]?.filter(i => !assignedItemIds.has(i.id)) || [];

                  return (
                    <div key={env} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* Env header */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button onClick={() => toggleEnv(env)} className="flex-shrink-0 p-0.5">
                          {state === 'all'
                            ? <CheckSquare size={17} className="text-[var(--primary-color)]" />
                            : state === 'partial'
                            ? (
                              <div className="w-[17px] h-[17px] border-2 border-[var(--primary-color)] rounded flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-[var(--primary-color)]" />
                              </div>
                            )
                            : <Square size={17} className="text-slate-300" />
                          }
                        </button>
                        <button onClick={() => toggleEnv(env)} className="flex-1 text-left font-black text-sm text-slate-700 dark:text-slate-200">
                          {env}
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {availItems.length} peça{availItems.length !== 1 ? 's' : ''}
                        </span>
                        {hasOS && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />}
                        <button onClick={() => toggleExpandEnv(env)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all flex-shrink-0">
                          {isExpanded
                            ? <ChevronDown size={15} className="text-slate-400" />
                            : <ChevronRight size={15} className="text-slate-400" />
                          }
                        </button>
                      </div>

                      {/* Items list */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
                          {availItems.map(item => {
                            const isSelected = selectedItemIds.has(item.id);
                            const dim = fmtDim(item);
                            return (
                              <button
                                key={item.id}
                                onClick={() => toggleItem(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                  isSelected ? 'bg-[var(--primary-color)]/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                              >
                                {isSelected
                                  ? <CheckSquare size={15} className="text-[var(--primary-color)] flex-shrink-0" />
                                  : <Square size={15} className="text-slate-300 flex-shrink-0" />
                                }
                                <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                  {item.description}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-shrink-0">
                                  {item.materialName && (
                                    <span className="text-slate-500 font-medium">{item.materialName}</span>
                                  )}
                                  {dim && <span className="font-mono">{dim}</span>}
                                  {(item.m2 || 0) > 0 && (
                                    <span className="font-black text-slate-600 dark:text-slate-300">{fmtM2(item.m2!)}</span>
                                  )}
                                  {item.quantity > 1 && (
                                    <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">{item.quantity}x</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleAddGroup}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Nova O.S. com {selectedCount} peça{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {availableEnvs.length === 0 && groups.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <FileText size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold">Nenhuma peça disponível</p>
            </div>
          )}

          {/* OS Groups */}
          {groups.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">O.S. a gerar ({groups.length})</p>
              {groups.map((group, idx) => {
                const groupItems = allItems.filter(i => group.saleItemIds.includes(i.id));
                const itemsByEnvInGroup: Record<string, OrderItem[]> = {};
                groupItems.forEach(item => {
                  const env = item.environment || 'Sem Ambiente';
                  if (!itemsByEnvInGroup[env]) itemsByEnvInGroup[env] = [];
                  itemsByEnvInGroup[env].push(item);
                });

                return (
                  <div key={group.id} className="bg-white dark:bg-slate-800 border-2 border-[var(--primary-color)]/20 rounded-2xl overflow-hidden">
                    {/* Group header */}
                    <div className="px-5 py-3 bg-[var(--primary-color)]/5 border-b border-[var(--primary-color)]/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-[var(--primary-color)]">O.S. #{idx + 1} (provisório)</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                          {group.saleItemIds.length} peça{group.saleItemIds.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button onClick={() => removeGroup(group.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Items grouped by env */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Peças incluídas</p>
                        <div className="space-y-3">
                          {Object.entries(itemsByEnvInGroup).map(([env, envItems]) => {
                            const isReissued = group.logs.find(l => l.environment === env && l.action === 'reissued');
                            return (
                              <div key={env}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">{env}</span>
                                  {isReissued && (
                                    <AlertTriangle size={11} className="text-amber-500" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {envItems.map(item => {
                                    const dim = fmtDim(item);
                                    return (
                                      <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg group/item">
                                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                          {item.description}
                                        </span>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-shrink-0">
                                          {item.materialName && <span>{item.materialName}</span>}
                                          {dim && <span className="font-mono">{dim}</span>}
                                          {(item.m2 || 0) > 0 ? (
                                            <span className="font-black text-slate-600 dark:text-slate-300">{fmtM2(item.m2!)}</span>
                                          ) : (item.length || 0) > 0 && (
                                            <span className="font-black text-slate-600 dark:text-slate-300">{fmtLin(item.quantity * item.length!)}</span>
                                          )}
                                          {item.quantity > 1 && (
                                            <span className="bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded font-bold">{item.quantity}x</span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => removeItemFromGroup(group.id, item.id)}
                                          className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1 opacity-0 group-hover/item:opacity-100"
                                          title="Remover peça desta O.S."
                                        >
                                          <X size={13} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        {group.materialsM2.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                              <Ruler size={12} /> Metragem Quadrada
                            </div>
                            {group.materialsM2.map(m => (
                              <div key={m.materialName} className="flex justify-between text-xs py-0.5">
                                <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{m.materialName}</span>
                                <span className="font-black text-slate-800 dark:text-white ml-2">{fmtM2(m.totalM2)}</span>
                              </div>
                            ))}
                            <div className="border-t border-slate-200 dark:border-slate-600 mt-1.5 pt-1.5 flex justify-between text-xs font-black">
                              <span className="text-slate-500">Total</span>
                              <span className="text-[var(--primary-color)]">{fmtM2(group.totalM2)}</span>
                            </div>
                          </div>
                        )}
                        {group.finishingsLinear.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                              <Package size={12} /> Metragem Linear
                            </div>
                            {group.finishingsLinear.map(f => (
                              <div key={f.itemName} className="flex justify-between text-xs py-0.5">
                                <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{f.itemName}</span>
                                <span className="font-black text-slate-800 dark:text-white ml-2">{fmtLin(f.totalLinear)}</span>
                              </div>
                            ))}
                            <div className="border-t border-slate-200 dark:border-slate-600 mt-1.5 pt-1.5 flex justify-between text-xs font-black">
                              <span className="text-slate-500">Total</span>
                              <span className="text-blue-600">{fmtLin(group.totalLinear)}</span>
                            </div>
                          </div>
                        )}
                        {group.resaleProducts && group.resaleProducts.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                              <Package size={12} /> Produtos de Revenda
                            </div>
                            {group.resaleProducts.map((p, i) => (
                              <div key={i} className="flex justify-between text-xs py-0.5">
                                <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{p.description}</span>
                                <span className="font-black text-slate-800 dark:text-white ml-2">{p.quantity} {p.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {group.materialsM2.length === 0 && group.finishingsLinear.length === 0 && (!group.resaleProducts || group.resaleProducts.length === 0) && (
                          <div className="col-span-2 text-xs text-slate-400 italic">Nenhuma metragem calculada para este grupo.</div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Observações da O.S.</label>
                        <textarea
                          value={group.notes}
                          onChange={e => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, notes: e.target.value } : g))}
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 resize-none font-medium"
                          placeholder="Observações para a produção..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400 font-medium">
            {groups.length > 0 ? `${groups.length} O.S. pronta(s) para gerar` : 'Selecione peças e crie grupos acima'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={groups.length === 0 || saving}
              className="px-6 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? 'Gerando...' : `Gerar ${groups.length} O.S.`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
