import React, { useState } from 'react';
import { Settings, Layout, Check, ChevronRight, Plus, Trash2, Edit2, GripVertical, Info, Building2, MapPin, Phone, Mail, ShoppingBag, FileSpreadsheet, Download, Upload, AlertCircle, Loader2, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PhaseConfig, CompanyInfo, SalesPhaseConfig } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
    onReorderSalesPhases: (startIndex: number, endIndex: number) => void;
    companyInfo: CompanyInfo;
    onUpdateCompany: (info: CompanyInfo) => void;
    onImportClients: (clients: any[]) => Promise<void>;
    onImportMaterials: (materials: any[]) => Promise<void>;
    onMigrateData?: () => Promise<void>;
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
    onReorderSalesPhases,
    companyInfo,
    onUpdateCompany,
    onImportClients,
    onImportMaterials,
    onMigrateData
}) => {
    const [activeTab, setActiveTab] = useState<'fluxo' | 'vendas' | 'empresa' | 'dados'>('fluxo');
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
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações do Sistema</h1>
                    <p className="text-slate-500 font-medium">Personalize o fluxo de trabalho e informações da empresa</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sidebar Nav */}
                <div className="space-y-2">
                    <button 
                        onClick={() => setActiveTab('fluxo')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold border transition-all ${activeTab === 'fluxo' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Layout size={20} />
                            Fluxo de Produção
                        </div>
                        <ChevronRight size={16} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('vendas')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold border transition-all ${activeTab === 'vendas' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <ShoppingBag size={20} />
                            Fluxo de Vendas
                        </div>
                        <ChevronRight size={16} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('empresa')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold border transition-all ${activeTab === 'empresa' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 size={20} />
                            Cadastro da Empresa
                        </div>
                        <ChevronRight size={16} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('dados')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold border transition-all ${activeTab === 'dados' ? 'bg-primary/5 text-primary border-primary/10' : 'text-slate-500 bg-white border-transparent hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet size={20} />
                            Importação de Dados
                        </div>
                        <ChevronRight size={16} />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 text-slate-400 hover:bg-slate-50 rounded-2xl font-bold transition-all opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <Settings size={20} />
                            Geral (Em breve)
                        </div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'fluxo' ? (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">Fases do Kanban</h2>
                                <p className="text-sm text-slate-400 font-medium">Configure a ordem e as obrigatoriedades de cada etapa</p>
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
                                                                                className="w-full bg-white border border-[#ec5b13] rounded-lg px-2 py-1 text-sm font-bold focus:outline-none"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-bold text-slate-700 truncate">{phase.name}</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-6">
                                                                    {/* Requirement Toggle */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Exigir Responsável</span>
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
                                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                                    <Info size={20} className="shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-bold mb-1">Sobre a Responsabilidade Obrigatória</p>
                                        <p className="font-medium opacity-80">Ao ativar esta opção, o sistema impedirá que uma O.S. seja movida para esta fase sem que um colaborador de produção seja selecionado no momento da ação.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'vendas' ? (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">Fases de Vendas</h2>
                                <p className="text-sm text-slate-400 font-medium">Configure as etapas do seu funil comercial</p>
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
                                                                                className="w-full bg-white border border-[#ec5b13] rounded-lg px-2 py-1 text-sm font-bold focus:outline-none"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-bold text-slate-700 truncate">{phase.name}</span>
                                                                    )}
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
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>

                                <div className="mt-12 pt-8 border-t border-slate-100">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Motivos de Orçamento Perdido</h3>
                                    <p className="text-xs text-slate-400 font-medium mb-6">Cadastre as opções que o vendedor deverá selecionar ao perder um orçamento</p>
                                    
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
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">Dados da Empresa</h2>
                                <p className="text-sm text-slate-400 font-medium">Informações básicas e endereço principal</p>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    {/* Logo Upload Section */}
                                    <div className="md:col-span-2 p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                                                {companyInfo.logoUrl ? (
                                                    <img src={companyInfo.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Building2 size={32} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h3 className="text-sm font-bold text-slate-800">Logotipo da Empresa</h3>
                                                <p className="text-xs text-slate-400 font-medium">PNG ou JPG. Recomendado: Quadrado, máx. 500x500px.</p>
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
                                                                    if (file.size > 1024 * 1024) {
                                                                        alert('A imagem do logotipo deve ter no máximo 1MB. Por favor, escolha uma imagem menor ou comprima-a.');
                                                                        return;
                                                                    }
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
                                    <div className="md:col-span-2 p-6 bg-slate-100/50 border border-slate-200 rounded-3xl space-y-4 shadow-inner">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Layout size={18} className="text-primary" /> Personalização Visual
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
                                <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <FileSpreadsheet size={40} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800">Central de Importação</h2>
                                <p className="text-slate-500 font-medium leading-relaxed"> Suba sua planilha do Excel (.xlsx) para importar dados em lote para o sistema.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 text-left">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <ShoppingBag size={18} className="text-primary" /> Matéria Prima
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium">Importe chapas e insumos com custos e margens.</p>
                                        <div className="space-y-2">
                                            <button 
                                                onClick={() => {
                                                    const template = [
                                                        ['codigo', 'grupo', 'descricao', 'espessura', 'custo', 'frete', 'perda', 'imposto', 'margem', 'comissao', 'desconto', 'preco_venda'],
                                                        ['28', 'AGLOSTONE', 'AGL. BEGE PRIME AGLOSTONE', '2 CM', '250.00', '0.00', '20.00', '6.00', '46.50', '2.50', '5.00', '750.00']
                                                    ];
                                                    const ws = XLSX.utils.aoa_to_sheet(template);
                                                    const wb = XLSX.utils.book_new();
                                                    XLSX.utils.book_append_sheet(wb, ws, "Modelo Materiais");
                                                    XLSX.writeFile(wb, "modelo_importacao_materiais.xlsx");
                                                }}
                                                className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download size={14} /> Modelo Materiais
                                            </button>
                                            <label className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${importLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}`}>
                                                <Upload size={24} className="text-slate-300 mb-2" />
                                                <span className="text-[10px] font-bold text-slate-700">Importar Materiais</span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept=".xlsx, .csv" 
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setImportLoading(true);
                                                        try {
                                                            const reader = new FileReader();
                                                            reader.onload = async (evt) => {
                                                                const bstr = evt.target?.result;
                                                                const wb = XLSX.read(bstr, { type: 'binary' });
                                                                const ws = wb.Sheets[wb.SheetNames[0]];
                                                                const data = XLSX.utils.sheet_to_json(ws);
                                                                await onImportMaterials(data);
                                                                setImportStats({ total: data.length, success: data.length, errors: 0 });
                                                            };
                                                            reader.readAsBinaryString(file);
                                                        } catch (err) { console.error(err); } finally { setImportLoading(false); }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 text-left">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Building2 size={18} className="text-blue-500" /> Clientes
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium">Importe sua base de clientes e contatos.</p>
                                        <div className="space-y-2">
                                            <button 
                                                onClick={() => {
                                                    const template = [
                                                        ['codigo', 'nome', 'tipo', 'documento', 'email', 'telefone', 'celular', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep'],
                                                        ['1', 'João Silva', 'Pessoa Física', '000.000.000-00', 'joao@email.com', '(11) 9999-9999', '(11) 99999-9999', 'Av. Paulista', '1000', 'Sala 1', 'Centro', 'São Paulo', 'SP', '01310-100']
                                                    ];
                                                    const ws = XLSX.utils.aoa_to_sheet(template);
                                                    const wb = XLSX.utils.book_new();
                                                    XLSX.utils.book_append_sheet(wb, ws, "Modelo Clientes");
                                                    XLSX.writeFile(wb, "modelo_importacao_clientes.xlsx");
                                                }}
                                                className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download size={14} /> Modelo Clientes
                                            </button>
                                            <label className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${importLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}`}>
                                                <Upload size={24} className="text-slate-300 mb-2" />
                                                <span className="text-[10px] font-bold text-slate-700">Importar Clientes</span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept=".xlsx, .csv" 
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setImportLoading(true);
                                                        try {
                                                            const reader = new FileReader();
                                                            reader.onload = async (evt) => {
                                                                const bstr = evt.target?.result;
                                                                const wb = XLSX.read(bstr, { type: 'binary' });
                                                                const ws = wb.Sheets[wb.SheetNames[0]];
                                                                const data = XLSX.utils.sheet_to_json(ws);
                                                                await onImportClients(data);
                                                                setImportStats({ total: data.length, success: data.length, errors: 0 });
                                                            };
                                                            reader.readAsBinaryString(file);
                                                        } catch (err) { console.error(err); } finally { setImportLoading(false); }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 text-orange-700 text-left">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <div className="text-[11px] font-medium leading-relaxed">
                                        <p className="font-bold mb-1 uppercase tracking-wider">Atenção ao Formato:</p>
                                        <p>Use os botões acima para baixar as planilhas modelo. Preencha os dados e suba o arquivo no campo correspondente. O sistema irá ignorar registros com códigos duplicados e atualizará os dados existentes.</p>
                                    </div>
                                </div>

                                    {importStats && (
                                        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4 text-left animate-in fade-in slide-in-from-bottom-2">
                                            <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0">
                                                <Check size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-green-800">Importação Concluída!</p>
                                                <p className="text-xs text-green-600 font-medium">Foram processados {importStats.total} registros com sucesso.</p>
                                            </div>
                                        </div>
                                    )}

                                    {onMigrateData && (
                                        <div className="mt-8 pt-8 border-t border-slate-100">
                                            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-left">
                                                <div className="flex items-center gap-3 text-white">
                                                    <div className="p-2 bg-primary/20 text-primary rounded-xl">
                                                        <Database size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-bold">Migração de Dados Locais</h3>
                                                </div>
                                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                                    Se você tem dados salvos localmente neste navegador (Marcas, Grupos, Colaboradores, etc.) que não aparecem no banco de dados, use o botão abaixo para sincronizá-los manualmente com o Supabase.
                                                </p>
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm('Deseja iniciar a migração dos dados locais para o banco de dados? Isso não apagará seus dados locais, apenas enviará uma cópia para o servidor.')) {
                                                            await onMigrateData();
                                                        }
                                                    }}
                                                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:bg-secondary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
                                                >
                                                    <Upload size={20} /> SINCRONIZAR COM BANCO DE DADOS
                                                </button>
                                                <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest">Ação recomendada após deploy ou troca de navegador</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
};
