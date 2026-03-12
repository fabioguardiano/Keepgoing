import React, { useState } from 'react';
import { Calendar, Eye, X, GripVertical, Clock, CheckCircle2, PlayCircle, ChevronLeft, ChevronRight, Layers, HardHat } from 'lucide-react';
import { OrderService, ActivityLog, ProductionStaff } from '../types';
import { OSDetailModal } from './OSDetailModal';
import { Draggable } from '@hello-pangea/dnd';

interface OSCardProps {
  order: OrderService;
  index: number;
  onUpdateOrder: (id: string, updates: Partial<OrderService>) => void;
  activities: ActivityLog[];
  productionStaff: ProductionStaff[];
  onAddPhaseResponsible: (orderId: string, phaseName: string, staffName: string) => void;
}

export const OSCard: React.FC<OSCardProps> = ({ order, index, onUpdateOrder, activities, productionStaff, onAddPhaseResponsible }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const priorityColors = {
    baixa: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    media: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    alta: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  };

  const hasImages = order.imageUrls && order.imageUrls.length > 0;
  const isMultiImage = hasImages && order.imageUrls.length > 1;

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLightboxOpen(true);
  };

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx(prev => (prev + 1) % order.imageUrls.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx(prev => (prev - 1 + order.imageUrls.length) % order.imageUrls.length);
  };

  return (
    <>
      <Draggable draggableId={order.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setIsModalOpen(true)}
            className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 group cursor-grab hover:border-[var(--primary-color)]/50 transition-all ${order.phase === 'Serviço Finalizado' ? 'border-l-4 border-l-green-500' : ''} ${snapshot.isDragging ? 'opacity-80 shadow-2xl scale-105 z-50 ring-2 ring-[var(--primary-color)]' : ''}`}
            style={provided.draggableProps.style}
          >
            <div className="flex justify-between items-start mb-1">
              {order.phase === 'Serviço Finalizado' ? (
                <>
                  <span className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Concluído</span>
                  <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0" />
                </>
              ) : (
                <>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${priorityColors[order.priority]}`}>
                    {order.priority}
                  </span>
                  <GripVertical className="text-slate-300 group-hover:text-slate-400 transition-colors w-5 h-5 shrink-0" />
                </>
              )}
            </div>

            {hasImages && order.phase !== 'Serviço Finalizado' && (
              <div className="relative mb-2 group/img">
                <div
                  onClick={handleOpenLightbox}
                  className="w-full aspect-[3/4] rounded-lg bg-slate-100 overflow-hidden relative cursor-zoom-in"
                >
                  <img
                    src={order.imageUrls[currentImgIdx]}
                    alt={`Desenho ${currentImgIdx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />

                  {/* Indicator for multiple pages */}
                  {isMultiImage && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                      <Layers size={10} /> {currentImgIdx + 1}/{order.imageUrls.length}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="bg-white/80 p-1.5 rounded-full shadow-lg">
                      <Eye className="text-slate-700 w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Micro-carousel controls */}
                {isMultiImage && (
                  <>
                    <button
                      onClick={prevImg}
                      className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-white/90 rounded-full shadow-md text-slate-700 opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-white"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={nextImg}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-white/90 rounded-full shadow-md text-slate-700 opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                {order.osNumber}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Ped: {order.orderNumber}
              </span>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-0.5 leading-tight line-clamp-1">{order.projectDescription}</h4>
            <p className="text-slate-500 text-xs mb-2 line-clamp-1">{order.clientName}</p>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5 text-slate-500">
                {order.phase === 'Serviço Finalizado' ? (
                  <Calendar className="w-3.5 h-3.5" />
                ) : order.phase === 'Corte' ? (
                  <PlayCircle className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}

                <span className={`text-[11px] font-medium ${order.phase === 'Corte' ? 'text-[var(--primary-color)] font-bold' : ''}`}>
                  {order.phase === 'Serviço Finalizado' ? 'Hoje, 09:30' :
                    order.phase === 'Corte' ? 'Em progresso...' : (order.deadline || '45m')}
                </span>
              </div>

              {order.phase !== 'Serviço Finalizado' && (
                <div className="flex items-center gap-2">
                  {order.responsibleStaffName && (
                    <span className="text-[10px] font-bold text-[var(--primary-color)] bg-orange-50 px-2 py-0.5 rounded-full border border-[var(--primary-color)]/10">
                      {order.responsibleStaffName.split(' ')[0]}
                    </span>
                  )}
                  <div className="relative flex -space-x-2">
                    <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 overflow-hidden relative flex items-center justify-center text-[10px] text-slate-500 font-bold">
                      {order.responsibleStaffName ? order.responsibleStaffName[0].toUpperCase() : <HardHat size={12} />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>

      {isModalOpen && (
        <OSDetailModal
          order={order}
          onClose={() => setIsModalOpen(false)}
          onUpdateOrder={onUpdateOrder}
          activities={activities}
          productionStaff={productionStaff}
          onAddPhaseResponsible={onAddPhaseResponsible}
        />
      )}

      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button className="absolute top-0 -right-12 text-white hover:text-gray-300 p-2 transition-colors">
              <X size={32} />
            </button>
            <img
              src={order.imageUrls[currentImgIdx]}
              className="max-w-full max-h-full object-contain shadow-2xl"
              alt="Full Screen View"
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
                  <ChevronRight size={48} />
                </button>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
                  Arquivo {currentImgIdx + 1} de {order.imageUrls.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
