import React, { useState, useEffect, useRef } from 'react';
import { X, User, ShoppingBag, Plus, Trash2, Calculator, Save, FileText, Search, Tag, Users, Printer, Edit2, RotateCcw, Check, GripVertical, PlusCircle, Copy, Pencil, Lock, AlertTriangle, Eye, ClipboardList, DollarSign } from 'lucide-react';
import { SalesOrder, OrderItem, Client, Architect, AppUser, SalesChannel, Material, ProductService, CompanyInfo, SalesPhaseConfig, ServiceGroup, PaymentMethod, WorkOrder, Authorization } from '../types';
import { ClientSelectModal } from './ClientSelectModal';
import { PrintBudget } from './PrintBudget';
import { GenerateOSModal } from './GenerateOSModal';
import { DiscountRequestModal, CommissionRequestModal } from './AuthModal';
import { CRMSection } from './CRMSection';
import { SaleAnalysisPanel } from './SaleAnalysisPanel';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

interface NewSaleModalProps {
  onClose: () => void;
  onSave: (sale: SalesOrder, keepOpen?: boolean) => void;
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
  onRequestCommission?: (admin: AppUser, requestedPct: number, maxPct: number) => void;
  canEditPrice?: boolean;
  currentUser: any;
  paidAmount?: number;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  onClose, onSave, clients, architects, appUsers, materials, products, services, salesChannels, paymentMethods, initialData, companyInfo, nextOrderNumber, salesPhases, readOnly = false,
  companyId, createWorkOrders, getEnvironmentOSMap, onRequestDiscount, onRequestCommission, canEditPrice = true, currentUser, paidAmount = 0
}) => {
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const handleCloseAttempt = () => {
    if (isEditMode) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };
  const [printingSale, setPrintingSale] = useState<SalesOrder | null>(null);
  const [blurMeasurements, setBlurMeasurements] = useState(false);
  const [hideM2Unit, setHideM2Unit] = useState(true);
  const [showGenerateOS, setShowGenerateOS] = useState(false);
  const [showDiscountRequest, setShowDiscountRequest] = useState(false);
  const [showCommissionRequest, setShowCommissionRequest] = useState(false);
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  // Revert-to-Orçamento flow (only when readOnly=true)
  const [isLocked, setIsLocked] = useState(readOnly && !(paidAmount > 0));
  const [showRevert, setShowRevert] = useState(false);
  const [revertPassword, setRevertPassword] = useState('');
  const [revertJustification, setRevertJustification] = useState('');
  const [revertError, setRevertError] = useState('');
  const [revertLoading, setRevertLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!initialData); // Nova venda (Edit) vs Existente (View)
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showArchCommPopover, setShowArchCommPopover] = useState(false);
  const archCommRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If the sale is a Pedido but has payments, we unlock it but show a warning
    if (initialData?.status === 'Pedido' && paidAmount > 0) {
      setIsLocked(false);
    }
  }, [initialData?.status, paidAmount]);

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
      architectCommissionPct: architect ? safeArchCommPct : 0,
      items,
      paymentConditions,
      deliveryDeadline,
      discountValue: calculatedDiscount,
      discountPercentage,
      deliveryFee: safeDeliveryFee,
      totals: {
        vendas: subtotal,
        desconto: calculatedDiscount,
        frete: safeDeliveryFee,
        comissaoArquiteto: architectCommissionValue > 0 ? architectCommissionValue : undefined,
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
  // Entrada (down payment)
  const [downPaymentEnabled, setDownPaymentEnabled] = useState(!!(initialData?.downPaymentValue && initialData.downPaymentValue > 0));
  const [downPaymentValue, setDownPaymentValue] = useState(initialData?.downPaymentValue || 0);
  const [downPaymentMethodId, setDownPaymentMethodId] = useState(initialData?.downPaymentMethodId || '');
  const [downPaymentDueDate, setDownPaymentDueDate] = useState(initialData?.downPaymentDueDate || '');
  const [deliveryDeadline, setDeliveryDeadline] = useState(initialData?.deliveryDeadline || '');
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue || 0);
  const [discountPercentage, setDiscountPercentage] = useState(initialData?.discountPercentage || 0);
  const [deliveryFee, setDeliveryFee] = useState(initialData?.deliveryFee || 0);
  const [architectCommissionPct, setArchitectCommissionPct] = useState(initialData?.architectCommissionPct || 0);
  const isNewSale = !initialData?.id;
  const [salesPhase, setSalesPhase] = useState<string>(
    initialData?.salesPhase || (salesPhases.find(p => p.name === 'Oportunidade')?.name ?? salesPhases[0]?.name ?? '')
  );

  // Form states for new item
  const [itemDesc, setItemDesc] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemLength, setItemLength] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemService, setItemService] = useState(0);
  const [itemServiceValue, setItemServiceValue] = useState(0);
  const [itemMaterialId, setItemMaterialId] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<string>('');
  const [newEnvironmentName, setNewEnvironmentName] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialSwap, setMaterialSwap] = useState<{ env: string; newMaterialName: string; toReplace: string[] } | null>(null);
  const [swapPickerEnv, setSwapPickerEnv] = useState<string | null>(null);

  // Refs for focus management
  const itemDescRef = useRef<HTMLInputElement>(null);
  const materialRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLInputElement>(null);
  const serviceValueRef = useRef<HTMLInputElement>(null);
  const newEnvRef = useRef<HTMLInputElement>(null);
  const clientBtnRef = useRef<HTMLButtonElement>(null);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [discountValueInput, setDiscountValueInput] = useState(initialData?.discountValue?.toString() || '');
  const [discountPercentageInput, setDiscountPercentageInput] = useState(initialData?.discountPercentage?.toString() || '');
  const [archCommPctInput, setArchCommPctInput] = useState(initialData?.architectCommissionPct?.toString() || '');
  const [archCommValueInput, setArchCommValueInput] = useState(initialData?.totals?.comissaoArquiteto?.toString() || '');

  // Prevent accidental close/refresh
  useEffect(() => {
    const hasUnsavedChanges = items.length > 0;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items.length]);

  // Handle clicks outside the architect commission popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (archCommRef.current && !archCommRef.current.contains(event.target as Node)) {
        setShowArchCommPopover(false);
      }
    };
    if (showArchCommPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showArchCommPopover]);

  const handleClose = () => {
    if (items.length > 0) {
      if (confirm('Existem itens no orçamento que podem ser perdidos. Tem certeza que deseja fechar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const environments = Array.from(new Set([...items.map(i => i.environment || 'Sem Ambiente'), activeEnvironment, newEnvironmentName].filter(Boolean))).sort((a, b) => a.localeCompare(b));

  // Sync commission inputs when needed
  useEffect(() => {
    if (initialData) {
      setArchCommPctInput(initialData.architectCommissionPct?.toString() || '');
      const commVal = initialData.totals?.comissaoArquiteto || (subtotal * ((initialData.architectCommissionPct || 0) / 100));
      setArchCommValueInput(commVal > 0 ? commVal.toFixed(2) : '');
    }
  }, [initialData?.id]);

  useEffect(() => {
    if (!architect) {
      setArchCommPctInput('');
      setArchCommValueInput('');
    }
  }, [architect]);

  // True when the selected material is an Acabamento or Produto de Revenda (no dimensions needed)
  const isProductMaterial = products.some(
    p => p.description === itemMaterialId
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
    
    // We prioritize the itemServiceValue (R$) if it was specifically edited, 
    // but the state is synced so we can use either.
    // Using baseTotal + itemServiceValue ensures precision when the user types in Reais.
    return baseTotal + itemServiceValue;
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

    // Find material in materials table OR in products
    const matFromMaterials = materials.find(m => m.name === itemMaterialId || m.id === itemMaterialId);
    const matFromProducts = products.find(p => p.description === itemMaterialId || p.id === itemMaterialId);
    
    // During edit, if the name matches the existing material name, we use the existing material ID as fallback
    const originalItem = items.find(i => i.id === editingItemId);
    const isSameMaterial = originalItem?.materialName === itemMaterialId;

    const resolvedMaterialId = matFromMaterials?.id || matFromProducts?.id || (isSameMaterial ? originalItem?.materialId : '');
    const resolvedMaterialName = matFromMaterials?.name || matFromProducts?.description || (isSameMaterial ? originalItem?.materialName : '');

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
    setItemServiceValue(0);
    setItemMaterialId('');
    
    // Auto-focus back to description for next item
    setTimeout(() => itemDescRef.current?.focus(), 100);
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
    const baseTotal = (item.m2 || item.quantity) ? ((item.m2 || 0) > 0 ? (item.m2 || 0) * item.unitPrice : item.quantity * item.unitPrice) : 0;
    setItemServiceValue(baseTotal * ((item.servicePercentage || 0) / 100));
    setActiveEnvironment(item.environment || '');
    // Preserve the material name already stored in the item
    setItemMaterialId(item.materialName || '');
  };

  const resetItemForm = () => {
    setItemDesc('');
    setItemQty(1);
    setItemLength(0);
    setItemWidth(0);
    setItemPrice(0);
    setItemService(0);
    setItemServiceValue(0);
    setItemMaterialId('');
    setEditingItemId(null);
  };

  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && itemDesc) {
      const combined = services.map(s => s.description);
      const filtered = combined.filter(d => d.toLowerCase().includes(itemDesc.toLowerCase()));
      if (filtered.length === 1 && itemDesc !== filtered[0]) {
        setItemDesc(filtered[0]);
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's a match, use it, otherwise open picker
      const combined = services.map(s => s.description);
      const filtered = combined.filter(d => d.toLowerCase().includes(itemDesc.toLowerCase()));
      if (filtered.length === 1) {
        setItemDesc(filtered[0]);
        materialRef.current?.focus();
      } else {
        setProductSearch(itemDesc);
        setProductPickerOpen(true);
      }
    }
  };

  const handleMaterialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const q = itemMaterialId.toLowerCase();
    const allMaterials = [
      ...(materials || []).map(m => ({ name: m.name, price: m.sellingPrice, isProduct: false })),
      ...(products || [])
        .filter(p => p.type === 'Acabamentos' || p.type === 'Produtos de Revenda')
        .map(p => ({ name: p.description, price: p.sellingPrice, isProduct: true })),
    ];
    if (e.key === 'Tab' && itemMaterialId) {
      const filtered = allMaterials.filter(m => m.name.toLowerCase().includes(q));
      if (filtered.length === 1 && itemMaterialId !== filtered[0].name) {
        const mat = filtered[0];
        setItemMaterialId(mat.name);
        if (mat.price) setItemPrice(mat.price);
        if (!itemDesc) setItemDesc(mat.name);
        if (mat.isProduct) { setItemLength(0); setItemWidth(0); }
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const filtered = allMaterials.filter(m => m.name.toLowerCase().includes(q));
      if (filtered.length === 1) {
        const mat = filtered[0];
        setItemMaterialId(mat.name);
        if (mat.price) setItemPrice(mat.price);
        if (!itemDesc) setItemDesc(mat.name);
        if (mat.isProduct) { setItemLength(0); setItemWidth(0); }
        qtyRef.current?.focus();
      } else {
        setMaterialSearch(itemMaterialId);
        setMaterialPickerOpen(true);
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
  
  // Lógica de desconto refinada: se o usuário digitou uma porcentagem, usamos ela.
  // Se digitou um valor em reais, calculamos a porcentagem correspondente para a trava.
  const safeDiscPct = isFinite(discountPercentage) ? discountPercentage : 0;
  const safeDiscVal = isFinite(discountValue)      ? discountValue      : 0;
  
  // Para evitar problemas de arredondamento e garantir que o valor que o usuário digitou
  // em reais seja o que realmente vai para o total, usamos o discountValue se ele existir.
  // Só usamos a porcentagem se ela for > 0 e o valor for 0 (caso clássico de carregar do banco só % se existisse)
  const calculatedDiscount = Math.max(safeDiscVal, subtotal * (safeDiscPct / 100));
  const safeDeliveryFee = isFinite(deliveryFee) && deliveryFee > 0 ? deliveryFee : 0;
  const maxCommPct = companyInfo.maxArchitectCommissionPct;
  const safeArchCommPct = architect
    ? Math.min(
        isFinite(architectCommissionPct) ? architectCommissionPct : 0,
        maxCommPct !== undefined ? maxCommPct : Infinity
      )
    : 0;
  const architectCommissionValue = subtotal * (safeArchCommPct / 100);
  const totalGeral = Math.max(0, subtotal - calculatedDiscount + safeDeliveryFee + architectCommissionValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (keepOpen: boolean = false) => {
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
    // Validação: nenhuma parcela pode estar em atraso
    if (saleType === 'Pedido' && firstDueDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const first = new Date(firstDueDate + 'T12:00:00'); first.setHours(0, 0, 0, 0);
      if (first < today) {
        alert(`A data do 1º vencimento (${first.toLocaleDateString('pt-BR')}) já está em atraso.\n\nVolte para Orçamento e redefina as condições de pagamento.`);
        return;
      }
    }
    // Validação da entrada
    if (saleType === 'Pedido' && downPaymentEnabled) {
      if (!downPaymentValue || downPaymentValue <= 0) {
        alert('Informe o valor da entrada.');
        return;
      }
      if (downPaymentValue >= totalGeral) {
        alert('O valor da entrada não pode ser igual ou maior que o total do pedido.');
        return;
      }
      if (!downPaymentMethodId) {
        alert('Informe a forma de pagamento da entrada.');
        return;
      }
      if (!downPaymentDueDate) {
        alert('Informe a data de vencimento da entrada.');
        return;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dpDate = new Date(downPaymentDueDate + 'T12:00:00'); dpDate.setHours(0, 0, 0, 0);
      if (dpDate < today) {
        alert(`A data de vencimento da entrada (${dpDate.toLocaleDateString('pt-BR')}) já está em atraso.\n\nRedefina a data da entrada.`);
        return;
      }
    }

    // Validação de desconto máximo
    const maxPct = companyInfo.maxDiscountPct;
    if (maxPct !== undefined && safeDiscPct > (maxPct + 0.01) && onRequestDiscount && !isAdminUser) {
      setShowDiscountRequest(true);
      return;
    }

    // Validação de comissão máxima (novo fluxo)
    if (maxCommPct !== undefined && safeArchCommPct > (maxCommPct + 0.01) && onRequestCommission && !isAdminUser) {
      setShowCommissionRequest(true);
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
      architectCommissionPct: architect ? safeArchCommPct : 0,
      items: [...items].sort((a, b) => (a.environment || '').localeCompare(b.environment || '')),
      paymentConditions,
      paymentMethodId: paymentMethodId || undefined,
      paymentMethodName: selectedPm?.name || '',
      paymentInstallments: paymentInstallments || undefined,
      firstDueDate: firstDueDate || undefined,
      downPaymentValue: downPaymentEnabled && downPaymentValue > 0 ? downPaymentValue : undefined,
      downPaymentMethodId: downPaymentEnabled ? downPaymentMethodId || undefined : undefined,
      downPaymentMethodName: downPaymentEnabled ? paymentMethods.find(p => p.id === downPaymentMethodId)?.name : undefined,
      downPaymentDueDate: downPaymentEnabled ? downPaymentDueDate || undefined : undefined,
      deliveryDeadline,
      discountValue: calculatedDiscount,
      discountPercentage,
      deliveryFee: safeDeliveryFee || undefined,
      totals: {
        vendas: subtotal,
        desconto: calculatedDiscount,
        frete: safeDeliveryFee,
        comissaoArquiteto: architectCommissionValue > 0 ? architectCommissionValue : undefined,
        geral: totalGeral
      },
      salesPhase,
      isOsGenerated: initialData?.isOsGenerated || false,
      imageUrls: initialData?.imageUrls || []
    };

    setIsSaving(true);
    try {
      await onSave(newSale, keepOpen);
      if (keepOpen) {
        alert('Orçamento gravado com sucesso!');
      } else {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
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
          salesPhase: 'Negociação',
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
            <div className={`p-2 rounded-xl ${saleType === 'Orçamento' ? 'bg-blue-100 text-black' : 'bg-green-100 text-black'}`}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-black dark:text-white tracking-tight">Manutenção de Venda</h2>
                {isLocked && (
                  <span className="flex items-center gap-1 bg-green-100 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Lock size={9} /> Somente Leitura
                  </span>
                )}
                {paidAmount > 0 && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    <AlertTriangle size={10} /> Ajuste Financeiro Ativo
                  </span>
                )}
              </div>
              {paidAmount > 0 && (
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                  Este pedido possui pagamentos. Alterações de valor serão reconciliadas automaticamente nas parcelas pendentes.
                </p>
              )}
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
                  <span className={`text-xs font-bold ${saleType === 'Orçamento' ? 'text-black' : isLocked ? 'text-black hover:text-amber-600' : 'text-black'}`}>
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
                  <span className={`text-xs font-bold ${saleType === 'Pedido' ? 'text-black' : 'text-black'}`}>Pedido</span>
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
                  <span className="text-[11px] font-bold text-black dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                    Ocultar Medidas
                  </span>
                </label>
                <div className="w-px h-6 bg-orange-200 dark:bg-slate-600"></div>
                <label className="flex items-center gap-2 px-3 cursor-pointer group" title="Ocultar a coluna de Metragem Quadrada / Unidade">
                  <input 
                    type="checkbox" 
                    checked={hideM2Unit}
                    onChange={(e) => setHideM2Unit(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                  />
                  <span className="text-[11px] font-bold text-black dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                    Ocultar M² / Unidade
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
                  className="p-2 text-black hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[11px]"
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
            <button onClick={handleCloseAttempt} className="p-3 text-black hover:text-black dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm">
              <X size={28} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${(!isEditMode && !isLocked) ? 'opacity-95 select-none' : isLocked ? 'pointer-events-none select-none opacity-80' : ''}`}>
           {(!isEditMode && !isLocked) && (
             <div 
               className="absolute inset-0 z-50 cursor-pointer" 
               onClick={() => setIsEditMode(true)}
               title="Clique em 'Alterar' no rodapé para editar"
             />
           )}

          {/* Section 1: Header Info (Sticky) */}
          <div className="sticky top-0 z-[20] bg-white dark:bg-slate-900 px-4 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1 block">
                  {saleType === 'Orçamento' ? 'Nº Orçamento' : 'Nº Pedido'}
                </label>
                <div className="w-full p-2.5 bg-slate-200/50 dark:bg-slate-800/80 border-2 border-transparent rounded-xl font-black text-black dark:text-white transition-all text-base flex items-center">
                  {orderNumber}
                </div>
              </div>

              <div className="md:col-span-7">
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1 block">Cliente</label>
                <button
                  type="button"
                  ref={clientBtnRef}
                  onClick={() => setIsClientModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key.length === 1) {
                      setIsClientModalOpen(true);
                    }
                  }}
                  className="flex items-center justify-between w-full p-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent hover:border-[var(--primary-color)] focus:border-[var(--primary-color)] rounded-xl cursor-pointer transition-all group outline-none"
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-black group-hover:text-[var(--primary-color)]" />
                    <span className={`font-bold text-sm ${selectedClient ? 'text-black dark:text-white' : 'text-black'}`}>
                      {selectedClient ? selectedClient.name : 'Selecionar Cliente...'}
                    </span>
                  </div>
                  <Search size={16} className="text-black" />
                </button>
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1 block">Canal de Venda</label>
                <select
                  value={salesChannel}
                  onChange={(e) => setSalesChannel(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-black dark:text-white transition-all appearance-none"
                >
                  <option value="">Selecione...</option>
                  {salesChannels.map(channel => (
                    <option key={channel.id} value={channel.name}>{channel.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1 block">Vendedor</label>
                <select
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-black dark:text-white transition-all appearance-none"
                >
                  {appUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1 block">Arquiteto / Parceiro</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={architect}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        setArchitect(selectedName);
                        const arch = architects.find(a => (a.tradingName || a.legalName) === selectedName);
                        setArchitectId(arch?.id || '');
                        if (!selectedName) setArchitectCommissionPct(0);
                      }}
                      className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-black dark:text-white transition-all appearance-none"
                    >
                      <option value="">Nenhum parceiro</option>
                      {architects?.filter(a => a.status === 'ativo').map(a => (
                          <option key={a.id} value={a.tradingName || a.legalName}>
                            {a.tradingName || a.legalName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="relative" ref={archCommRef}>
                    <button
                      type="button"
                      onClick={() => architect && setShowArchCommPopover(!showArchCommPopover)}
                      disabled={!architect}
                      className={`p-3 rounded-xl transition-all shadow-sm flex items-center justify-center ${!architect ? 'opacity-30 bg-slate-100' : showArchCommPopover ? 'bg-amber-100 text-amber-700 scale-110 shadow-lg' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                      title="Editar Comissão (RT)"
                    >
                      <DollarSign size={18} />
                    </button>

                    {showArchCommPopover && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-[#fff9f0] dark:bg-slate-800 border-2 border-amber-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in duration-200">
                        <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Calculator size={12} /> Comissão - Arquiteto (RT)
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-amber-900/60 dark:text-slate-400 uppercase mb-1 block">Porcentagem (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={maxCommPct ?? 100}
                                step="0.1"
                                value={archCommPctInput}
                                onChange={e => {
                                  const valStr = e.target.value;
                                  setArchCommPctInput(valStr);
                                  let perc = parseFloat(valStr) || 0;
                                  if (!isAdminUser && maxCommPct !== undefined && perc > maxCommPct) perc = maxCommPct;
                                  setArchitectCommissionPct(perc);
                                  const valNum = subtotal * (perc / 100);
                                  setArchCommValueInput(valNum > 0 ? valNum.toFixed(2) : '');
                                }}
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-700 rounded-lg outline-none font-bold text-sm text-black dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900/60 dark:text-slate-400 uppercase mb-1 block">Valor ($)</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={archCommValueInput}
                                onChange={e => {
                                  const valStr = e.target.value;
                                  setArchCommValueInput(valStr);
                                  const valNum = parseFloat(valStr) || 0;
                                  let perc = subtotal > 0 ? (valNum / subtotal) * 100 : 0;
                                  if (!isAdminUser && maxCommPct !== undefined && perc > maxCommPct) {
                                    perc = maxCommPct;
                                    setArchCommPctInput(perc.toString());
                                    const cappedVal = subtotal * (perc / 100);
                                    setArchCommValueInput(cappedVal.toFixed(2));
                                  } else {
                                    setArchCommPctInput(perc > 0 ? perc.toFixed(2) : '');
                                  }
                                  setArchitectCommissionPct(perc);
                                }}
                                className="w-full p-2 pl-5 bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-700 rounded-lg outline-none font-bold text-sm text-black dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                        {maxCommPct !== undefined && (
                          <p className="text-[8px] font-bold text-amber-600 mt-2 text-right">
                            RT Máxima: {maxCommPct}%
                          </p>
                        )}
                        <button
                          onClick={() => setShowArchCommPopover(false)}
                          className="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase transition-colors"
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1 block">Fase do Orçamento</label>
                {isLocked ? (
                  <div className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm text-black dark:text-green-400">
                    Ganho ✓
                  </div>
                ) : initialData?.status === 'Cancelado' ? (
                  <div className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm text-red-600 dark:text-red-400">
                    Perdido
                  </div>
                ) : isNewSale ? (
                  <div className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm text-slate-400 flex items-center justify-between">
                    <span className="text-black dark:text-white">{salesPhase}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Salve para alterar</span>
                  </div>
                ) : (
                  <select
                    value={salesPhase}
                    onChange={(e) => setSalesPhase(e.target.value)}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-sm text-black dark:text-white transition-all appearance-none"
                  >
                    {salesPhases.map(phase => (
                      <option key={phase.name} value={phase.name}>{phase.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div> {/* Fim do Sticky Header (line 856) */}

          <div className="p-4 space-y-6">
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
                            <h3 className="text-xs font-black text-black dark:text-slate-200 uppercase tracking-widest">{env}</h3>
                            <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                              <button
                                onClick={() => syncPricesWithMaterials(env)}
                                className="p-1.5 text-black hover:text-black hover:bg-blue-50 rounded-lg transition-all"
                                title="Atualizar preços deste ambiente"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => renameEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                className="p-1.5 text-black hover:text-black hover:bg-blue-50 rounded-lg transition-all"
                                title="Renomear Ambiente"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => duplicateEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                className="p-1.5 text-black hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                title="Duplicar Ambiente"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={() => deleteEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                className="p-1.5 text-black hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Ambiente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-black">
                            {envItems.length} {envItems.length === 1 ? 'item' : 'itens'} lançados nesta área
                          </span>
                        </div>
                      </div>

                      {/* Centro: seletor de matéria prima */}
                      <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-[9px] font-black text-black uppercase tracking-tighter whitespace-nowrap">Trocar Matéria Prima:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSwapPickerEnv(env === 'Sem Ambiente' ? '' : env);
                              setMaterialSearch('');
                              setMaterialPickerOpen(true);
                            }}
                            className="text-[10px] font-bold text-[var(--primary-color)] bg-transparent outline-none cursor-pointer flex items-center gap-1 hover:opacity-70 transition-opacity"
                          >
                            <Search size={11} />
                            Selecione...
                          </button>
                        </div>
                      </div>

                      {/* Direita: subtotal */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-[9px] font-black text-black uppercase block leading-none mb-0.5">Subtotal {env}</span>
                        <span className="text-base font-black text-black dark:text-white">R$ {(envTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                              <tr className="text-[10px] font-black text-black uppercase tracking-widest leading-none border-b border-slate-50 dark:border-slate-800">
                                <th className="px-3 py-3 w-[160px]">Item</th>
                                <th className="px-3 py-3 w-[200px]">Matéria Prima</th>
                                <th className="px-3 py-3 text-center w-[60px]">Qtde</th>
                                <th className="px-3 py-3 text-center w-[70px]">Comp.</th>
                                <th className="px-3 py-3 text-center w-[70px]">Larg.</th>
                                <th className="px-3 py-3 text-center w-[60px] whitespace-nowrap">M² / Un</th>
                                <th className="px-3 py-3 text-right w-[80px]">Vl. Unit</th>
                                <th className="px-3 py-3 text-center w-[105px]">% / R$</th>
                                <th className="px-3 py-3 text-right w-[90px]">Total</th>
                                <th className="px-3 py-3 text-center w-[60px]">Ações</th>
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
                                      <td className="px-3 py-3 text-[11px] font-bold text-black dark:text-white w-[160px] max-w-[160px] truncate">{item.description}</td>
                                      <td className="px-3 py-3 text-[11px] font-bold text-black dark:text-slate-300 w-[200px] max-w-[200px] truncate">
                                        {materials.find(m => m.id === item.materialId)?.name || products.find(p => p.id === item.materialId)?.description || item.materialName || '-'}
                                      </td>
                                      <td className="px-3 py-3 text-center text-[11px] font-bold text-black dark:text-slate-300">{Number(item.quantity || 0).toFixed(2)}</td>
                                      {(() => {
                                        const isMat = materials.some(m => m.id === item.materialId);
                                        const missingLen = isMat && !(item.length > 0);
                                        const missingWid = isMat && !(item.width > 0);
                                        return (
                                          <>
                                            <td className={`px-3 py-3 text-center text-[11px] font-bold ${missingLen ? 'text-red-500 bg-red-50' : 'text-black dark:text-slate-300'}`}>
                                              {missingLen ? <span title="Comprimento obrigatório">⚠ 0.000</span> : Number(item.length).toFixed(3)}
                                            </td>
                                            <td className={`px-3 py-3 text-center text-[11px] font-bold ${missingWid ? 'text-red-500 bg-red-50' : 'text-black dark:text-slate-300'}`}>
                                              {missingWid ? <span title="Largura obrigatória">⚠ 0.000</span> : Number(item.width).toFixed(3)}
                                            </td>
                                          </>
                                        );
                                      })()}
                                      <td className="px-3 py-3 text-center text-[11px] font-bold text-black dark:text-slate-300">{Number(item.m2 || 0).toFixed(2) || '0.00'}</td>
                                      <td className="px-3 py-3 text-right text-[11px] font-bold text-black dark:text-slate-300">R$ {(item.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-3 text-center text-[10px] whitespace-nowrap w-[80px]">
                                        <div className="flex flex-col items-center">
                                          <span className="font-bold text-black">{Number(item.servicePercentage || 0).toFixed(2)}%</span>
                                          <span className="text-[9px] font-black text-black">
                                            {(() => {
                                              const bTotal = (item.m2 || item.quantity) ? ((item.m2 || 0) > 0 ? (item.m2 || 0) * item.unitPrice : item.quantity * item.unitPrice) : 0;
                                              return `R$ ${(bTotal * ((item.servicePercentage || 0) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                            })()}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 text-right text-[11px] font-black text-black dark:text-white whitespace-nowrap">R$ {(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="px-3 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => {
                                              setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                              editItem(item);
                                            }} 
                                            className={`p-2 rounded-xl transition-all ${editingItemId === item.id ? 'text-orange-600 bg-orange-100' : 'text-blue-400 hover:text-black hover:bg-blue-50'}`}
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
                                  <div className="relative group">
                                    <input
                                      type="text"
                                      ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemDescRef : null}
                                      placeholder="Descrição..."
                                      value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemDesc : ''}
                                      onChange={e => {
                                        setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                        setItemDesc(e.target.value);
                                      }}
                                      onKeyDown={handleDescKeyDown}
                                      onFocus={() => setActiveEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                      autoComplete="off"
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] transition-colors pr-8"
                                    />
                                    <button
                                      type="button"
                                      tabIndex={-1}
                                      onClick={() => {
                                        setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                        setProductSearch(itemDesc);
                                        setProductPickerOpen(true);
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[var(--primary-color)] p-1"
                                    >
                                      <Search size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-1.5 min-w-[350px]">
                                  <div className="relative group">
                                    <input
                                      type="text"
                                      ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? materialRef : null}
                                      placeholder="Matéria Prima..."
                                      value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemMaterialId : ''}
                                      onChange={e => {
                                        setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                        setItemMaterialId(e.target.value);
                                      }}
                                      onKeyDown={handleMaterialKeyDown}
                                      onFocus={() => setActiveEnvironment(env === 'Sem Ambiente' ? '' : env)}
                                      autoComplete="off"
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] transition-colors pr-8 text-black"
                                    />
                                    <button
                                      type="button"
                                      tabIndex={-1}
                                      onClick={() => {
                                        setActiveEnvironment(env === 'Sem Ambiente' ? '' : env);
                                        setMaterialSearch(itemMaterialId);
                                        setMaterialPickerOpen(true);
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-black hover:text-[var(--primary-color)] p-1"
                                    >
                                      <Search size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-1.5"><input type="number" step="1" ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? qtyRef : null} value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemQty : 1} onFocus={() => setActiveEnvironment(env === 'Sem Ambiente' ? '' : env)} onChange={e => setItemQty(parseFloat(e.target.value))} onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const next = isProductMaterial ? priceRef.current : lengthRef.current;
                                    next ? next.focus() : addItem();
                                  }
                                }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" /></td>
                                <td className="p-1.5">
                                  {isProductMaterial && activeEnvironment === (env === 'Sem Ambiente' ? '' : env)
                                    ? <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] text-black text-center">—</div>
                                    : <input type="number" step="0.001" ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? lengthRef : null} value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemLength : 0} onChange={e => setItemLength(parseFloat(e.target.value))} onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          widthRef.current?.focus();
                                        }
                                      }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" />
                                  }
                                </td>
                                <td className="p-1.5">
                                  {isProductMaterial && activeEnvironment === (env === 'Sem Ambiente' ? '' : env)
                                    ? <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] text-black text-center">—</div>
                                    : <input type="number" step="0.001" ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? widthRef : null} value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemWidth : 0} onChange={e => setItemWidth(parseFloat(e.target.value))} onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          priceRef.current?.focus();
                                        }
                                      }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-center" />
                                  }
                                </td>
                                <td className="p-1.5 text-center text-[10px] font-black text-black">
                                  {isProductMaterial && activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? '—' : activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? calculateM2(itemLength, itemWidth, itemQty).toFixed(2) : '0.00'}
                                </td>
                                <td className="p-1.5"><input type="number" step="0.01" ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? priceRef : null} value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? itemPrice : 0} onChange={e => setItemPrice(parseFloat(e.target.value))} onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    serviceRef.current?.focus();
                                  }
                                }} 
                                readOnly={!canEditPrice && !!itemMaterialId}
                                className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] font-bold outline-none focus:border-[var(--primary-color)] text-right transition-all ${!canEditPrice && !!itemMaterialId ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} /></td>
                                <td className="p-1 w-[80px]">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <input 
                                      type="number" 
                                      step="0.1" 
                                      ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? serviceRef : null} 
                                      value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? (Number.isInteger(itemService) ? itemService : itemService.toFixed(2)) : 0} 
                                      onChange={e => {
                                        const perc = parseFloat(e.target.value) || 0;
                                        setItemService(perc);
                                        const m2 = calculateM2(itemLength, itemWidth, itemQty);
                                        const baseTotal = m2 > 0 ? (m2 * itemPrice) : (itemQty * itemPrice);
                                        setItemServiceValue(baseTotal * (perc / 100));
                                      }} 
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          serviceValueRef.current?.focus();
                                        }
                                      }} 
                                      className="w-[36px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-0.5 py-1.5 text-[10px] font-bold outline-none focus:border-[var(--primary-color)] text-center transition-all text-black"
                                      placeholder="%"
                                    />
                                    <input 
                                      type="text" 
                                      ref={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) ? serviceValueRef : null}
                                      value={activeEnvironment === (env === 'Sem Ambiente' ? '' : env) && itemServiceValue > 0 ? itemServiceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                                      onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        const val = parseInt(raw || '0') / 100;
                                        setItemServiceValue(val);
                                        const m2 = calculateM2(itemLength, itemWidth, itemQty);
                                        const baseTotal = m2 > 0 ? (m2 * itemPrice) : (itemQty * itemPrice);
                                        const perc = baseTotal > 0 ? (val / baseTotal) * 100 : 0;
                                        setItemService(parseFloat(perc.toFixed(2)));
                                      }}
                                      onKeyDown={e => e.key === 'Enter' && addItem()}
                                      className="w-[62px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-0.5 py-1.5 text-[10px] font-bold outline-none focus:border-[var(--primary-color)] text-right transition-all text-black"
                                      placeholder="R$ 0,00"
                                    />
                                  </div>
                                </td>
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
                    ref={newEnvRef}
                    placeholder="Nome do Novo Ambiente (ex: Lavanderia, Suíte Master...)"
                    value={newEnvironmentName}
                    onChange={e => setNewEnvironmentName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newEnvironmentName.trim()) {
                        const envName = newEnvironmentName.trim();
                        setActiveEnvironment(envName);
                        setNewEnvironmentName('');
                        // Focus the first item field of the newly created environment table
                        setTimeout(() => itemDescRef.current?.focus(), 100);
                      }
                    }}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl outline-none font-bold text-sm text-black dark:text-white focus:border-[var(--primary-color)] transition-all"
                  />
                </div>
                <button
                  onClick={() => {
                    if (newEnvironmentName.trim()) {
                      const envName = newEnvironmentName.trim();
                      setActiveEnvironment(envName);
                      setNewEnvironmentName('');
                      setTimeout(() => itemDescRef.current?.focus(), 100);
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
                <label className="text-[9px] font-black text-black uppercase tracking-[0.2em] mb-1 block">Observações</label>
                <textarea
                  value={paymentConditions}
                  onChange={e => setPaymentConditions(e.target.value)}
                  placeholder="Observações adicionais sobre o pagamento..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none font-bold text-xs text-black dark:text-white transition-all h-24 resize-none"
                ></textarea>
              </div>

              {/* Totais, Descontos e Botões (Movido para cá) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-3">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="font-bold text-[10px]">Total dos Itens</span>
                  <span className="font-black text-[10px]">R$ {(subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[9px] font-black text-black uppercase whitespace-nowrap">Frete / Entrega (R$)</label>
                  <input
                    type="text"
                    value={deliveryFee > 0 ? deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setDeliveryFee(parseInt(raw || '0') / 100);
                    }}
                    className="w-[120px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-black dark:text-white text-right"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-black uppercase mb-1 block">Desconto (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={discountPercentageInput}
                      onChange={e => {
                        const valStr = e.target.value;
                        setDiscountPercentageInput(valStr);
                        const perc = parseFloat(valStr) || 0;
                        setDiscountPercentage(perc);
                        const valNum = subtotal * (perc / 100);
                        setDiscountValue(valNum);
                        setDiscountValueInput(valNum > 0 ? valNum.toFixed(2) : '');
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-black dark:text-white font-premium"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-black uppercase mb-1 block font-premium">Valor Desconto (R$)</label>
                    <input 
                      type="text" 
                      value={discountValue > 0 ? discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '');
                        const val = parseInt(raw || '0') / 100;
                        setDiscountValue(val);
                        setDiscountValueInput(val > 0 ? val.toString() : '');
                        const perc = subtotal > 0 ? (val / subtotal) * 100 : 0;
                        setDiscountPercentage(perc);
                        setDiscountPercentageInput(perc > 0 ? perc.toFixed(2) : '');
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-black dark:text-white font-premium"
                      placeholder="R$ 0,00"
                    />
                    {companyInfo.maxDiscountPct !== undefined && (
                      <div className="mt-1 flex justify-between items-center px-1">
                        <span className="text-[8px] font-bold text-black uppercase">Limite ({companyInfo.maxDiscountPct}%)</span>
                        <span className="text-[8px] font-black text-slate-500">
                          R$ {(subtotal * (companyInfo.maxDiscountPct / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {architectCommissionValue > 0 && (
                  <div className="flex items-center justify-between gap-3 text-amber-700 dark:text-amber-400">
                    <span className="text-[9px] font-black uppercase">Comissão Arquiteto ({safeArchCommPct.toFixed(1)}%)</span>
                    <span className="text-[10px] font-black">+ $ {architectCommissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block mb-0.5">Total Geral</span>
                    <p className="text-xl font-black text-black tracking-tight">R$ {(totalGeral || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {isLocked ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-black dark:text-green-400 text-[10px] font-black">
                      <Eye size={14} /> Somente leitura
                    </div>
                  ) : !isEditMode ? (
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => setIsEditMode(true)}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 text-[10px]"
                      >
                        <Pencil size={14} /> Alterar
                      </button>
                      <button
                        onClick={onClose}
                        className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[10px]"
                      >
                        Sair
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className={`px-4 py-2.5 border-2 rounded-xl font-black transition-all flex items-center gap-2 text-[10px] disabled:opacity-50 ${paidAmount > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 text-amber-700' : 'bg-white dark:bg-slate-800 border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-slate-700'}`}
                      >
                        {isSaving ? '...' : paidAmount > 0 ? 'Recon.' : 'Gravar'}
                      </button>
                      <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className={`px-4 py-2.5 text-white rounded-xl font-black shadow-xl transition-all flex items-center gap-2 text-[10px] disabled:opacity-50 ${paidAmount > 0 ? 'bg-amber-600 shadow-amber-600/30 hover:bg-amber-700' : 'bg-[var(--primary-color)] shadow-[var(--primary-color)]/30 hover:opacity-90'}`}
                      >
                        {isSaving ? '...' : paidAmount > 0 ? 'Concluir' : 'Gravar e Sair'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 block text-black">
                  Prazo de Entrega
                </label>
                <div className="relative w-28">
                  <input
                    type="number"
                    min="1"
                    value={deliveryDeadline}
                    onChange={e => setDeliveryDeadline(e.target.value)}
                    placeholder="0"
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border-2 focus:border-[var(--primary-color)] rounded-lg outline-none font-bold text-xs text-black dark:text-white transition-all border-transparent pr-10"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-black uppercase tracking-wider pointer-events-none">d.úteis</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Bloco de Pagamento */}
              <div className={`rounded-xl p-3 space-y-2 border-2 ${saleType === 'Pedido' ? 'border-[var(--primary-color)]/30 bg-orange-50/40 dark:bg-slate-800/60' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${saleType === 'Pedido' ? 'text-[var(--primary-color)]' : 'text-black'}`}>
                  Condições de Pagamento
                </p>
                {/* ── Entrada ── */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={downPaymentEnabled}
                      onChange={e => setDownPaymentEnabled(e.target.checked)}
                      className="accent-[var(--primary-color)] w-3.5 h-3.5"
                    />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cobrar Entrada</span>
                  </label>
                </div>
                {downPaymentEnabled && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Entrada</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-black uppercase tracking-widest block mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={downPaymentValue || ''}
                          onChange={e => setDownPaymentValue(parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border-2 border-transparent focus:border-amber-400 outline-none font-bold text-xs text-black transition-all"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-black uppercase tracking-widest block mb-1">Vencimento</label>
                        <input
                          type="date"
                          value={downPaymentDueDate}
                          onChange={e => setDownPaymentDueDate(e.target.value)}
                          className="w-full p-1.5 bg-white rounded-lg border-2 border-transparent focus:border-amber-400 outline-none font-bold text-xs text-black transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-black uppercase tracking-widest block mb-1">Forma de Pag. da Entrada</label>
                      <select
                        value={downPaymentMethodId}
                        onChange={e => setDownPaymentMethodId(e.target.value)}
                        className="w-full p-1.5 bg-white rounded-lg border-2 border-transparent focus:border-amber-400 outline-none font-bold text-xs text-black appearance-none transition-all"
                      >
                        <option value="">-- Selecione --</option>
                        {paymentMethods.filter(p => p.active).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className={`${paymentMethods.find(p => p.id === paymentMethodId)?.type === 'aprazo' ? 'md:col-span-6' : 'md:col-span-8'}`}>
                    <label className="text-[9px] font-bold text-black uppercase tracking-widest block mb-1">Forma de Pagamento{downPaymentEnabled && downPaymentValue > 0 ? ' do Restante' : ''}</label>
                    <select
                      value={paymentMethodId}
                      onChange={e => {
                        const pm = paymentMethods.find(p => p.id === e.target.value);
                        setPaymentMethodId(e.target.value);
                        setPaymentInstallments(pm?.type === 'aprazo' ? (pm.installments ?? 1) : 1);
                      }}
                      className={`w-full p-1.5 bg-white dark:bg-slate-700 rounded-lg border-2 outline-none font-bold text-xs text-black dark:text-white appearance-none transition-all ${saleType === 'Pedido' && !paymentMethodId ? 'border-red-300' : 'border-transparent focus:border-[var(--primary-color)]'}`}
                    >
                      <option value="">-- Selecione --</option>
                      {paymentMethods.filter(p => p.active).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {paymentMethods.find(p => p.id === paymentMethodId)?.type === 'aprazo' && (
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-bold text-black uppercase tracking-widest block mb-1">Parc.</label>
                      <select
                        value={paymentInstallments}
                        onChange={e => setPaymentInstallments(parseInt(e.target.value))}
                        className="w-full p-1.5 bg-white dark:bg-slate-700 rounded-lg border-2 border-transparent focus:border-[var(--primary-color)] outline-none font-bold text-xs text-black dark:text-white appearance-none"
                      >
                        {Array.from({ length: paymentMethods.find(p => p.id === paymentMethodId)?.installments ?? 1 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="md:col-span-4">
                    <label className="text-[9px] font-bold uppercase tracking-widest block mb-1 text-black whitespace-nowrap">
                      1º Vencimento
                    </label>
                    <input
                      type="date"
                      value={firstDueDate}
                      onChange={e => setFirstDueDate(e.target.value)}
                      className={`w-full p-1.5 bg-white dark:bg-slate-700 rounded-lg border-2 outline-none font-bold text-xs text-black dark:text-white transition-all ${saleType === 'Pedido' && !firstDueDate ? 'border-red-300' : 'border-transparent focus:border-[var(--primary-color)]'}`}
                    />
                  </div>
                </div>
                {/* ── Preview de parcelas ao vivo ── */}
                {paymentMethodId && totalGeral > 0 && (() => {
                  const pm = paymentMethods.find(p => p.id === paymentMethodId);
                  if (!pm) return null;
                  const dpValue = downPaymentEnabled && downPaymentValue > 0 ? downPaymentValue : 0;
                  const baseForInstallments = totalGeral - dpValue;
                  const n = pm.type === 'aprazo' ? paymentInstallments : 1;
                  const baseValue = Math.floor((baseForInstallments / n) * 100) / 100;
                  const diff = Math.round((baseForInstallments - baseValue * n) * 100) / 100;
                  const fmtR = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const installmentValue = n > 1 ? baseValue + (diff > 0 ? diff : 0) : baseValue + diff;
                  const dpPm = downPaymentEnabled && downPaymentMethodId ? paymentMethods.find(p => p.id === downPaymentMethodId) : null;
                  return (
                    <div className="space-y-1.5">
                      {dpValue > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">{dpPm?.name || 'Entrada'}</p>
                          <p className="text-sm font-black text-amber-700">R$ {fmtR(dpValue)}</p>
                        </div>
                      )}
                      <div className="bg-[var(--primary-color)]/10 dark:bg-[var(--primary-color)]/20 rounded-lg p-2.5 border border-[var(--primary-color)]/20">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary-color)] mb-0.5">{pm.name}{dpValue > 0 ? ' — Restante' : ''}</p>
                        {n === 1 ? (
                          <p className="text-lg font-black text-[var(--primary-color)]">R$ {fmtR(baseForInstallments)} <span className="text-[10px] font-bold opacity-80 italic">à vista</span></p>
                        ) : (
                          <>
                            <p className="text-lg font-black text-[var(--primary-color)]">{n}x de R$ {fmtR(installmentValue)}</p>
                            <p className="text-[10px] text-[var(--primary-color)]/70 font-bold mt-0.5">Restante: R$ {fmtR(baseForInstallments)}</p>
                          </>
                        )}
                        {dpValue > 0 && (
                          <p className="text-[9px] text-[var(--primary-color)]/60 font-bold mt-1 border-t border-[var(--primary-color)]/10 pt-1">
                            Total do pedido: R$ {fmtR(totalGeral)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>


            </div>
          </div>
          
          </div> {/* Fim do container p-4 space-y-6 */}

          {isAdminUser && (
            <div className="mx-4">
              <SaleAnalysisPanel
                sale={{
                  ...initialData,
                  items,
                  totals: {
                    vendas: subtotal,
                    desconto: calculatedDiscount,
                    frete: safeDeliveryFee,
                    comissaoArquiteto: architectCommissionValue > 0 ? architectCommissionValue : undefined,
                    geral: totalGeral,
                  },
                } as any}
                materials={materials}
                products={products}
                companyInfo={companyInfo}
              />
            </div>
          )}

          <div className="mx-4 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6 pb-6">
            {initialData?.id && (
              <CRMSection
                sale={initialData}
                onSaveSale={(sale) => onSave(sale, true)}
                currentUser={appUsers.find(u => u.name === seller) || null}
              />
            )}
          </div>
        </div>
      </div>

      {isClientModalOpen && (
        <ClientSelectModal 
          clients={clients} 
          onSelect={(c) => { 
            setSelectedClient(c); 
            setIsClientModalOpen(false); 
            // Return focus and move to next
            setTimeout(() => clientBtnRef.current?.focus(), 100);
          }}
          onClose={() => {
            setIsClientModalOpen(false);
            setTimeout(() => clientBtnRef.current?.focus(), 100);
          }}
        />
      )}
      {printingSale && createPortal(
        <PrintBudget 
          sale={printingSale} 
          companyInfo={companyInfo} 
          materials={materials}
          client={clients.find(c => c.id === printingSale.clientId)}
          blurMeasurements={blurMeasurements}
          hideM2Unit={hideM2Unit}
        />,
        document.body
      )}

      {/* Discount Authorization Request Modal */}
      {showDiscountRequest && companyInfo.maxDiscountPct !== undefined && onRequestDiscount && (
        <DiscountRequestModal
          requestedPct={safeDiscPct}
          maxPct={companyInfo.maxDiscountPct}
          subtotal={subtotal}
          admins={appUsers.filter(u => u.role === 'admin' && u.status === 'ativo')}
          onRequest={(admin) => {
            onRequestDiscount(admin, safeDiscPct, companyInfo.maxDiscountPct!);
            setShowDiscountRequest(false);
            onClose(); // Fecha o modal principal após solicitar, para aguardar decisão do admin (padrão do sistema)
          }}
          onRedo={() => setShowDiscountRequest(false)}
          onClose={() => setShowDiscountRequest(false)}
        />
      )}

      {/* Commission Authorization Request Modal */}
      {showCommissionRequest && companyInfo.maxArchitectCommissionPct !== undefined && onRequestCommission && (
        <CommissionRequestModal
          requestedPct={safeArchCommPct}
          maxPct={companyInfo.maxArchitectCommissionPct}
          subtotal={subtotal}
          admins={appUsers.filter(u => u.role === 'admin' && u.status === 'ativo')}
          onRequest={(admin) => {
            onRequestCommission(admin, safeArchCommPct, companyInfo.maxArchitectCommissionPct!);
            setShowCommissionRequest(false);
            onClose(); // Fecha o modal principal após solicitar
          }}
          onRedo={() => setShowCommissionRequest(false)}
          onClose={() => setShowCommissionRequest(false)}
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
                    <span className="text-sm font-bold text-black dark:text-slate-200">{mat}</span>
                    <span className="ml-auto text-xs text-slate-400">{envItems.filter(i => i.materialName === mat).length} item(s)</span>
                  </label>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setMaterialSwap(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-black dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
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
              <button onClick={() => setShowRevert(false)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
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
                <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight">Selecionar Serviço</h2>
                <p className="text-xs text-slate-500 font-medium">Pesquise e clique para selecionar</p>
              </div>
              <button onClick={() => {
                setProductPickerOpen(false);
                setTimeout(() => itemDescRef.current?.focus(), 100);
              }} className="p-2 text-slate-400 hover:text-black rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar serviço..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-xl outline-none transition-all font-medium text-sm text-slate-800 dark:text-white"
                />
              </div>
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                {(() => {
                  const q = productSearch.toLowerCase();
                  const filteredItems = (services || [])
                    .filter(s => s.description.toLowerCase().includes(q))
                    .map(s => ({
                      label: s.description,
                      type: 'Serviço' as const,
                      price: (s as any).sellingPrice || 0,
                      isFromMetadata: true
                    }));
                  
                  return filteredItems.length > 0 ? filteredItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setItemDesc(item.label);
                        if (item.price) setItemPrice(item.price);
                        setProductPickerOpen(false);
                        setTimeout(() => materialRef.current?.focus(), 100);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-[var(--primary-color)]/5 transition-all text-left group"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-[var(--primary-color)]">{item.label}</span>
                        {(item.price || 0) > 0 && (
                          <span className="text-[10px] text-slate-400 font-bold">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg transition-all ${
                        item.type === 'Serviço' 
                          ? 'bg-blue-500/10 text-black group-hover:bg-blue-500 group-hover:text-white' 
                          : 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                      }`}>
                        {item.type}
                      </span>
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

      {/* Material Picker Popup */}
      {materialPickerOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                  {swapPickerEnv !== null ? 'Trocar Matéria Prima' : 'Selecionar Material'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">Matéria Prima, Acabamentos e Produtos de Revenda</p>
              </div>
              <button onClick={() => {
                setMaterialPickerOpen(false);
                setSwapPickerEnv(null);
                if (!swapPickerEnv) setTimeout(() => materialRef.current?.focus(), 100);
              }} className="p-2 text-slate-400 hover:text-black rounded-xl transition-colors">
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
                        if (swapPickerEnv !== null) {
                          // Modo: trocar matéria prima do ambiente
                          const envKey = swapPickerEnv || 'Sem Ambiente';
                          const envItemsForSwap = items.filter(i => (i.environment || 'Sem Ambiente') === envKey);
                          const distinct = Array.from(new Set(envItemsForSwap.map(i => i.materialName || '').filter(Boolean)));
                          if (distinct.length <= 1) {
                            updateEnvironmentMaterial(swapPickerEnv, item.name, distinct.length === 1 ? distinct : undefined);
                          } else {
                            setMaterialSwap({ env: swapPickerEnv, newMaterialName: item.name, toReplace: [] });
                          }
                          setSwapPickerEnv(null);
                          setMaterialPickerOpen(false);
                        } else {
                          // Modo: selecionar matéria prima para novo item
                          setItemMaterialId(item.name);
                          if (item.price) setItemPrice(item.price);
                          if (!itemDesc) setItemDesc(item.name);
                          if (item.badge === 'Acabamentos' || item.badge === 'Produtos de Revenda') {
                            setItemLength(0);
                            setItemWidth(0);
                          }
                          setMaterialPickerOpen(false);
                          setTimeout(() => qtyRef.current?.focus(), 100);
                        }
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

      {/* Modal de Confirmação de Saída */}
      {showExitConfirmation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Sair sem salvar?</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Você está no modo de edição. Se sair agora, todas as alterações não gravadas serão perdidas permanentemente.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={onClose}
                className="w-full py-4 bg-red-600 dark:bg-red-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all uppercase tracking-widest"
              >
                Sim, sair sem salvar
              </button>
              <button
                onClick={() => setShowExitConfirmation(false)}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest"
              >
                Não, continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
