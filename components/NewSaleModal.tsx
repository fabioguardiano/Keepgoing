import React, { useState, useEffect } from 'react';
import { X, User, ShoppingBag, Plus, Trash2, Calculator, Save, FileText, Search, Tag, Users, Printer, Edit2, RotateCcw, Check, GripVertical, PlusCircle, Copy, Pencil, Lock, AlertTriangle, Eye, ClipboardList } from 'lucide-react';
import { SalesOrder, OrderItem, Client, Architect, AppUser, SalesChannel, Material, ProductService, CompanyInfo, SalesPhaseConfig, ServiceGroup, PaymentMethod, WorkOrder, DiscountAuthorization } from '../types';
import { ClientSelectModal } from './ClientSelectModal';
import { PrintBudget } from './PrintBudget';
import { GenerateOSModal } from './GenerateOSModal';
import { DiscountRequestModal } from './DiscountAuthModal';
import { CRMSection } from './CRMSection';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

interface NewSaleModalProps {
  onClose: () => void;
  onSave: (sale: SalesOrder) => void;
  clients: Client[];
  architects: Architect[];
  appUsers: AppUser[];
  materials: Material[];
  products: ProductService[];
  salesChannels: SalesChannel[];
  paymentMethods: PaymentMethod[];
  initialData?: SalesOrder;
  companyInfo: CompanyInfo;
  nextOrderNumber: string;
  salesPhases: SalesPhaseConfig[];
  services: ServiceGroup[];
  readOnly?: boolean;
  companyId?: string;
  createWorkOrders?: (orders: any[]) => Promise<boolean>;
  getEnvironmentOSMap?: (saleId: string) => Record<string, WorkOrder[]>;
  onRequestDiscount?: (admin: AppUser, requestedPct: number, maxPct: number) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  onClose, onSave, clients, architects, appUsers, materials, products, services, salesChannels, paymentMethods, initialData, companyInfo, nextOrderNumber, salesPhases, readOnly = false,
  companyId, createWorkOrders, getEnvironmentOSMap, onRequestDiscount
}) => {
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [printingSale, setPrintingSale] = useState<SalesOrder | null>(null);
  const [blurMeasurements, setBlurMeasurements] = useState(false);
  const [showGenerateOS, setShowGenerateOS] = useState(false);
  const [showDiscountRequest, setShowDiscountRequest] = useState(false);
  // Revert-to-Orçamento flow (only when readOnly=true)
  const [isLocked, setIsLocked] = useState(readOnly);
  const [showRevert, setShowRevert] = useState(false);
  const [revertPassword, setRevertPassword] = useState('');
  const [revertJustification, setRevertJustification] = useState('');
  const [revertError, setRevertError] = useState('');
  const [revertLoading, setRevertLoading] = useState(false);

  const handlePrint = () => {
    // Generate a temporary sale object to print if current form is valid
    if (!selectedClient) {
      alert('Selecione um cliente para imprimir');
      return;
    }

    const tempSale: SalesOrder = {
      ...initialData,
      id: initialData?.id || 'temp',
      osNumber: osNumber || 'PREVIEW',
      orderNumber: orderNumber || 'PREVIEW',
      clientName: selectedClient.name,
      clientId: selectedClient.id,
      projectDescription: items.map(i => i.description).join(', '),
      material: items[0]?.description || '',
      materialArea: items.reduce((acc, i) => acc + (i.m2 || 0), 0),
      phase: saleType === 'Pedido' ? 'Serviço Lançado' : 'Aprovação' as any,
      salesPhase,
      seller,
      createdAt: initialData?.createdAt || new Date().toISOString().split('T')[0],
      deadline: deliveryDeadline,
      priority: 'media',
      status: saleType,
      salesChannel,
      architectId,
      architectName: architect,
      items,
      paymentConditions,
      deliveryDeadline,
      discountValue: calculatedDiscount,
      discountPercentage,
      totals: {
        vendas: subtotal,
        desconto: calculatedDiscount,
        geral: totalGeral
      },
      imageUrls: []
    };

    setPrintingSale(tempSale);
    setTimeout(() => {
      window.print();
      setPrintingSale(null);
    }, 100);
  };
  
  // Initialize states with initialData if present
  const [selectedClient, setSelectedClient] = useState<Client | null>(() => {
    if (initialData) {
      return (
        clients.find(c => c.id === initialData.clientId) ||
        clients.find(c => c.id === (initialData as any).client_id) ||
        clients.find(c => c.name === initialData.clientName) ||
        null
      );
    }
    return null;
  });
  
  const [saleType, setSaleType] = useState<'Orçamento' | 'Pedido'>(initialData?.status === 'Pedido' ? 'Pedido' : 'Orçamento');
  const [orderNumber, setOrderNumber] = useState(initialData?.orderNumber || nextOrderNumber);
  const [osNumber, setOsNumber] = useState(initialData?.osNumber || nextOrderNumber);
  const [salesChannel, setSalesChannel] = useState<string>(initialData?.salesChannel || salesChannels[0]?.name || '');
  const [seller, setSeller] = useState(initialData?.seller || appUsers[0]?.name || '');
  const [architect, setArchitect] = useState(initialData?.architectName || '');
  const [architectId, setArchitectId] = useState(initialData?.architectId || '');
  const [items, setItems] = useState<OrderItem[]>(initialData?.items || []);
  const [paymentConditions, setPaymentConditions] = useState(initialData?.paymentConditions || '');
  const [paymentMethodId, setPaymentMethodId] = useState(initialData?.paymentMethodId || '');
  const [paymentInstallments, setPaymentInstallments] = useState(initialData?.paymentInstallments || 1);
  const [firstDueDate, setFirstDueDate] = useState(initialData?.firstDueDate || '');
  const [deliveryDeadline, setDeliveryDeadline] = useState(initialData?.deliveryDeadline || '');
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue || 0);
  const [discountPercentage, setDiscountPercentage] = useState(initialData?.discountPercentage || 0);
  const [salesPhase, setSalesPhase] = useState<string>(initialData?.salesPhase || (salesPhases.length > 0 ? salesPhases[0].name : ''));

  // Form states for new item
  const [itemDesc, setItemDesc] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemLength, setItemLength] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemService, setItemService] = useState(0);
  const [itemMaterialId, setItemMaterialId] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<string>('');
  const [newEnvironmentName, setNewEnvironmentName] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialSwap, setMaterialSwap] = useState<{ env: string; newMaterialName: string; toReplace: string[] } | null>(null);

  const environments = Array.from(new Set([...items.map(i => i.environment || 'Sem Ambiente'), activeEnvironment, newEnvironmentName].filter(Boolean)));

  // True when the selected material is an Acabamento or Produto de Revenda (no dimensions needed)
  const isProductMaterial = products.some(
    p => (p.type === 'Acabamentos' || p.type === 'Produtos de Revenda') && p.description === itemMaterialId
  );

  const calculateM2 = (l: number, w: number, q: number) => {
    if (l > 0 && w > 0) {
      return (l * w * q);
    }
    return 0;
  };

  const calculateItemTotal = () => {
    const safeQty   = isFinite(itemQty)     && itemQty     > 0 ? itemQty     : 0;
    const safePrice = isFinite(itemPrice)                      ? itemPrice   : 0;
    const safeSvc   = isFinite(itemService) && itemService > 0 ? itemService : 0;
    const m2 = calculateM2(itemLength, itemWidth, safeQty);
    const baseTotal = m2 > 0 ? (m2 * safePrice) : (safeQty * safePrice);
    return baseTotal + baseTotal * (safeSvc / 100);
  };

  const addItem = () => {
    if (!itemDesc) return;
    
    const m2 = calculateM2(itemLength, itemWidth, itemQty);
    const total = calculateItemTotal();

    // Validate that description exists in services
    const isValidDesc = services.some(s => s.description === itemDesc);
    if (!isValidDesc) {
      alert('Por favor, selecione um Serviço válido da lista.');
      return;
    }

    // Find material in materials table OR in products (Acabamentos / Produtos de Revenda)
    const matFromMaterials = materials.find(m => m.name === itemMaterialId || m.id === itemMaterialId);
    const matFromProducts = products.find(p =>
      (p.type === 'Acabamentos' || p.type === 'Produtos de Revenda') && p.description === itemMaterialId
    );
    const resolvedMaterialId = matFromMaterials?.id || matFromProducts?.id || '';
    const resolvedMaterialName = matFromMaterials?.name || matFromProducts?.description || '';

    if (!resolvedMaterialId) {
      alert('Por favor, selecione uma Matéria Prima válida da lista.');
      return;
    }

    // Validate dimensions (only for materials that require m²)
    if (!isProductMaterial && (itemLength <= 0 || itemWidth <= 0)) {
      alert('Por favor, preencha o Comprimento e a Largura do item antes de adicionar.');
      return;
    }

    if (editingItemId) {
      setItems(items.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            description: itemDesc,
            quantity: itemQty,
            unit: m2 > 0 ? 'm²' : 'un',
            unitPrice: itemPrice,
            totalPrice: total,
            length: itemLength,
            width: itemWidth,
            m2: m2,
            servicePercentage: itemService,
            environment: activeEnvironment,
            materialId: resolvedMaterialId,
            materialName: resolvedMaterialName
          };
        }
        return item;
      }));
      setEditingItemId(null);
    } else {
      const newItem: OrderItem = {
        id: crypto.randomUUID(),
        description: itemDesc,
        quantity: itemQty,
        unit: m2 > 0 ? 'm²' : 'un',
        unitPrice: itemPrice,
        totalPrice: total,
        status: 'pendente',
        length: itemLength,
        width: itemWidth,
        m2: m2,
        servicePercentage: itemService,
        environment: activeEnvironment,
        materialId: resolvedMaterialId,
        materialName: resolvedMaterialName
      };
      setItems([...items, newItem]);
    }

    // Reset form
    setItemDesc('');
    setItemQty(1);
    setItemLength(0);
    setItemWidth(0);
    setItemPrice(0);
    setItemService(0);
    setItemMaterialId('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
      resetItemForm();
    }
  };

  const editItem = (item: OrderItem) => {
    setEditingItemId(item.id);
    setItemDesc(item.description);
    setItemQty(item.quantity);
    setItemLength(item.length || 0);
    setItemWidth(item.width || 0);
    setItemPrice(item.unitPrice);
    setItemService(item.servicePercentage || 0);
    setActiveEnvironment(item.environment || '');
    const mat = materials.find(m => m.id === item.materialId);
    setItemMaterialId(mat ? mat.name : '');
  };

  const resetItemForm = () => {
    setItemDesc('');
    setItemQty(1);
    setItemLength(0);
    setItemWidth(0);
    setItemPrice(0);
    setItemService(0);
    setItemMaterialId('');
    setEditingItemId(null);
  };

  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && itemDesc) {
      const combined = [
        ...services.map(s => s.description),
        ...products.map(p => p.description)
      ];
      const filtered = combined.filter(d => d.toLowerCase().includes(itemDesc.toLowerCase()));
      if (filtered.length === 1 && itemDesc !== filtered[0]) {
        setItemDesc(filtered[0]);
      }
    }
  };

  const handleMaterialKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && itemMaterialId) {
      const filtered = materials.filter(m => m.name.toLowerCase().includes(itemMaterialId.toLowerCase()));
      if (filtered.length === 1 && itemMaterialId !== filtered[0].name) {
        const mat = filtered[0];
        setItemMaterialId(mat.name);
        if (mat.sellingPrice) setItemPrice(mat.sellingPrice);
        if (!itemDesc) setItemDesc(mat.name);
      }
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newItems = Array.from(items);
    const draggedItemIndex = newItems.findIndex(i => i.id === draggableId);
    if (draggedItemIndex === -1) return;

    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    
    // Update environment if moved to a different droppable
    if (destination.droppableId !== source.droppableId) {
      draggedItem.environment = destination.droppableId === 'no-environment' ? '' : destination.droppableId;
    }

    // Reinsert at new position (simplified logic for flat array with group filtering)
    // In a real grouped DND, we'd need more complex index mapping, 
    // but for now, we just update the environment and push to the end or keep order.
    newItems.splice(destination.index, 0, draggedItem);
    setItems(newItems);
  };

  const deleteEnvironment = (envName: string) => {
    if (confirm(`Tem certeza que deseja excluir o ambiente "${envName}" e todos os seus itens?`)) {
      setItems(items.filter(i => (i.environment || 'Sem Ambiente') !== envName));
      if (activeEnvironment === envName || (envName === '' && activeEnvironment === '')) {
        setActiveEnvironment('');
      }
    }
  };

  const duplicateEnvironment = (envName: string) => {
    const envItems = items.filter(i => (i.environment || 'Sem Ambiente') === envName);
    const existingEnvs = Array.from(new Set(items.map(i => i.environment || 'Sem Ambiente')));
    let newEnvName = `${envName} (Cópia)`;
    let counter = 2;
    while (existingEnvs.includes(newEnvName)) {
      newEnvName = `${envName} (Cópia ${counter})`;
      counter++;
    }
    const newItems = envItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      environment: newEnvName
    }));
    setItems([...items, ...newItems]);
    setActiveEnvironment(newEnvName);
  };

  const renameEnvironment = (oldName: string) => {
    const newName = prompt('Novo nome para o ambiente:', oldName);
    if (newName && newName.trim() && newName !== oldName) {
      setItems(items.map(item => {
        if ((item.environment || 'Sem Ambiente') === oldName) {
          return { ...item, environment: newName.trim() };
        }
        return item;
      }));
      if (activeEnvironment === oldName) setActiveEnvironment(newName.trim());
    }
  };

  const updateEnvironmentMaterial = (envName: string, materialName: string, onlyReplace?: string[]) => {
    const matFromMaterials = materials.find(m => m.name === materialName);
    const matFromProducts = products.find(p =>
      (p.type === 'Acabamentos' || p.type === 'Produtos de Revenda') && p.description === materialName
    );
    const resolvedId = matFromMaterials?.id || matFromProducts?.id;
    const resolvedName = matFromMaterials?.name || matFromProducts?.description;
    const resolvedPrice = matFromMaterials?.sellingPrice || matFromProducts?.sellingPrice || 0;
    if (!resolvedId) return;

    setItems(prevItems => prevItems.map(item => {
      if ((item.environment || 'Sem Ambiente') === envName) {
        if (onlyReplace && !onlyReplace.includes(item.materialName || '')) return item;
        const m2 = item.m2 || 0;
        const newUnitPrice = resolvedPrice;
        const baseTotal = m2 > 0 ? (m2 * newUnitPrice) : (item.quantity * newUnitPrice);
        const serviceBonus = baseTotal * ((item.servicePercentage || 0) / 100);

        return {
          ...item,
          materialId: resolvedId,
          materialName: resolvedName,
          unitPrice: newUnitPrice,
          totalPrice: baseTotal + serviceBonus
        };
      }
      return item;
    }));
  };

  const syncPricesWithMaterials = (onlyEnv?: string) => {
    setItems(prevItems => prevItems.map(item => {
      if (onlyEnv !== undefined && (item.environment || 'Sem Ambiente') !== onlyEnv) return item;
      if (item.materialId) {
        const material = materials.find(m => m.id === item.materialId);
        if (material) {
          const m2 = item.m2 || 0;
          const newUnitPrice = material.sellingPrice || 0;
          const baseTotal = m2 > 0 ? (m2 * newUnitPrice) : (item.quantity * newUnitPrice);
          const serviceBonus = baseTotal * ((item.servicePercentage || 0) / 100);
          return { ...item, unitPrice: newUnitPrice, totalPrice: baseTotal + serviceBonus };
        }
      }
      return item;
    }));
    alert(onlyEnv ? `Preços do ambiente "${onlyEnv}" sincronizados!` : 'Preços de todo o orçamento sincronizados!');
  };

  const subtotal = items.reduce((acc, item) => acc + (isFinite(item.totalPrice) ? item.totalPrice : 0), 0);
  const safeDiscPct = isFinite(discountPercentage) ? discountPercentage : 0;
  const safeDiscVal = isFinite(discountValue)      ? discountValue      : 0;
  const calculatedDiscount = safeDiscPct > 0 ? (subtotal * (safeDiscPct / 100)) : safeDiscVal;
  const totalGeral = subtotal - calculatedDiscount;

  const handleSave = () => {
    if (!selectedClient) {
      alert('Selecione um cliente');
      return;
    }
    if (!deliveryDeadline || parseInt(deliveryDeadline) <= 0) {
      alert('Informe o Prazo de Entrega em dias úteis antes de salvar.');
      return;
    }
    if (saleType === 'Pedido' && !paymentMethodId) {
      alert('Informe a Forma de Pagamento para confirmar o Pedido.');
      return;
    }
    if (saleType === 'Pedido' && !firstDueDate) {
      alert('Informe a Data do 1º Vencimento para confirmar o Pedido.');
      return;
    }

    // Validação de desconto máximo
    const maxPct = companyInfo.maxDiscountPct;
    if (maxPct !== undefined && safeDiscPct > maxPct && onRequestDiscount) {
      setShowDiscountRequest(true);
      return;
    }

    const selectedPm = paymentMethods.find(p => p.id === paymentMethodId);

    const newSale: SalesOrder = {
      ...initialData,
      id: initialData?.id || crypto.randomUUID(),
      osNumber: osNumber || `OS-${Math.floor(Math.random() * 10000)}`,
      orderNumber: orderNumber || `PED-${Math.floor(Math.random() * 10000)}`,
      clientName: selectedClient.name,
      clientId: selectedClient.id,
      projectDescription: items.map(i => i.description).join(', '),
      material: items[0]?.description || '',
      materialArea: items.reduce((acc, i) => acc + (i.m2 || 0), 0),
      phase: saleType === 'Pedido' ? 'Serviço Lançado' : (initialData?.phase || 'Aprovação' as any),
      seller,
      createdAt: initialData?.createdAt || new Date().toISOString().split('T')[0],
      deadline: deliveryDeadline,
      priority: 'media',
      status: saleType,
      salesChannel: salesChannel,
      architectId: architectId,
      architectName: architect,
      items,
      paymentConditions,
      paymentMethodId: paymentMethodId || undefined,
      paymentMethodName: selectedPm?.name || '',
      paymentInstallments: paymentInstallments || undefined,
      firstDueDate: firstDueDate || undefined,
      deliveryDeadline,
      discountValue: calculatedDiscount,
      discountPercentage,
      totals: {
        vendas: subtotal,
        desconto: calculatedDiscount,
        geral: totalGeral
      },
      salesPhase,
      isOsGenerated: initialData?.isOsGenerated || false,
      imageUrls: initialData?.imageUrls || []
    };

    onSave(newSale);
    onClose();
  };

  const handleRevertConfirm = async () => {
    if (!revertJustification.trim()) { setRevertError('A justificativa é obrigatória.'); return; }
    if (!revertPassword) { setRevertError('Informe sua senha.'); return; }
    setRevertLoading(true);
    setRevertError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Usuário não identificado.');
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: revertPassword });
      if (error) throw new Error('Senha incorreta.');
      // Persist the revert BEFORE unlocking — if App.tsx blocks (e.g. paid installments), error appears here
      if (initialData) {
        await (onSave as (sale: SalesOrder) => Promise<any>)({
          ...initialData,
          status: 'Orçamento',
          observations: `[RETORNO] ${revertJustification}${initialData.observations ? '\n' + initialData.observations : ''}`
        });
      }
      // Only unlock after a successful save
      setSaleType('Orçamento');
      setIsLocked(false);
      setShowRevert(false);
      setRevertPassword('');
      setRevertJustification('');
    } catch (err: any) {
      setRevertError(err.message || 'Erro ao validar senha.');
    } finally {
      setRevertLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${saleType === 'Orçamento' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Manutenção de Venda</h2>
                {isLocked && (
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Lock size={9} /> Somente Leitura
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-0.5">
                <label className={`flex items-center gap-1.5 ${isLocked ? 'cursor-pointer' : 'cursor-pointer group'}`}>
                  <input
                    type="radio"
                    name="saleType"
                    className="w-3.5 h-3.5 text-[var(--primary-color)]"
                    checked={saleType === 'Orçamento'}
                    onChange={() => {
                      if (isLocked) {
                        setRevertPassword('');
                        setRevertJustification('');
                        setRevertError('');
                        setShowRevert(true);
                      } else {
                        setSaleType('Orçamento');
                      }
                    }}
                  />
                  <span className={`text-xs font-bold ${saleType === 'Orçamento' ? 'text-blue-600' : isLocked ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400'}`}>
                    {isLocked ? '⚠ Reverter para Orçamento' : 'Orçamento'}
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="saleType"
                    className="w-3.5 h-3.5 text-[var(--primary-color)]"
                    checked={saleType === 'Pedido'}
                    onChange={() => !isLocked && setSaleType('Pedido')}
                    disabled={isLocked}
                  />
                  <span className={`text-xs font-bold ${saleType === 'Pedido' ? 'text-green-600' : 'text-slate-400'}`}>Pedido</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedClient && (
              <div className="flex items-center gap-4 bg-orange-50/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-orange-100/50 dark:border-slate-700">
                <label className="flex items-center gap-2 px-3 cursor-pointer group" title="Embaçar as medidas (Comprimento e Largura) na impressão para proteger suas medições">
                  <input 
                    type="checkbox" 
                    checked={blurMeasurements}
                    onChange={(e) => setBlurMeasurements(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                  />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                    Ocultar Medidas
                  </span>
                </label>
                <div className="w-px h-6 bg-orange-200 dark:bg-slate-600"></div>
                <button
                  onClick={handlePrint}
                  className="p-2 text-[var(--primary-color)] hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[11px]"
                  title="Imprimir Orçamento"
                >
                  <Printer size={15} /> Imprimir
                </button>
                <div className="w-px h-6 bg-orange-200 dark:bg-slate-600"></div>
                <button
                  onClick={() => syncPricesWithMaterials()}
                  className="p-2 text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[11px]"
                  title="Sincronizar preços com o cadastro de materiais"
                >
                  <RotateCcw size={15} /> Atualizar Preços
                </button>
                {saleType === 'Pedido' && initialData?.id && createWorkOrders && (
                  <>
                    <div className="w-px h-6 bg-orange-200 dark:bg-slate-600"></div>
                    <button
                      onClick={() => setShowGenerateOS(true)}
                      className="p-2 text-emerald-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[11px]"
                      title="Gerar Ordens de Serviço de Produção"
                    >
                      <ClipboardList size={15} /> Gerar O.S.
                    </button>
                  </>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm">
              <X size={28} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isLocked ? 'pointer-events-none select-none opacity-80' : ''}`}>

          {/* Section 1: Header Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">
                  {saleType === 'Orçamento' ? 'Nº Orçamento' : 'Nº Pedido'}
                </label>
                <div className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent rounded-xl font-black text-slate-800 dark:text-white transition-all text-base flex items-center">
                  {orderNumber}
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Cliente</label>
                <div
                  onClick={() => setIsClientModalOpen(true)}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-[var(--primary-color)] rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-400 group-hover:text-[var(--primary-color)]" />
                    <span className={`font-bold text-sm ${selectedClient ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                      {selectedClient ? selectedClient.name : 'Selecionar Cliente...'}
                    </span>
                  </div>
                  <Search size={16} className="text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Canal de Venda</label>
                <select
                  value={salesChannel}
                  onChange={(e) => setSalesChannel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white transition-all appearance-none"
                >
                  <option value="">Selecione...</option>
                  {salesChannels.map(channel => (
                    <option key={channel.id} value={channel.name}>{channel.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Vendedor</label>
                <select
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white transition-all appearance-none"
                >
                  {appUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Arquiteto / Parceiro</label>
                <select
                  value={architect}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    setArchitect(selectedName);
                    const arch = architects.find(a => (a.tradingName || a.legalName) === selectedName);
                    setArchitectId(arch?.id || '');
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white transition-all appearance-none"
                >
                  <option value="">Nenhum parceiro</option>
                  {architects?.filter(a => a.status === 'ativo').map(a => (
                      <option key={a.id} value={a.tradingName || a.legalName}>
                        {a.tradingName || a.legalName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Fase do Orçamento</label>
                {isLocked ? (
                  <div className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm text-green-700 dark:text-green-400">
                    Ganho ✓
                  </div>
                ) : initialData?.status === 'Cancelado' ? (
                  <div className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm text-red-600 dark:text-red-400">
                    Perdido
                  </div>
                ) : (
                  <select
                    value={salesPhase}
                    onChange={(e) => setSalesPhase(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white transition-all appearance-none"
                  >
                    {salesPhases.map(phase => (
                      <option key={phase.name} value={phase.name}>{phase.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Items Grouped by Environment */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-4">
              {environments.map((env) => {
                const envItems = items.filter(i => (i.environment || 'Sem Ambiente') === env);
                const envTotal = envItems.reduce((acc, i) => acc + i.totalPrice, 0);

                return (
                  <div key={env} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 group/header">
                      {/* Esquerda: nome + contagem + ações */}
                      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                        <div className="w-1.5 h-7 bg-[var(--primary-color)] rounded-full flex-shrink-0"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{env}</h3>
                            <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                              <button
                                onClick={() => syncPricesWithMaterials(env)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Atualizar preços deste ambiente"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => renameEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                title="Renomear Ambiente"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => duplicateEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                title="Duplicar Ambiente"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={() => deleteEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Ambiente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {envItems.length} {envItems.length === 1 ? 'item' : 'itens'} lançados nesta área
                          </span>
                        </div>
                      </div>

                      {/* Centro: seletor de matéria prima */}
                      <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">Trocar Matéria Prima:</span>
                          <select
                            className="text-[10px] font-bold text-[var(--primary-color)] bg-transparent outline-none cursor-pointer max-w-[180px]"
                            value=""
                            onChange={(e) => {
                              const newMat = e.target.value;
                              if (!newMat) return;
                              const distinct = Array.from(new Set(envItems.map(i => i.materialName || '').filter(Boolean)));
                              if (distinct.length <= 1) {
                                updateEnvironmentMaterial(env, newMat, distinct.length === 1 ? distinct : undefined);
                              } else {
                                setMaterialSwap({ env, newMaterialName: newMat, toReplace: [] });
                              }
                            }}
                          >
                            <option value="">Selecione...</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Direita: subtotal */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-0.5">Subtotal {env}</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">R$ {(envTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <Droppable droppableId={env === 'Sem Ambiente' ? 'no-environment' : env}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className={`p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/30 dark:bg-orange-900/5' : ''}`}
                        >
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none border-b border-slate-50 dark:border-slate-800">
                                <th className="px-4 py-3">Descrição do Produto/Serviço</th>
                                <th className="px-4 py-3">Matéria Prima</th>
                                <th className="px-4 py-3 text-center">Qtde</th>
                                <th className="px-4 py-3 text-center">Comp.</th>
                                <th className="px-4 py-3 text-center">Larg.</th>
                                <th className="px-4 py-3 text-center">M² / Un</th>
                                <th className="px-4 py-3 text-right">Vl. Unit</th>
                                <th className="px-4 py-3 text-center">Ac. Serv (%)</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                              {envItems.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided, snapshot) => (
                                    <tr 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group ${editingItemId === item.id ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''} ${snapshot.isDragging ? 'bg-white dark:bg-slate-800 shadow-2xl opacity-80 scale-[1.02] border-2 border-[var(--primary-color)] rounded-xl' : ''}`}
                                    >
                                      <td className="px-4 py-3 text-[11px] font-bold text-slate-800 dark:text-white">{item.description}</td>
                                      <td className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        {materials.find(m => m.id === item.materialId)?.name || products.find(p => p.id === item.materialId)?.description || item.materialName || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300">{Number(item.quantity || 0).toFixed(2)}</td>
                                      {(() => {
                                        const isMat = materials.some(m => m.id === item.materialId);
                                        const missingLen = isMat && !(item.length > 0);
                                        const missingWid = isMat && !(item.width > 0);
                                        return (
                                          <>
                                            <td className={`px-4 py-3 text-center text-[11px] font-bold ${missingLen ? 'text-red-500 bg-red-50' : 'text-slate-600 dark:text-slate-300'}`}>
                                              {missingLen ? <span title="Comprimento obrigatório">⚠ 0.000</span> : Number(item.length).toFixed(3)}
                                            </td>
                                            <td className={`px-4 py-3 text-center text-[11px] font-bold ${missingWid ? 'text-red-500 bg-red-50' : 'text-slate-600 dark:text-slate-300'}`}>
                                              {missingWid ? <span title="Largura obrigatória">⚠ 0.000</span> : Number(item.width).toFixed(3)}
                                            </td>
                                          </>
                                        );
                                      })()}
                                      <td className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300">{Number(item.m2 || 0).toFixed(2) || '0.00'}</td>
                                      <td className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">R$ {(item.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="px-4 py-3 text-center text-[11px] font-bold text-blue-500">{item.servicePercentage || 0}%</td>
                                      <td className="px-4 py-3 text-right text-[11px] font-black text-slate-800 dark:text-white whitespace-nowrap">R$ {(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => {
                                              setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                              editItem(item);
                                            }} 
                                            className={`p-2 rounded-xl transition-all ${editingItemId === item.id ? 'text-orange-600 bg-orange-100' : 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                            title="Editar item"
                                          >
                                            <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => removeItem(item.id)} 
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="Excluir item"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                          <div className="p-2 text-slate-300 cursor-grab active:cursor-grabbing">
                                            <GripVertical size={16} />
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}

                              {/* Add Item Row per Environment */}
                              <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                                <td className="p-1.5 pl-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                      setProductSearch('');
                                      setProductPickerOpen(true);
                                    }}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none hover:border-[var(--primary-color)] transition-colors text-left truncate"
                                  >
                                    {activeEnvironment === (env === 'Sem Ambiente' ? '' : env) && itemDesc
                                      ? <span className="text-slate-800 dark:text-white">{itemDesc}</span>
                                      : <span className="text-slate-400">Descrição...</span>
                                    }
                                  </button>
                                </td>
                                <td className="p-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                      setMaterialSearch('');
                                      setMaterialPickerOpen(true);
                                    }}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none hover:border-[var(--primary-color)] transition-colors text-left truncate"
                                  >
                                    {activeEnvironment === (env === 'Sem Ambiente' ? '' : env) && itemMaterialId
                                      ? <span className="text-slate-800 dark:text-white">{itemMaterialId}</span>
                                      : <span className="text-slate-400">Matéria Prima...</span>
                                    }
                                  </button>
                                </td>
                                <td className="p-1.5"><input type="number" step="1" value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemQty : 1} onChange={e => setItemQty(parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" /></td>
                                <td className="p-1.5">
                                  {isProductMaterial && activeEnvironment === (env === 'Sem Ambiente' ? '' : env)
                                    ? <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] text-slate-400 text-center">—</div>
                                    : <input type="number" step="0.001" value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemLength : 0} onChange={e => setItemLength(parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" />
                                  }
                                </td>
                                <td className="p-1.5">
                                  {isProductMaterial && activeEnvironment === (env === 'Sem Ambiente' ? '' : env)
                                    ? <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] text-slate-400 text-center">—</div>
                                    : <input type="number" step="0.001" value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemWidth : 0} onChange={e => setItemWidth(parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" />
                                  }
                                </td>
                                <td className="p-1.5 text-center text-[10px] font-black text-slate-400">
                                  {isProductMaterial && activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? '—' : activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? calculateM2(itemLength, itemWidth, itemQty).toFixed(2) : '0.00'}
                                </td>
                                <td className="p-1.5"><input type="number" step="0.01" value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemPrice : 0} onChange={e => setItemPrice(parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-right" /></td>
                                <td className="p-1.5"><input type="number" step="0.1" value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemService : 0} onChange={e => setItemService(parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" /></td>
                                <td className="p-1.5 text-right text-[10px] font-black text-[var(--primary-color)] whitespace-nowrap">
                                  R$ {activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? (calculateItemTotal() || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                                </td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button 
                                      onClick={addItem} 
                                      className={`p-2 text-white rounded-xl shadow-lg transition-all active:scale-95 ${editingItemId && activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? 'bg-green-500 shadow-green-500/20' : 'bg-[var(--primary-color)] shadow-[var(--primary-color)]/20 hover:opacity-90'}`}
                                      title={editingItemId ? "Salvar Alteração" : "Adicionar Item"}
                                    >
                                      {editingItemId && activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? <Check size={16} /> : <Plus size={16} />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}

              {/* Add New Environment */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Nome do Novo Ambiente (ex: Lavanderia, Suíte Master...)"
                    value={newEnvironmentName}
                    onChange={e => setNewEnvironmentName(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white focus:border-[var(--primary-color)] transition-all"
                  />
                </div>
                <button
                  onClick={() => {
                    if (newEnvironmentName.trim()) {
                      setActiveEnvironment(newEnvironmentName.trim());
                      setNewEnvironmentName('');
                    }
                  }}
                  className="px-5 py-2.5 bg-white dark:bg-slate-800 text-[var(--primary-color)] border-2 border-orange-100 dark:border-slate-700 rounded-xl font-black text-sm hover:bg-orange-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <PlusCircle size={16} /> Criar Ambiente
                </button>
              </div>
            </div>
          </DragDropContext>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Observações</label>
                <textarea
                  value={paymentConditions}
                  onChange={e => setPaymentConditions(e.target.value)}
                  placeholder="Observações adicionais sobre o pagamento..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-xs text-slate-800 dark:text-white transition-all h-48 resize-none"
                ></textarea>
              </div>
              <div>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${!(parseInt(deliveryDeadline) > 0) ? 'text-red-400' : 'text-slate-400'}`}>
                  Prazo de Entrega {!(parseInt(deliveryDeadline) > 0) && <span className="normal-case font-bold">— obrigatório</span>}
                </label>
                <div className="relative w-40">
                  <input
                    type="number"
                    min="1"
                    value={deliveryDeadline}
                    onChange={e => setDeliveryDeadline(e.target.value)}
                    placeholder="0"
                    className={`w-full p-1.5 bg-slate-50 dark:bg-slate-800 border-2 focus:border-[var(--primary-color)] rounded-lg outline-none font-bold text-xs text-slate-800 dark:text-white transition-all ${!(parseInt(deliveryDeadline) > 0) ? 'border-red-300' : 'border-transparent'}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-wider pointer-events-none">dias úteis</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Bloco de Pagamento */}
              <div className={`rounded-xl p-3 space-y-2 border-2 ${saleType === 'Pedido' ? 'border-[var(--primary-color)]/30 bg-orange-50/40 dark:bg-slate-800/60' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${saleType === 'Pedido' ? 'text-[var(--primary-color)]' : 'text-slate-400'}`}>
                  Condições de Pagamento {saleType === 'Pedido' && <span className="text-red-400">*</span>}
                </p>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethodId}
                    onChange={e => {
                      const pm = paymentMethods.find(p => p.id === e.target.value);
                      setPaymentMethodId(e.target.value);
                      setPaymentInstallments(pm?.type === 'aprazo' ? (pm.installments ?? 1) : 1);
                    }}
                    className={`w-full p-1.5 bg-white dark:bg-slate-700 rounded-lg border-2 outline-none font-bold text-xs text-slate-800 dark:text-white appearance-none transition-all ${saleType === 'Pedido' && !paymentMethodId ? 'border-red-300' : 'border-transparent focus:border-[var(--primary-color)]'}`}
                  >
                    <option value="">-- Selecione --</option>
                    {paymentMethods.filter(p => p.active).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {paymentMethods.find(p => p.id === paymentMethodId)?.type === 'aprazo' && (
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Parcelas</label>
                    <select
                      value={paymentInstallments}
                      onChange={e => setPaymentInstallments(parseInt(e.target.value))}
                      className="w-full p-1.5 bg-white dark:bg-slate-700 rounded-lg border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-xs text-slate-800 dark:text-white appearance-none"
                    >
                      {Array.from({ length: paymentMethods.find(p => p.id === paymentMethodId)?.installments ?? 1 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n === 1 ? '1x (à vista)' : `${n}x`}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${saleType === 'Pedido' && !firstDueDate ? 'text-red-400' : 'text-slate-400'}`}>
                    Data do 1º Vencimento {saleType === 'Pedido' && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={e => setFirstDueDate(e.target.value)}
                    className={`w-full p-1.5 bg-white dark:bg-slate-700 rounded-lg border-2 outline-none font-bold text-xs text-slate-800 dark:text-white transition-all ${saleType === 'Pedido' && !firstDueDate ? 'border-red-300' : 'border-transparent focus:border-[var(--primary-color)]'}`}
                  />
                </div>
                {/* ── Preview de parcelas ao vivo ── */}
                {paymentMethodId && totalGeral > 0 && (() => {
                  const pm = paymentMethods.find(p => p.id === paymentMethodId);
                  if (!pm) return null;
                  const n = pm.type === 'aprazo' ? paymentInstallments : 1;
                  const baseValue = Math.floor((totalGeral / n) * 100) / 100;
                  const diff = Math.round((totalGeral - baseValue * n) * 100) / 100;
                  const fmtR = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const installmentValue = n > 1 ? baseValue + (diff > 0 ? diff : 0) : baseValue + diff;
                  return (
                    <div className="bg-[var(--primary-color)]/10 dark:bg-[var(--primary-color)]/20 rounded-lg p-2.5 border border-[var(--primary-color)]/20">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary-color)] mb-0.5">{pm.name}</p>
                      {n === 1 ? (
                        <p className="text-lg font-black text-[var(--primary-color)]">R$ {fmtR(totalGeral)} <span className="text-[10px] font-bold opacity-80 italic">à vista</span></p>
                      ) : (
                        <>
                          <p className="text-lg font-black text-[var(--primary-color)]">{n}x de R$ {fmtR(installmentValue)}</p>
                          <p className="text-[10px] text-[var(--primary-color)]/70 font-bold mt-0.5">Total: R$ {fmtR(totalGeral)}</p>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="font-bold text-[10px]">Total dos Itens</span>
                  <span className="font-black text-[10px]">R$ {(subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Desconto (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={discountPercentage ? Number(discountPercentage).toFixed(2) : ''}
                      onChange={e => {
                        const perc = parseFloat(e.target.value) || 0;
                        setDiscountPercentage(perc);
                        setDiscountValue(subtotal * (perc / 100));
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Valor Desconto (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={discountValue ? Number(discountValue).toFixed(2) : ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setDiscountValue(val);
                        setDiscountPercentage(subtotal > 0 ? (val / subtotal) * 100 : 0);
                      }}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Geral</span>
                    <p className="text-lg font-black text-[var(--primary-color)] tracking-tight">R$ {(totalGeral || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {isLocked ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-black">
                      <Eye size={14} /> Somente leitura — use "Reverter para Orçamento" para editar
                    </div>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="px-4 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-black shadow-xl shadow-[var(--primary-color)]/30 hover:opacity-90 transition-all flex items-center gap-2 text-xs"
                    >
                      <Save size={16} /> Gravar {saleType}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
            {initialData?.id && (
              <CRMSection 
                sale={initialData} 
                onSaveSale={onSave} 
                currentUser={appUsers.find(u => u.name === seller) || null}
              />
            )}
          </div>
        </div>
      </div>

      {isClientModalOpen && (
        <ClientSelectModal 
          clients={clients} 
          onSelect={(c) => { setSelectedClient(c); setIsClientModalOpen(false); }}
          onClose={() => setIsClientModalOpen(false)}
        />
      )}
      {printingSale && createPortal(
        <PrintBudget 
          sale={printingSale} 
          companyInfo={companyInfo} 
          materials={materials}
          client={clients.find(c => c.id === printingSale.clientId)}
          blurMeasurements={blurMeasurements}
        />,
        document.body
      )}

      {/* Discount Authorization Request Modal */}
      {showDiscountRequest && companyInfo.maxDiscountPct !== undefined && onRequestDiscount && (
        <DiscountRequestModal
          requestedPct={safeDiscPct}
          maxPct={companyInfo.maxDiscountPct}
          admins={appUsers.filter(u => u.role === 'admin' && u.status === 'ativo')}
          onRequest={(admin) => {
            onRequestDiscount(admin, safeDiscPct, companyInfo.maxDiscountPct!);
            setShowDiscountRequest(false);
          }}
          onRedo={() => setShowDiscountRequest(false)}
          onClose={() => setShowDiscountRequest(false)}
        />
      )}

      {/* Generate OS Modal */}
      {showGenerateOS && initialData?.id && companyId && createWorkOrders && (
        <GenerateOSModal
          sale={{ ...initialData, items, status: saleType, paymentConditions, deliveryDeadline } as any}
          companyId={companyId}
          existingOSMap={getEnvironmentOSMap ? getEnvironmentOSMap(initialData.id) : {}}
          onConfirm={async (groups) => {
            const success = await createWorkOrders(groups.map(g => ({
              saleId: initialData.id,
              saleOrderNumber: initialData.orderNumber,
              clientName: selectedClient?.tradingName || selectedClient?.legalName || initialData.clientName,
              clientId: initialData.clientId,
              sellerName: initialData.seller || undefined,
              deliveryDeadline: deliveryDeadline || initialData.deliveryDeadline,
              ...g,
            })));
            if (success) {
              setShowGenerateOS(false);
              alert(`${groups.length} O.S. gerada(s) com sucesso!`);
            }
          }}
          onClose={() => setShowGenerateOS(false)}
        />
      )}

      {/* Material Swap Modal */}
      {materialSwap && (() => {
        const envItems = items.filter(i => (i.environment || 'Sem Ambiente') === materialSwap.env);
        const distinctMaterials = Array.from(new Set(envItems.map(i => i.materialName || '').filter(Boolean)));
        return (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-800 dark:text-white">Trocar Matéria Prima</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione quais materiais serão substituídos por <strong className="text-[var(--primary-color)]">{materialSwap.newMaterialName}</strong>:
                </p>
              </div>
              <div className="px-6 py-4 space-y-2">
                {distinctMaterials.map(mat => (
                  <label key={mat} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                      checked={materialSwap.toReplace.includes(mat)}
                      onChange={e => setMaterialSwap(prev => prev ? {
                        ...prev,
                        toReplace: e.target.checked
                          ? [...prev.toReplace, mat]
                          : prev.toReplace.filter(m => m !== mat)
                      } : prev)}
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{mat}</span>
                    <span className="ml-auto text-xs text-slate-400">{envItems.filter(i => i.materialName === mat).length} item(s)</span>
                  </label>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setMaterialSwap(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={materialSwap.toReplace.length === 0}
                  onClick={() => {
                    updateEnvironmentMaterial(materialSwap.env, materialSwap.newMaterialName, materialSwap.toReplace);
                    setMaterialSwap(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--primary-color)] text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Substituir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Revert to Orçamento Modal */}
      {showRevert && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white">Reverter Pedido para Orçamento</h2>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Esta ação requer autenticação e justificativa</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Justificativa obrigatória</label>
                <textarea
                  autoFocus
                  value={revertJustification}
                  onChange={e => setRevertJustification(e.target.value)}
                  placeholder="Descreva o motivo do retorno deste pedido..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-amber-400 rounded-2xl outline-none font-medium text-sm text-slate-800 dark:text-white resize-none h-24 transition-all"
                ></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                  <Lock size={11} /> Sua senha do sistema
                </label>
                <input
                  type="password"
                  value={revertPassword}
                  onChange={e => setRevertPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRevertConfirm()}
                  placeholder="••••••••"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-amber-400 rounded-2xl outline-none font-bold text-slate-800 dark:text-white transition-all"
                />
              </div>
              {revertError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 text-xs font-bold">
                  <X size={14} /> {revertError}
                </div>
              )}
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setShowRevert(false)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                Cancelar
              </button>
              <button
                onClick={handleRevertConfirm}
                disabled={revertLoading || !revertJustification.trim() || !revertPassword}
                className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {revertLoading ? 'Validando...' : 'Confirmar Retorno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product/Service Picker Popup */}
      {productPickerOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight">Selecionar Produto / Serviço</h2>
                <p className="text-xs text-slate-500 font-medium">Pesquise e clique para selecionar</p>
              </div>
              <button onClick={() => setProductPickerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar produto ou serviço..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none transition-all font-medium text-sm text-slate-800 dark:text-white"
                />
              </div>
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                {(() => {
                  const allItems = (services || [])
                    .map(s => ({ label: s.description, type: 'Serviço', price: null as number | null }))
                    .filter(item => item.label.toLowerCase().includes(productSearch.toLowerCase()));
                  return allItems.length > 0 ? allItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setItemDesc(item.label);
                        setProductPickerOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-[var(--primary-color)]/5 transition-all text-left group"
                    >
                      <span className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-[var(--primary-color)]">{item.label}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:bg-[var(--primary-color)] group-hover:text-white transition-all">Serviço</span>
                    </button>
                  )) : (
                    <div className="py-10 text-center text-slate-400">
                      <p className="font-bold text-sm">Nenhum serviço encontrado</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Picker Popup */}
      {materialPickerOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight">Selecionar Material</h2>
                <p className="text-xs text-slate-500 font-medium">Matéria Prima, Acabamentos e Produtos de Revenda</p>
              </div>
              <button onClick={() => setMaterialPickerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar material..."
                  value={materialSearch}
                  onChange={e => setMaterialSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none transition-all font-medium text-sm text-slate-800 dark:text-white"
                />
              </div>
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                {(() => {
                  const q = materialSearch.toLowerCase();
                  const matItems = (materials || [])
                    .filter(m => m.name.toLowerCase().includes(q))
                    .map(m => ({ id: m.id, name: m.name, group: m.group || '', price: m.sellingPrice, badge: 'Matéria Prima' }));
                  const prodItems = (products || [])
                    .filter(p => (p.type === 'Acabamentos' || p.type === 'Produtos de Revenda') && p.description.toLowerCase().includes(q))
                    .map(p => ({ id: p.id, name: p.description, group: p.group || '', price: p.sellingPrice, badge: p.type }));
                  const allItems = [...matItems, ...prodItems];
                  return allItems.length > 0 ? allItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setItemMaterialId(item.name);
                        if (item.price) setItemPrice(item.price);
                        if (!itemDesc) setItemDesc(item.name);
                        // Clear dimensions if selecting a product (no m² needed)
                        if (item.badge === 'Acabamentos' || item.badge === 'Produtos de Revenda') {
                          setItemLength(0);
                          setItemWidth(0);
                        }
                        setMaterialPickerOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-[var(--primary-color)]/5 transition-all text-left group"
                    >
                      <div>
                        <span className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-[var(--primary-color)]">{item.name}</span>
                        {item.group && <span className="ml-2 text-[10px] text-slate-400 font-medium">{item.group}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-black text-[var(--primary-color)]">
                          {item.price ? `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-400">{item.badge}</span>
                      </div>
                    </button>
                  )) : (
                    <div className="py-10 text-center text-slate-400">
                      <p className="font-bold text-sm">Nenhum item encontrado</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
