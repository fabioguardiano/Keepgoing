import React, { useState } from 'react';
import { X, Hash, User, Maximize, Upload, Trash2, Files } from 'lucide-react';
import { ProductionPhase, OrderService, AppUser } from '../types';

interface NewOrderModalProps {
  initialPhase: ProductionPhase;
  onClose: () => void;
  onAddOrder: (order: OrderService) => void;
  appUsers: AppUser[];
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ initialPhase, onClose, onAddOrder, appUsers }) => {
  const [osNumber, setOsNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [materialArea, setMaterialArea] = useState('');
  const [seller, setSeller] = useState(appUsers[0]?.name || '');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [deadline, setDeadline] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...filesArray]);

      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newOrder: OrderService = {
      id: Math.random().toString(36).substr(2, 9),
      osNumber,
      orderNumber,
      clientName,
      projectDescription,
      material,
      materialArea: materialArea ? parseFloat(materialArea.replace(',', '.')) : 0,
      phase: initialPhase,
      seller,
      priority,
      deadline,
      createdAt: new Date().toISOString().split('T')[0],
      // In a real app, we would upload files to storage and get URLs.
      // For now, we use the previews or mock URLs.
      imageUrls: previews.length > 0 ? previews : [`https://picsum.photos/seed/${Math.random()}/400/600`]
    };

    onAddOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Files size={20} className="text-[var(--primary-color)]" /> Nova Ordem de Serviço
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Hash size={12} /> Nº Pedido
              </label>
              <input
                required
                type="number"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
                placeholder="0000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Hash size={12} /> Nº O.S.
              </label>
              <input
                required
                type="text"
                value={osNumber}
                onChange={e => setOsNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
                placeholder="Ex: OS-1234"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
            <input
              required
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <User size={12} /> Vendedor
              </label>
              <select
                value={seller}
                onChange={e => setSeller(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none bg-white font-medium"
              >
                {appUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Maximize size={12} /> Metragem (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={materialArea}
                onChange={e => setMaterialArea(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Image Upload Support for Multiple Files */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Arquivos / Desenhos (Múltiplos)</label>
            <div className="grid grid-cols-4 gap-2">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                  <img src={src} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/50 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-[var(--primary-color)]">
                <Upload size={20} />
                <span className="text-[10px] font-bold mt-1">Mais</span>
                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição do Projeto</label>
            <textarea
              required
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
              placeholder="Ex: Bancada de Cozinha com cuba esculpida"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Material</label>
            <input
              required
              type="text"
              value={material}
              onChange={e => setMaterial(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
              placeholder="Ex: Granito Preto São Gabriel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none bg-white"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prazo</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white bg-[var(--primary-color)] hover:opacity-90 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-[var(--primary-color)]/20"
            >
              Criar OS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
