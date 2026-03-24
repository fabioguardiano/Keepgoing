import React, { useState } from 'react';
import { X, Plus, AlertTriangle, Ruler, Package, CheckSquare, Square, Trash2, FileText, Lock } from 'lucide-react';
import { SalesOrder, WorkOrder, WorkOrderMaterialM2, WorkOrderFinishingLinear, OrderItem } from '../types';

const calcMetrics = (items: OrderItem[], envs: string[]) => {
  const filtered = items.filter(i => envs.includes(i.environment || 'Sem Ambiente'));
  const m2Map: Record<string, WorkOrderMaterialM2> = {};
  const linMap: Record<string, WorkOrderFinishingLinear> = {};
  filtered.forEach(item => {
    if ((item.m2 || 0) > 0) {
      const key = item.materialName || 'Sem Material';
      if (!m2Map[key]) m2Map[key] = { materialName: item.materialName || key, materialId: item.materialId, totalM2: 0 };
      m2Map[key].totalM2 = Math.round((m2Map[key].totalM2 + item.m2!) * 10000) / 10000;
    } else if ((item.length || 0) > 0 && !(item.width && item.width > 0)) {
      const key = item.description || item.materialName || 'Acabamento';
      if (!linMap[key]) linMap[key] = { itemName: item.description || key, materialName: item.materialName, totalLinear: 0, totalQty: 0 };
      linMap[key].totalLinear = Math.round((linMap[key].totalLinear + item.quantity * (item.length || 0)) * 10000) / 10000;
      linMap[key].totalQty += item.quantity;
    }
  });
  const materialsM2 = Object.values(m2Map);
  const finishingsLinear = Object.values(linMap);
  return {
    materialsM2,
    finishingsLinear,
    totalM2: Math.round(materialsM2.reduce((a, x) => a + x.totalM2, 0) * 10000) / 10000,
    totalLinear: Math.round(finishingsLinear.reduce((a, x) => a + x.totalLinear, 0) * 10000) / 10000,
  };
};

export interface OSGroup {
  id: string;
  environments: string[];
  notes: string;
  materialsM2: WorkOrderMaterialM2[];
  finishingsLinear: WorkOrderFinishingLinear[];
  totalM2: number;
  totalLinear: number;
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

export const GenerateOSModal: React.FC<Props> = ({ sale, companyId, existingOSMap, onConfirm, onClose }) => {
  const saleEnvironments = Array.from(new Set((sale.items || []).map(i => i.environment || 'Sem Ambiente')));

  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([]);
  const [groups, setGroups] = useState<OSGroup[]>([]);
  const [saving, setSaving] = useState(false);

  const [reissueQueue, setReissueQueue] = useState<string[]>([]);
  const [reissueForms, setReissueForms] = useState<Record<string, ReissueForm>>({});
  const [pendingEnvsForGroup, setPendingEnvsForGroup] = useState<string[] | null>(null);

  const REISSUE_REASONS = ['Retrabalho', 'Complemento', 'Alteração por parte do cliente', 'Outro'];

  const assignedEnvs = groups.flatMap(g => g.environments);
  const availableEnvs = saleEnvironments.filter(env => !assignedEnvs.includes(env));

  const toggleSelect = (env: string) => {
    setSelectedEnvs(prev => prev.includes(env) ? prev.filter(e => e !== env) : [...prev, env]);
  };

  const handleAddGroup = () => {
    if (selectedEnvs.length === 0) return;

    const needsReissue = selectedEnvs.filter(env => existingOSMap[env]?.length > 0);

    if (needsReissue.length > 0) {
      setPendingEnvsForGroup(selectedEnvs);
      setReissueQueue(needsReissue);
      const forms: Record<string, ReissueForm> = {};
      needsReissue.forEach(env => { forms[env] = { environment: env, password: '', reason: '' }; });
      setReissueForms(forms);
    } else {
      createGroup(selectedEnvs, []);
    }
  };

  const createGroup = (envs: string[], reissueLogs: Array<{ environment: string; action: 'created' | 'reissued'; reason?: string; userName?: string }>) => {
    const metrics = calcMetrics(sale.items || [], envs);
    const normalLogs = envs
      .filter(env => !reissueLogs.find(l => l.environment === env))
      .map(env => ({ environment: env, action: 'created' as const }));
    const newGroup: OSGroup = {
      id: crypto.randomUUID(),
      environments: envs,
      notes: '',
      ...metrics,
      logs: [...normalLogs, ...reissueLogs],
    };
    setGroups(prev => [...prev, newGroup]);
    setSelectedEnvs([]);
    setPendingEnvsForGroup(null);
    setReissueQueue([]);
    setReissueForms({});
  };

  const confirmReissues = () => {
    if (!pendingEnvsForGroup) return;
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
    createGroup(pendingEnvsForGroup, reissueLogs);
  };

  const removeEnvFromGroup = (groupId: string, env: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const newEnvs = g.environments.filter(e => e !== env);
      if (newEnvs.length === 0) return null as any;
      const metrics = calcMetrics(sale.items || [], newEnvs);
      return { ...g, environments: newEnvs, ...metrics, logs: g.logs.filter(l => l.environment !== env) };
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

  const fmtM2 = (v: number) => v.toFixed(4).replace('.', ',') + ' m²';
  const fmtLin = (v: number) => v.toFixed(3).replace('.', ',') + ' m';

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
          {reissueQueue.length > 0 && pendingEnvsForGroup && (
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
                  onClick={() => { setPendingEnvsForGroup(null); setReissueQueue([]); setReissueForms({}); setSelectedEnvs([]); }}
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

          {/* Environments selection */}
          {availableEnvs.length > 0 && !reissueQueue.length && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Ambientes disponíveis — selecione para agrupar</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {availableEnvs.map(env => {
                  const hasOS = existingOSMap[env]?.length > 0;
                  const isSelected = selectedEnvs.includes(env);
                  return (
                    <button
                      key={env}
                      onClick={() => toggleSelect(env)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                        isSelected
                          ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[var(--primary-color)]/50'
                      }`}
                    >
                      {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      {env}
                      {hasOS && <AlertTriangle size={13} className={isSelected ? 'text-amber-200' : 'text-amber-500'} title="Já possui O.S." />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleAddGroup}
                disabled={selectedEnvs.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Nova O.S. com selecionados ({selectedEnvs.length})
              </button>
            </div>
          )}

          {availableEnvs.length === 0 && groups.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <FileText size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold">Nenhum ambiente disponível</p>
            </div>
          )}

          {/* OS Groups */}
          {groups.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">O.S. a gerar ({groups.length})</p>
              {groups.map((group, idx) => (
                <div key={group.id} className="bg-white dark:bg-slate-800 border-2 border-[var(--primary-color)]/20 rounded-2xl overflow-hidden">
                  {/* Group header */}
                  <div className="px-5 py-3 bg-[var(--primary-color)]/5 border-b border-[var(--primary-color)]/10 flex items-center justify-between">
                    <span className="font-black text-sm text-[var(--primary-color)]">O.S. #{idx + 1} (provisório)</span>
                    <button onClick={() => removeGroup(group.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Environments */}
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Ambientes</p>
                      <div className="flex flex-wrap gap-2">
                        {group.environments.map(env => {
                          const isReissued = group.logs.find(l => l.environment === env && l.action === 'reissued');
                          return (
                            <span key={env} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200">
                              {env}
                              {isReissued && <AlertTriangle size={12} className="text-amber-500" title={`Reemissão: ${isReissued.reason}`} />}
                              <button onClick={() => removeEnvFromGroup(group.id, env)} className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                                <X size={12} />
                              </button>
                            </span>
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
                      {group.materialsM2.length === 0 && group.finishingsLinear.length === 0 && (
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
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400 font-medium">
            {groups.length > 0 ? `${groups.length} O.S. pronta(s) para gerar` : 'Selecione ambientes e crie grupos acima'}
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
