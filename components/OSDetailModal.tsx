import React, { useRef, useState } from 'react';
import { X, FileText, ChevronRight, Download, Share2, History, Package, Eye, Trash2, Upload, ChevronLeft, ChevronRight as ChevronRightIcon, UserPlus, Clock as ClockIcon, Layers } from 'lucide-react';
import { OrderService, ActivityLog, ProductionStaff } from '../types';

interface OSDetailModalProps {
  order: OrderService;
  onClose: () => void;
  onUpdateOrder: (id: string, updates: Partial<OrderService>) => void;
  activities: ActivityLog[];
  productionStaff: ProductionStaff[];
  onAddPhaseResponsible: (orderId: string, phaseName: string, staffName: string) => void;
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' às '
    + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (startIso: string, endIso?: string) => {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const diffInMs = end.getTime() - start.getTime();
  
  const totalMinutes = Math.floor(diffInMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

const formatRelativeTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffInMinutes < 1) return 'Agora mesmo';
  if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  return date.toLocaleDateString('pt-BR');
};

export const OSDetailModal: React.FC<OSDetailModalProps> = ({ order, onClose, onUpdateOrder, activities, productionStaff, onAddPhaseResponsible }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [showStaffPicker, setShowStaffPicker] = useState<string | null>(null); // phaseName of open picker

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesArray = Array.from(files);
      const promises = filesArray.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file as Blob);
        });
      });

      Promise.all(promises).then(base64Images => {
        onUpdateOrder(order.id, { imageUrls: [...order.imageUrls, ...base64Images] });
      });
    }
  };

  const removeImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newImages = order.imageUrls.filter((_, i) => i !== index);
    onUpdateOrder(order.id, { imageUrls: newImages });
    if (currentImgIdx >= newImages.length) {
      setCurrentImgIdx(Math.max(0, newImages.length - 1));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx(prev => (prev + 1) % order.imageUrls.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx(prev => (prev - 1 + order.imageUrls.length) % order.imageUrls.length);
  };

  const hasImages = order.imageUrls && order.imageUrls.length > 0;
  const isMultiImage = hasImages && order.imageUrls.length > 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{order.osNumber}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Pedido #{order.orderNumber}</span>
                <ChevronRight size={14} />
                <span className="font-semibold text-[var(--primary-color)]">{order.phase}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={16} /> Exportar PDF
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Confira a OS ${order.osNumber} - ${order.clientName}`);
                alert('Link copiado para a área de transferência!');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Share2 size={16} /> Compartilhar
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto flex">

          {/* Main Info */}
          <div className="flex-1 p-8 space-y-8">
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Informações do Projeto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cliente</p>
                  <p className="font-bold text-gray-900 text-sm">{order.clientName}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vendedor</p>
                  <p className="font-bold text-gray-900 text-sm">{order.seller}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Material</p>
                  <p className="font-bold text-gray-900 text-sm">{order.material}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Metragem</p>
                  <p className="font-bold text-gray-900 text-sm">{order.materialArea} m²</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 col-span-full">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</p>
                  <p className="font-medium text-gray-900 leading-relaxed text-sm">{order.projectDescription}</p>
                </div>
              </div>
            </section>

            {/* Production Timeline Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} /> Linha do Tempo de Produção
              </h3>
              
              <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {order.phaseHistory && order.phaseHistory.length > 0 ? (
                  [...order.phaseHistory].reverse().map((phaseRecord, historyIdx) => (
                    <div key={historyIdx} className="relative pl-12">
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm ${!phaseRecord.completedAt ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>

                      <div className={`p-5 rounded-2xl border transition-all ${!phaseRecord.completedAt ? 'border-[var(--primary-color)]/30 bg-orange-50/50 shadow-sm' : 'border-gray-100 bg-white opacity-80'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h4 className={`text-sm font-bold uppercase tracking-tight ${!phaseRecord.completedAt ? 'text-[var(--primary-color)]' : 'text-gray-700'}`}>
                              {phaseRecord.phaseName}
                            </h4>
                            {!phaseRecord.completedAt ? (
                              <span className="text-[10px] font-black text-[var(--primary-color)] bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Em andamento</span>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Finalizado</span>
                            )}
                          </div>

                          {!phaseRecord.completedAt && (
                            <div className="relative">
                              <button
                                onClick={() => setShowStaffPicker(showStaffPicker === `${phaseRecord.phaseName}-${historyIdx}` ? null : `${phaseRecord.phaseName}-${historyIdx}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[var(--primary-color)] bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                              >
                                <UserPlus size={14} /> Adicionar Responsável
                              </button>
                              {showStaffPicker === `${phaseRecord.phaseName}-${historyIdx}` && (
                                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-2 w-56">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase px-4 pb-2 border-b border-gray-100 mb-1">Selecionar colaborador</p>
                                  {productionStaff.filter(s => s.status === 'ativo').map(s => (
                                    <button
                                      key={s.id}
                                      onClick={() => {
                                        onAddPhaseResponsible(order.id, phaseRecord.phaseName, s.name);
                                        setShowStaffPicker(null);
                                      }}
                                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-[var(--primary-color)] transition-colors"
                                    >
                                      <div className="w-7 h-7 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center text-[11px] font-bold shrink-0">
                                        {s.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-medium">{s.name}</span>
                                    </button>
                                  ))}
                                  {productionStaff.filter(s => s.status === 'ativo').length === 0 && (
                                    <p className="text-xs text-gray-400 px-4 py-3 italic">Nenhum colaborador ativo.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {/* Timestamps & Duration */}
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-500">
                              <ClockIcon size={13} className="text-green-500" />
                              <span className="font-medium">Entrada:</span>
                              <span className="text-gray-900">{formatDateTime(phaseRecord.startedAt)}</span>
                            </div>
                            {phaseRecord.completedAt && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <ClockIcon size={13} className="text-red-400" />
                                <span className="font-medium">Saída:</span>
                                <span className="text-gray-900">{formatDateTime(phaseRecord.completedAt)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-500">
                              <History size={13} className="text-blue-500" />
                              <span className="font-medium">Duração:</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold ${!phaseRecord.completedAt ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]' : 'bg-blue-50 text-blue-700'}`}>
                                {formatDuration(phaseRecord.startedAt, phaseRecord.completedAt)}
                              </span>
                            </div>
                          </div>

                          {/* Responsibles */}
                          <div className="flex flex-wrap gap-3">
                            {phaseRecord.responsibles.length > 0 ? (
                              phaseRecord.responsibles.map(resp => (
                                <div key={resp.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
                                  <div className="w-8 h-8 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm">
                                    {resp.staffName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-800 leading-none">{resp.staffName}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Atribuído {formatRelativeTime(resp.addedAt)}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-gray-400 italic bg-gray-50/50 rounded-lg px-3 py-2 border border-dashed">
                                <History size={12} /> Nenhum responsável atribuído
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50">
                    <History size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Nenhum histórico de produção disponível.</p>
                    <p className="text-xs text-gray-400 mt-1">As fases aparecerão aqui conforme a O.S. for movimentada.</p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Arquivos e Desenhos ({order.imageUrls.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={triggerFileInput}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-[var(--primary-color)] rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors"
                  >
                    <Upload size={14} /> Adicionar Arquivos
                  </button>
                  {hasImages && (
                    <button
                      onClick={() => setIsLightboxOpen(true)}
                      className="text-xs text-blue-600 font-medium hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={12} /> Tela Cheia
                    </button>
                  )}
                </div>
              </div>

              {hasImages ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-center overflow-hidden relative group">
                    <img
                      src={order.imageUrls[currentImgIdx]}
                      alt="Visualização"
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => setIsLightboxOpen(true)}
                    />

                    {isMultiImage && (
                      <>
                        <button
                          onClick={prevImg}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg text-slate-700 hover:bg-white"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={nextImg}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg text-slate-700 hover:bg-white"
                        >
                          <ChevronRightIcon size={24} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={(e) => removeImage(e, currentImgIdx)}
                      className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {order.imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentImgIdx(idx)}
                        className={`relative w-24 aspect-square rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${idx === currentImgIdx ? 'border-[var(--primary-color)] scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-white font-bold text-xs">{idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  onClick={triggerFileInput}
                  className="aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <Package className="text-gray-300 mb-2" size={48} />
                  <p className="text-gray-400 font-medium">Nenhum desenho anexado</p>
                  <p className="text-xs text-gray-400 mt-1">Clique para enviar arquivos</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="w-80 border-l bg-gray-50 p-6 flex flex-col gap-8 shrink-0">
            {/* Same sidebar content from previous version... */}
            <section>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <History size={14} /> Atividade Recente
              </h4>
              <div className="space-y-3">
                {activities
                  .filter(a => a.orderId === order.id)
                  .slice(0, 5)
                  .map((activity, idx) => (
                    <div key={activity.id || idx} className="flex gap-3 items-start p-2 rounded-lg hover:bg-white transition-colors">
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${activity.action === 'create' ? 'bg-green-500' : activity.action === 'upload' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                        {activity.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* User name */}
                        <p className="text-xs font-bold text-gray-800 leading-none mb-0.5">{activity.userName}</p>
                        {/* Action */}
                        <p className="text-xs text-gray-500 leading-snug">{activity.details}</p>
                        {/* Date/time */}
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">
                          {new Date(activity.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {' às '}
                          {new Date(activity.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                {activities.filter(a => a.orderId === order.id).length === 0 && (
                  <p className="text-xs text-gray-400 italic px-2">Nenhuma atividade registrada para esta O.S.</p>
                )}
              </div>
            </section>

            <section className="mt-auto">
              <div className="p-4 rounded-2xl bg-white border shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Responsáveis</h4>
                {/* ... responsibles list ... */}
                <div className="flex flex-col gap-3 text-xs">
                  <p className="font-bold text-slate-700">Equipe de Produção atribuída</p>
                </div>
              </div>
            </section>

            <button onClick={onClose} className="w-full py-4 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-lg shadow-[var(--primary-color)]/20 hover:opacity-90 transition-all">
              Fechar e Salvar
            </button>
          </div>
        </div>
      </div>

      {isLightboxOpen && hasImages && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button className="absolute top-0 -right-12 text-white hover:text-gray-300 p-2 transition-colors">
              <X size={40} />
            </button>
            <img
              src={order.imageUrls[currentImgIdx]}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
              alt="Full Screen Technical Drawing"
            />

            {isMultiImage && (
              <>
                <button
                  onClick={prevImg}
                  className="absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronLeft size={48} />
                </button>
                <button
                  onClick={nextImg}
                  className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronRightIcon size={48} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
