import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { Login } from './components/Login';
import { PlaceholderView } from './components/PlaceholderView';
import { OrderListView } from './components/OrderListView';
import { TeamView } from './components/TeamView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { RecentActivity } from './components/RecentActivity';
import { DeliverySchedule } from './components/DeliverySchedule';
import { ClientsView } from './components/ClientsView.tsx';
import { SalesView } from './components/SalesView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { SuppliersView } from './components/SuppliersView.tsx';
import { ArchitectsView } from './components/ArchitectsView.tsx';
import { SalesChannelsView } from './components/SalesChannelsView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { NewProductModal } from './components/NewProductModal.tsx';
import { BrandsView } from './components/BrandsView.tsx';
import { ProductGroupsView } from './components/ProductGroupsView.tsx';
import { ServiceGroupsView } from './components/ServiceGroupsView.tsx';
import { MOCK_ORDERS } from './constants.tsx';
import { OrderService, User, View, ProductionPhase, INITIAL_PHASES, AppUser, ProductionStaff, PhaseConfig, ActivityLog, PhaseRecord, PhaseResponsible, Delivery, CompanyInfo, Client, Material, SalesOrder, SalesChannel, FinanceTransaction, Supplier, Architect, ProductService, Brand, ProductGroup, ServiceGroup, SalesPhaseConfig, ExchangeRates } from './types';
import { supabase } from './lib/supabase';
import 'leaflet/dist/leaflet.css';

const INITIAL_APP_USERS: AppUser[] = [
  { id: '1', name: 'Fábio Admin', email: 'fabio@marmoflow.com', role: 'admin', status: 'ativo', createdAt: '2024-01-10' },
  { id: '2', name: 'Ana Gerente', email: 'ana@marmoflow.com', role: 'manager', status: 'ativo', createdAt: '2024-02-01' },
  { id: '3', name: 'Carlos Vendas', email: 'carlos@marmoflow.com', role: 'seller', status: 'ativo', createdAt: '2024-03-05' },
];

const INITIAL_STAFF: ProductionStaff[] = [
  { id: '1', name: 'João Ferreira', position: 'serrador', hourlyRate: 22, phone: '(11) 99876-1234', status: 'ativo' },
  { id: '2', name: 'Marcos Lima', position: 'acabador', hourlyRate: 20, phone: '(11) 99123-5678', status: 'ativo' },
  { id: '3', name: 'Pedro Alves', position: 'ajudante_serrador', hourlyRate: 16, phone: '(11) 98765-0000', status: 'ativo' },
  { id: '4', name: 'Lucas Costa', position: 'medidor', hourlyRate: 18, phone: '(11) 97654-3210', status: 'inativo' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Fetch initial data from Supabase for Orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const { data, error } = await supabase
          .from('orders_service')
          .select('*')
          .order('os_number', { ascending: false });
        
        if (error) throw error;
        if (data) {
          const mapped = data.map(o => ({
            ...o,
            osNumber: o.os_number,
            orderNumber: o.order_number,
            clientName: o.client_name,
            projectDescription: o.project_description,
            materialArea: o.material_area,
            clientId: o.client_id,
            architectId: o.architect_id,
            architectName: o.architect_name,
            totalValue: o.total_value,
            remainingValue: o.remaining_value,
            imageUrls: o.image_urls,
            phaseHistory: o.phase_history,
            responsibleStaffName: o.responsible_staff_name,
            salesChannel: o.sales_channel,
            salesPhase: o.sales_phase,
            isOsGenerated: o.is_os_generated,
            discountValue: o.discount_value,
            discountPercentage: o.discount_percentage,
            paymentConditions: o.payment_conditions,
            deliveryDeadline: o.delivery_deadline,
            lostReason: o.lost_reason,
            lostDetails: o.lost_details,
            createdAt: o.created_at
          }));
          setOrders(mapped as OrderService[]);
        }
      } catch (err) {
        console.error('Erro ao carregar ordens de serviço do Supabase:', err);
        const saved = localStorage.getItem('marmo_orders');
        if (saved) setOrders(JSON.parse(saved));
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, []);

  const handleSaveOrder = async (o: OrderService) => {
    try {
      const payload = {
        id: o.id.length > 20 ? o.id : undefined,
        os_number: o.osNumber,
        order_number: o.orderNumber,
        client_name: o.clientName,
        project_description: o.projectDescription,
        material: o.material,
        material_area: o.materialArea,
        phase: o.phase,
        seller: o.seller,
        deadline: o.deadline,
        priority: o.priority,
        client_id: o.clientId,
        architect_id: o.architectId,
        architect_name: o.architectName,
        total_value: o.totalValue,
        remaining_value: o.remainingValue,
        observations: o.observations,
        internal_observations: o.internalObservations,
        image_urls: o.imageUrls,
        items: o.items,
        payments: o.payments,
        logs: o.logs,
        phase_history: o.phaseHistory,
        responsible_staff_name: o.responsibleStaffName,
        sales_channel: o.salesChannel,
        sales_phase: o.salesPhase,
        is_os_generated: o.isOsGenerated,
        status: o.status,
        discount_value: o.discountValue,
        discount_percentage: o.discountPercentage,
        payment_conditions: o.paymentConditions,
        delivery_deadline: o.deliveryDeadline,
        totals: o.totals,
        lost_reason: o.lostReason,
        lost_details: o.lostDetails
      };

      const { data, error } = await supabase
        .from('orders_service')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      const savedRow = data;
      const savedOrder = {
        ...savedRow,
        osNumber: savedRow.os_number,
        orderNumber: savedRow.order_number,
        clientName: savedRow.client_name,
        projectDescription: savedRow.project_description,
        materialArea: savedRow.material_area,
        clientId: savedRow.client_id,
        architectId: savedRow.architect_id,
        architectName: savedRow.architect_name,
        totalValue: savedRow.total_value,
        remainingValue: savedRow.remaining_value,
        imageUrls: savedRow.image_urls,
        phaseHistory: savedRow.phase_history,
        responsibleStaffName: savedRow.responsible_staff_name,
        salesChannel: savedRow.sales_channel,
        salesPhase: savedRow.sales_phase,
        isOsGenerated: savedRow.is_os_generated,
        discountValue: savedRow.discount_value,
        discountPercentage: savedRow.discount_percentage,
        paymentConditions: savedRow.payment_conditions,
        deliveryDeadline: savedRow.delivery_deadline,
        lostReason: savedRow.lost_reason,
        lost_details: savedRow.lost_details,
        createdAt: savedRow.created_at
      } as OrderService;
      
      setOrders(prev => {
        const exists = prev.find(x => x.id === o.id || x.id === savedOrder.id);
        if (exists) return prev.map(x => (x.id === o.id || x.id === savedOrder.id) ? savedOrder : x);
        return [savedOrder, ...prev];
      });

      logActivity(
        orders.find(x => x.id === o.id) ? 'update' : 'create', 
        `${orders.find(x => x.id === o.id) ? 'Atualizou' : 'Iniciou'} produção da OS: ${o.osNumber}`, 
        savedOrder.id, 
        o.osNumber
      );

    } catch (err) {
      console.error('Erro ao salvar ordem de serviço:', err);
      alert('Erro ao salvar ordem de serviço no banco de dados.');
    }
  };
  const [phases, setPhases] = useState<PhaseConfig[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_phases');
      return saved ? (JSON.parse(saved) || INITIAL_PHASES) : INITIAL_PHASES;
    } catch {
      return INITIAL_PHASES;
    }
  });
  const [appUsers, setAppUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_app_users');
      return saved ? (JSON.parse(saved) || INITIAL_APP_USERS) : INITIAL_APP_USERS;
    } catch {
      return INITIAL_APP_USERS;
    }
  });
  const [staff, setStaff] = useState<ProductionStaff[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_staff');
      return saved ? (JSON.parse(saved) || INITIAL_STAFF) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Fetch initial data from Supabase for Activities
  useEffect(() => {
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        if (data) {
          const mapped = data.map(l => ({
            id: l.id,
            timestamp: l.created_at,
            userName: l.user_name,
            action: l.type as any,
            details: l.message,
            orderId: l.reference_id
          }));
          setActivities(mapped as ActivityLog[]);
        }
      } catch (err) {
        console.error('Erro ao carregar logs do Supabase:', err);
        const saved = localStorage.getItem('marmo_activities');
        if (saved) setActivities(JSON.parse(saved));
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, []);
  const [brands, setBrands] = useState<Brand[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_brands');
      return saved ? (JSON.parse(saved) || []) : [];
    } catch {
      return [];
    }
  });
  const [productGroups, setProductGroups] = useState<ProductGroup[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_product_groups');
      return saved ? (JSON.parse(saved) || []) : [];
    } catch {
      return [];
    }
  });
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_service_groups');
      return saved ? (JSON.parse(saved) || []) : [];
    } catch {
      return [];
    }
  });
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch initial data from Supabase for Products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name');
        
        if (error) throw error;
        if (data) {
          const mapped = data.map(p => ({
            ...p,
            description: p.name,
            type: p.category,
            sellingPrice: p.base_price,
            imageUrl: p.image_url
          }));
          setProducts(mapped as ProductService[]);
        }
      } catch (err) {
        console.error('Erro ao carregar produtos do Supabase:', err);
        const saved = localStorage.getItem('marmo_products');
        if (saved) setProducts(JSON.parse(saved));
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSaveProduct = async (p: ProductService) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .upsert({
          id: p.id.length > 20 ? p.id : undefined,
          name: p.description,
          category: p.type,
          status: p.status,
          base_price: p.sellingPrice,
          description: p.description,
          image_url: p.imageUrl
        })
        .select()
        .single();
      
      if (error) throw error;
      const saved = { 
        ...data, 
        description: data.name, 
        type: data.category, 
        sellingPrice: data.base_price, 
        imageUrl: data.image_url 
      } as ProductService;
      
      setProducts(prev => {
        const exists = prev.find(x => x.id === p.id || x.id === saved.id);
        if (exists) return prev.map(x => (x.id === p.id || x.id === saved.id) ? saved : x);
        return [saved, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto no banco de dados.');
    }
  };
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    const defaultData = {
      name: 'Tok de Art',
      document: '14.092.404/0001-67',
      address: 'Rua Américo Brasiliense, 1853 - Vila Seixas - Ribeirão Preto - SP',
      phone: '(16) 3636-0114',
      email: 'vendas@tokdeart.com.br',
      logoUrl: '',
      lostReasonOptions: ['Tinha preço menor', 'Prazo de entrega melhor', 'Desistiu de fazer', 'Não aprovaram o material', 'Distância da obra'],
      buttonColor: '#ec5b13',
      sidebarColor: '#0f172a',
      sidebarTextColor: '#cbd5e1'
    };
    try {
      const saved = localStorage.getItem('marmo_company');
      if (!saved) return defaultData;
      const parsed = JSON.parse(saved) || {};
      return { ...defaultData, ...parsed };
    } catch {
      return defaultData;
    }
  });

  // Inject theme colors into CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const primary = companyInfo.buttonColor || '#ec5b13';
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--sidebar-bg', companyInfo.sidebarColor || '#0f172a');
    root.style.setProperty('--sidebar-text', companyInfo.sidebarTextColor || '#cbd5e1');

    // Simple helper to generate a darker version for secondary/hover states
    const darken = (hex: string, percent: number) => {
      const num = parseInt(hex.replace('#', ''), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) - amt,
        G = (num >> 8 & 0x00FF) - amt,
        B = (num & 0x0000FF) - amt;
      return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
    };
    
    root.style.setProperty('--secondary-color', darken(primary, 10));
  }, [companyInfo]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>('Produção');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  // Fetch initial data from Supabase for Deliveries
  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoadingDeliveries(true);
      try {
        const { data, error } = await supabase
          .from('deliveries')
          .select('*')
          .order('date');
        
        if (error) throw error;
        if (data) {
          const mapped = data.map(d => ({
            id: d.id,
            orderId: d.order_id,
            osNumber: d.os_number,
            clientName: d.client_name,
            address: d.address,
            date: d.date,
            time: d.time,
            status: d.status as any
          }));
          setDeliveries(mapped as Delivery[]);
        }
      } catch (err) {
        console.error('Erro ao carregar entregas do Supabase:', err);
        const saved = localStorage.getItem('marmo_deliveries');
        if (saved) setDeliveries(JSON.parse(saved));
      } finally {
        setLoadingDeliveries(false);
      }
    };

    fetchDeliveries();
  }, []);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch initial data from Supabase for Clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        let allClients: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name')
            .range(from, from + batchSize - 1);
          
          if (error) throw error;
          if (data && data.length > 0) {
            allClients = [...allClients, ...data];
            from += batchSize;
            if (data.length < batchSize) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        const mapped = allClients.map(c => ({
          ...c,
          code: c.client_code
        }));
        setClients(mapped as Client[]);
      } catch (err) {
        console.error('Erro ao carregar clientes do Supabase:', err);
        const saved = localStorage.getItem('marmo_clients');
        if (saved) setClients(JSON.parse(saved));
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  const handleSaveClient = async (c: Client) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .upsert({
          id: c.id.length > 20 ? c.id : undefined,
          name: c.name,
          type: c.type,
          document: c.document,
          email: c.email,
          phone: c.phone,
          address: c.address,
          client_code: c.code
        })
        .select()
        .single();
      
      if (error) throw error;
      const saved = data as Client;
      
      setClients(prev => {
        const exists = prev.find(x => x.id === c.id || (saved.id && x.id === saved.id));
        const mappedSaved = { ...saved, code: (saved as any).client_code };
        if (exists) return prev.map(x => (x.id === c.id || x.id === mappedSaved.id) ? mappedSaved : x);
        return [mappedSaved, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente no banco de dados.');
    }
  };

  const handleImportClients = async (data: any[]) => {
    try {
      const batchSize = 50;
      const totalGroups = Math.ceil(data.length / batchSize);
      
      for (let i = 0; i < totalGroups; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, data.length);
        const batch = data.slice(start, end);
        
        const clientsToInsert = batch.map(row => {
          const rawCode = row.codigo || row.code;
          const parsedCode = (rawCode !== undefined && rawCode !== null && rawCode !== '') 
            ? Number(rawCode) 
            : undefined;

          return {
            name: String(row.nome || row.name || 'Sem Nome'),
            type: row.tipo || row.type || 'Pessoa Física',
            document: String(row.documento || row.document || ''),
            email: String(row.email || ''),
            phone: String(row.telefone || row.phone || row.celular || ''),
            cellphone: String(row.celular || row.phone || ''),
            address: {
              street: String(row.rua || row.street || ''),
              number: String(row.numero || row.number || ''),
              complement: String(row.complemento || row.complement || ''),
              neighborhood: String(row.bairro || row.neighborhood || ''),
              city: String(row.cidade || row.city || ''),
              state: String(row.estado || row.state || ''),
              zipCode: String(row.cep || row.zipCode || '')
            },
            client_code: isNaN(Number(parsedCode)) ? undefined : parsedCode,
            created_at: new Date().toISOString()
          };
        });

        const { data: insertedData, error } = await supabase
          .from('clients')
          .insert(clientsToInsert)
          .select();
        
        if (error) throw error;
        if (insertedData) {
          const mappedBatch = insertedData.map(c => ({ ...c, code: (c as any).client_code }));
          setClients(prev => [...(mappedBatch as Client[]), ...prev]);
        }
      }
      
      logActivity('update', `Importou ${data.length} clientes via planilha`, 'bulk_import', 'BATCH');
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      let errorMsg = 'Ocorreu um erro durante a importação.';
      
      if (err.message?.includes('column "client_code" does not exist') || err.message?.includes('column c.client_code does not exist')) {
        errorMsg = 'ERRO: A coluna "client_code" não foi encontrada no seu banco de dados Supabase.\n\nPor favor, execute o comando SQL que te enviei no painel do Supabase para criar essa coluna.';
      } else if (err.message) {
        errorMsg += `\n\nDetalhes: ${err.message}`;
      }
      
      alert(errorMsg);
    }
  };

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchMaterials = async () => {
      setLoadingMaterials(true);
      try {
        const { data: materialsData, error: materialsError } = await supabase
          .from('materials')
          .select('*')
          .order('name');
        
        if (materialsError) throw materialsError;
        if (materialsData) {
          const mappedMaterials = materialsData.map(m => ({
            ...m,
            unitCost: m.unit_cost,
            minStock: m.min_stock,
            stockQuantity: m.stock_quantity,
            registrationDate: m.registration_date,
            freightCost: m.freight_cost,
            taxPercentage: m.tax_percentage,
            lossPercentage: m.loss_percentage,
            profitMargin: m.profit_margin,
            commissionPercentage: m.commission_percentage,
            discountPercentage: m.discount_percentage,
            suggestedPrice: m.suggested_price,
            sellingPrice: m.selling_price,
            dolarRate: m.dolar_rate,
            euroRate: m.euro_rate,
            priceHistory: m.price_history,
            imageUrl: m.image_url,
            stockLocation: m.inventory_location,
            m2PerUnit: m.m2_per_unit
          }));
          setMaterials(mappedMaterials as Material[]);
        }
      } catch (err) {
        console.error('Erro ao carregar materiais do Supabase:', err);
        const saved = localStorage.getItem('marmo_materials');
        if (saved) setMaterials(JSON.parse(saved));
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, []);

  const handleSaveMaterial = async (m: Material) => {
    try {
      const payload = {
        id: m.id.length > 20 ? m.id : undefined,
        code: m.code,
        name: m.name,
        type: m.type,
        status: m.status,
        unit_cost: m.unitCost,
        unit: m.unit,
        min_stock: m.minStock,
        stock_quantity: m.stockQuantity,
        registration_date: m.registrationDate,
        brand: m.brand,
        supplier: m.supplier,
        difal: m.difal,
        freight_cost: m.freightCost,
        tax_percentage: m.taxPercentage,
        loss_percentage: m.lossPercentage,
        profit_margin: m.profitMargin,
        commission_percentage: m.commissionPercentage,
        discount_percentage: m.discountPercentage,
        suggested_price: m.suggestedPrice,
        selling_price: m.sellingPrice,
        currency: m.currency,
        dolar_rate: m.dolarRate,
        euro_rate: m.euroRate,
        bcfp: m.bcfp,
        thickness: m.thickness,
        weight: m.weight,
        m2_per_unit: m.m2PerUnit,
        inventory_location: m.stockLocation,
        price_history: m.priceHistory,
        image_url: m.imageUrl
      };

      const { data, error } = await supabase
        .from('materials')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      
      const savedRow = data;
      const savedMaterial = {
        ...savedRow,
        unitCost: savedRow.unit_cost,
        minStock: savedRow.min_stock,
        stockQuantity: savedRow.stock_quantity,
        registrationDate: savedRow.registration_date,
        freightCost: savedRow.freight_cost,
        taxPercentage: savedRow.tax_percentage,
        lossPercentage: savedRow.loss_percentage,
        profitMargin: savedRow.profit_margin,
        commissionPercentage: savedRow.commission_percentage,
        discountPercentage: savedRow.discount_percentage,
        suggestedPrice: savedRow.suggested_price,
        sellingPrice: savedRow.selling_price,
        dolarRate: savedRow.dolar_rate,
        euroRate: savedRow.euro_rate,
        priceHistory: savedRow.price_history,
        imageUrl: savedRow.image_url,
        stockLocation: savedRow.inventory_location,
        m2PerUnit: savedRow.m2_per_unit
      } as Material;

      setMaterials(prev => {
        const exists = prev.find(x => x.id === m.id || x.id === savedMaterial.id);
        if (exists) return prev.map(x => (x.id === m.id || x.id === savedMaterial.id) ? savedMaterial : x);
        return [savedMaterial, ...prev];
      });
      
      logActivity(
        materials.find(x => x.id === m.id) ? 'update' : 'create',
        `${materials.find(x => x.id === m.id) ? 'Atualizou' : 'Cadastrou'} material: ${m.name}`,
        savedMaterial.id,
        m.code
      );

    } catch (err) {
      console.error('Erro ao salvar material:', err);
      alert('Erro ao salvar no banco de dados. Verifique sua conexão.');
    }
  };
  
  const [architects, setArchitects] = useState<Architect[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_architects');
      return saved ? (JSON.parse(saved) || []) : [];
    } catch {
      return [];
    }
  });

  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  // Fetch initial data from Supabase for Sales
  useEffect(() => {
    const fetchSales = async () => {
      setLoadingSales(true);
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('order_number', { ascending: false });
        
        if (error) throw error;
        if (data) {
          const mapped = data.map(s => ({
            ...s,
            orderNumber: s.order_number,
            clientName: s.client_name,
            totalValue: s.total,
            createdAt: s.created_at,
            deliveryDeadline: s.delivery_date,
            seller: s.seller_name,
            isOsGenerated: s.is_os_generated,
            observations: s.notes,
            totals: {
              vendas: Number(s.subtotal),
              desconto: Number(s.discount),
              geral: Number(s.total)
            }
          }));
          setSales(mapped as SalesOrder[]);
        }
      } catch (err) {
        console.error('Erro ao carregar vendas do Supabase:', err);
        const saved = localStorage.getItem('keepgoing_sales');
        if (saved) setSales(JSON.parse(saved));
      } finally {
        setLoadingSales(false);
      }
    };

    fetchSales();
  }, []);

  const handleSaveSale = async (s: SalesOrder) => {
    try {
      const payload = {
        id: s.id.length > 20 ? s.id : undefined,
        order_number: s.orderNumber,
        client_name: s.clientName,
        status: s.status,
        items: s.items,
        subtotal: s.totals?.vendas || 0,
        discount: s.totals?.desconto || 0,
        total: s.totals?.geral || s.totalValue || 0,
        delivery_date: s.deliveryDeadline,
        seller_name: s.seller,
        notes: s.observations,
        is_os_generated: s.isOsGenerated
      };

      const { data, error } = await supabase
        .from('sales')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      const savedRow = data;
      const savedSale = {
        ...savedRow,
        orderNumber: savedRow.order_number,
        clientName: savedRow.client_name,
        totalValue: savedRow.total,
        deliveryDeadline: savedRow.delivery_date,
        seller: savedRow.seller_name,
        observations: savedRow.notes,
        isOsGenerated: savedRow.is_os_generated,
        createdAt: savedRow.created_at,
        totals: {
          vendas: Number(savedRow.subtotal),
          desconto: Number(savedRow.discount),
          geral: Number(savedRow.total)
        }
      } as SalesOrder;
      
      setSales(prev => {
        const exists = prev.find(x => x.id === s.id || x.id === savedSale.id);
        if (exists) return prev.map(x => (x.id === s.id || x.id === savedSale.id) ? savedSale : x);
        return [savedSale, ...prev];
      });

      logActivity(
        sales.find(x => x.id === s.id) ? 'update' : 'create', 
        `Atualizou/Registrou um ${s.status} para o cliente ${s.clientName}`, 
        savedSale.id, 
        s.orderNumber
      );

      // Gerar OS se necessário
      if (s.isOsGenerated) {
        const osExists = orders.some(o => o.orderNumber === s.orderNumber || o.id === s.id);
        if (!osExists) {
          const newOrder: OrderService = {
            ...s,
            id: crypto.randomUUID(), 
            osNumber: `OS-${new Date().getFullYear()}-${s.orderNumber}`,
            phase: 'Serviço Lançado' as ProductionPhase, 
          };
          await handleSaveOrder(newOrder);
        }
      }

    } catch (err) {
      console.error('Erro ao salvar venda:', err);
      alert('Erro ao salvar venda no banco de dados.');
    }
  };

  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_transactions');
      return saved ? (JSON.parse(saved) || []) : [
        { id: '1', value: 5000, description: 'Venda O.S. #1234', category: 'Vendas', date: '2024-03-10', type: 'receita', status: 'pago' }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('keepgoing_sales', JSON.stringify(sales));
  }, [sales]);

  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>(() => {
    try {
      const saved = localStorage.getItem('marmo_sales_channels');
      return saved ? (JSON.parse(saved) || []) : [
        { id: '1', name: 'Google', createdAt: new Date().toISOString() },
        { id: '2', name: 'Indicação', createdAt: new Date().toISOString() },
        { id: '3', name: 'Instagram', createdAt: new Date().toISOString() },
        { id: '4', name: 'Showroom', createdAt: new Date().toISOString() }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_sales_channels', JSON.stringify(salesChannels));
  }, [salesChannels]);

  const [salesPhases, setSalesPhases] = useState<SalesPhaseConfig[]>(() => {
    const defaultPhases = [
      { name: 'Oportunidade' },
      { name: 'Orçamento' },
      { name: 'Negociação' },
      { name: 'Pedido/Ganho' }
    ];
    try {
      const saved = localStorage.getItem('marmo_sales_phases');
      if (!saved) return defaultPhases;
      const parsed = JSON.parse(saved);
      return (parsed && parsed.length > 0) ? parsed : defaultPhases;
    } catch {
      return defaultPhases;
    }
  });

  useEffect(() => {
    localStorage.setItem('marmo_sales_phases', JSON.stringify(salesPhases));
  }, [salesPhases]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Fetch initial data from Supabase for Suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('trading_name');
        
        if (error) throw error;
        if (data) {
          const mapped = data.map(s => ({
            ...s,
            legalName: s.legal_name,
            tradingName: s.trading_name,
            contactName: s.contact_name,
            createdAt: s.created_at
          }));
          setSuppliers(mapped as Supplier[]);
        }
      } catch (err) {
        console.error('Erro ao carregar fornecedores do Supabase:', err);
        const saved = localStorage.getItem('marmo_suppliers');
        if (saved) setSuppliers(JSON.parse(saved));
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleSaveSupplier = async (s: Supplier) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .upsert({
          id: s.id.length > 20 ? s.id : undefined,
          type: s.type,
          document: s.document,
          legal_name: s.legalName,
          trading_name: s.tradingName,
          contact_name: s.contactName,
          email: s.email,
          phone: s.phone,
          website: s.website,
          address: s.address
        })
        .select()
        .single();
      
      if (error) throw error;
      const saved = { 
        ...data, 
        legalName: data.legal_name, 
        tradingName: data.trading_name, 
        contactName: data.contact_name,
        createdAt: data.created_at
      } as Supplier;
      
      setSuppliers(prev => {
        const exists = prev.find(x => x.id === s.id || x.id === saved.id);
        if (exists) return prev.map(x => (x.id === s.id || x.id === saved.id) ? saved : x);
        return [saved, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      alert('Erro ao salvar fornecedor no banco de dados.');
    }
  };
  
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 0, eur: 0, lastUpdate: '--:--' });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        console.log('Buscando cotações atualizadas...');
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL');
        if (!response.ok) throw new Error('Falha na resposta da API');
        
        const data = await response.json();
        if (data.USDBRL && data.EURBRL) {
          const newRates = {
            usd: Number(data.USDBRL.bid),
            eur: Number(data.EURBRL.bid),
            lastUpdate: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
          console.log('Cotações recebidas:', newRates);
          setExchangeRates(newRates);
        }
      } catch (error) {
        console.error('Erro crítico ao buscar cotações:', error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  // Persistence simulation
  useEffect(() => {
    const savedUser = localStorage.getItem('marmo_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedPhases = localStorage.getItem('marmo_phases');
    if (savedPhases) setPhases(JSON.parse(savedPhases));

    const savedStaff = localStorage.getItem('marmo_staff');
    if (savedStaff) setStaff(JSON.parse(savedStaff));

    const savedActivities = localStorage.getItem('marmo_activities');
    if (savedActivities) setActivities(JSON.parse(savedActivities));

    const savedCompany = localStorage.getItem('marmo_company');
    if (savedCompany) setCompanyInfo(JSON.parse(savedCompany));

    const savedBrands = localStorage.getItem('marmo_brands');
    if (savedBrands) setBrands(JSON.parse(savedBrands));

    const savedProductGroups = localStorage.getItem('marmo_product_groups');
    if (savedProductGroups) setProductGroups(JSON.parse(savedProductGroups));

    const savedServiceGroups = localStorage.getItem('marmo_service_groups');
    if (savedServiceGroups) setServiceGroups(JSON.parse(savedServiceGroups));
  }, []);

  useEffect(() => {
    localStorage.setItem('marmo_phases', JSON.stringify(phases));
  }, [phases]);

  useEffect(() => {
    localStorage.setItem('marmo_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('marmo_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('marmo_company', JSON.stringify(companyInfo));
  }, [companyInfo]);

  useEffect(() => {
    localStorage.setItem('marmo_brands', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('marmo_product_groups', JSON.stringify(productGroups));
  }, [productGroups]);

  useEffect(() => {
    localStorage.setItem('marmo_service_groups', JSON.stringify(serviceGroups));
  }, [serviceGroups]);

  useEffect(() => {
    localStorage.setItem('marmo_clients', JSON.stringify(clients));
  }, [clients]);


  useEffect(() => {
    localStorage.setItem('marmo_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('marmo_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('marmo_architects', JSON.stringify(architects));
  }, [architects]);

  useEffect(() => {
    localStorage.setItem('marmo_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('marmo_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('marmo_app_users', JSON.stringify(appUsers));
  }, [appUsers]);

  // Sync colors with CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', companyInfo.buttonColor || '#ec5b13');
    root.style.setProperty('--sidebar-bg', companyInfo.sidebarColor || '#0f172a');
    root.style.setProperty('--sidebar-text', companyInfo.sidebarTextColor || '#cbd5e1');
  }, [companyInfo.buttonColor, companyInfo.sidebarColor, companyInfo.sidebarTextColor]);

  const logActivity = async (action: ActivityLog['action'], details: string, referenceId?: string, orderNumber?: string) => {
    if (!user) return;
    
    const message = orderNumber ? `${details} (OS: ${orderNumber})` : details;

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          type: action,
          message: message,
          reference_id: referenceId,
          user_name: user.name
        })
        .select()
        .single();
      
      if (error) throw error;

      const newLog: ActivityLog = {
        id: data.id,
        timestamp: data.created_at,
        userName: data.user_name,
        action: data.type as any,
        details: data.message,
        orderId: data.reference_id
      };
      
      setActivities(prev => [newLog, ...prev].slice(0, 100));

    } catch (err) {
      console.error('Erro ao registrar log no Supabase:', err);
      // Fallback local se falhar
      const fallbackLog: ActivityLog = {
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        userName: user.name,
        action,
        details: message,
        orderId: referenceId
      };
      setActivities(prev => [fallbackLog, ...prev].slice(0, 100));
    }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('marmo_user', JSON.stringify(u));
    // If driver, set initial view to Delivery Schedule
    if (u.role === 'driver') {
      setCurrentView('Agenda de Entregas');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('marmo_user');
  };

  const updateOrder = (orderId: string, updates: Partial<OrderService>) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let finalUpdates = { ...updates };

    // When phase changes, manage phaseHistory
    if (updates.phase && updates.phase !== order.phase) {
      const now = new Date().toISOString();
      const history: PhaseRecord[] = order.phaseHistory ? [...order.phaseHistory] : [];

      // Close the current phase record
      const currentIdx = history.findLastIndex(r => r.phaseName === order.phase && !r.completedAt);
      if (currentIdx !== -1) {
        history[currentIdx] = { ...history[currentIdx], completedAt: now };
      }

      // Start a new phase record
      const newRecord: PhaseRecord = {
        phaseName: updates.phase,
        startedAt: now,
        responsibles: [],
      };

      // If a responsible was provided during the move, add them immediately
      const responsibleName = updates.responsibleStaffName;
      if (responsibleName) {
        newRecord.responsibles.push({ id: String(Date.now()), staffName: responsibleName, addedAt: now });
      }

      history.push(newRecord);
      finalUpdates.phaseHistory = history;

      logActivity('move', `Moveu para ${updates.phase}${responsibleName ? ` · Resp: ${responsibleName}` : ''}`, orderId, order.osNumber);
    } else if (updates.imageUrls && updates.imageUrls.length > order.imageUrls.length) {
      logActivity('upload', `Adicionou ${updates.imageUrls.length - order.imageUrls.length} anexo(s)`, orderId, order.osNumber);
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...finalUpdates } : o));
  };

  const addPhaseResponsible = (orderId: string, phaseName: string, staffName: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString();
    const history: PhaseRecord[] = order.phaseHistory ? [...order.phaseHistory] : [];
    const idx = history.findLastIndex(r => r.phaseName === phaseName && !r.completedAt);
    if (idx !== -1) {
      const newResponsible: PhaseResponsible = { id: String(Date.now()), staffName, addedAt: now };
      history[idx] = { ...history[idx], responsibles: [...history[idx].responsibles, newResponsible] };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, phaseHistory: history } : o));
      logActivity('update', `Adicionou ${staffName} como responsável na fase ${phaseName}`, orderId, order.osNumber);
    }
  };

  const updateOrderPhase = (orderId: string, newPhase: ProductionPhase) => {
    updateOrder(orderId, { phase: newPhase });
  };

  const addOrder = (order: OrderService) => {
    setOrders(prev => [order, ...prev]);
    logActivity('create', `Criou a O.S. ${order.osNumber} para o cliente ${order.clientName}`, order.id, order.osNumber);
  };

  const addDelivery = async (delivery: Omit<Delivery, 'id'>) => {
    try {
      const payload = {
        order_id: delivery.orderId,
        os_number: delivery.osNumber,
        client_name: delivery.clientName,
        address: delivery.address,
        date: delivery.date,
        time: delivery.time,
        status: delivery.status
      };

      const { data, error } = await supabase
        .from('deliveries')
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;

      const newDelivery = {
        ...data,
        orderId: data.order_id,
        osNumber: data.os_number,
        clientName: data.client_name
      } as Delivery;

      setDeliveries(prev => [newDelivery, ...prev]);
      logActivity('update', `Agendou entrega para a O.S. ${newDelivery.osNumber} em ${newDelivery.address}`, newDelivery.orderId, newDelivery.osNumber);
    } catch (err) {
      console.error('Erro ao adicionar entrega:', err);
    }
  };

  const updateDeliveryStatus = async (id: string, status: Delivery['status']) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    } catch (err) {
      console.error('Erro ao atualizar status da entrega:', err);
    }
  };

  const deleteDelivery = async (id: string) => {
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;

    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setDeliveries(prev => prev.filter(d => d.id !== id));
      logActivity('delete', `Removeu agendamento de entrega da O.S. ${delivery.osNumber}`, delivery.orderId, delivery.osNumber);
    } catch (err) {
      console.error('Erro ao deletar entrega:', err);
    }
  };

  const updateDelivery = async (id: string, updates: Partial<Delivery>) => {
    try {
      const payload: any = { ...updates };
      if (updates.orderId) payload.order_id = updates.orderId;
      if (updates.osNumber) payload.os_number = updates.osNumber;
      if (updates.clientName) payload.client_name = updates.clientName;

      // Simplificando o mapeamento de volta
      delete payload.orderId;
      delete payload.osNumber;
      delete payload.clientName;

      const { error } = await supabase
        .from('deliveries')
        .update(payload)
        .eq('id', id);
      
      if (error) throw error;

      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      const delivery = deliveries.find(d => d.id === id);
      if (delivery) {
        logActivity('update', `Atualizou agendamento da O.S. ${delivery.osNumber}`, delivery.orderId, delivery.osNumber);
      }
    } catch (err) {
      console.error('Erro ao atualizar entrega:', err);
    }
  };

  const addPhase = (name: string) => {
    if (!phases.find(p => p.name === name)) {
      setPhases([...phases, { name, requiresResponsible: false }]);
    }
  };

  const renamePhase = (oldName: string, newName: string) => {
    setPhases(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    setOrders(prev => prev.map(o => o.phase === oldName ? { ...o, phase: newName as ProductionPhase } : o));
  };

  const deletePhase = (name: string) => {
    setPhases(prev => prev.filter(p => p.name !== name));
  };

  const reorderPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(phases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setPhases(result);
  };

  const togglePhaseRequirement = (phaseName: string) => {
    setPhases(prev => prev.map(p => p.name === phaseName ? { ...p, requiresResponsible: !p.requiresResponsible } : p));
  };

  const handleSaveUser = (u: AppUser) => {
    setAppUsers(prev => prev.find(x => x.id === u.id) ? prev.map(x => x.id === u.id ? u : x) : [...prev, u]);
  };

  const handleDeleteUser = (id: string) => {
    setAppUsers(prev => prev.filter(x => x.id !== id));
  };

  const handleSaveStaff = (s: ProductionStaff) => {
    setStaff(prev => prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]);
  };

  const handleDeleteStaff = (id: string) => {
    setStaff(prev => prev.filter(x => x.id !== id));
  };

  const addSalesPhase = (name: string) => {
    if (!salesPhases.find(p => p.name === name)) {
      setSalesPhases([...salesPhases, { name }]);
    }
  };

  const renameSalesPhase = (oldName: string, newName: string) => {
    setSalesPhases(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    setSales(prev => prev.map(s => s.salesPhase === oldName ? { ...s, salesPhase: newName } : s));
  };

  const deleteSalesPhase = (name: string) => {
    setSalesPhases(prev => prev.filter(p => p.name !== name));
  };

  const reorderSalesPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(salesPhases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSalesPhases(result);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const filteredOrders = orders.filter(o =>
    o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.osNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (currentView) {
      case 'Produção':
        return (
          <KanbanBoard
            orders={orders}
            phases={phases}
            onOrderMove={async (orderId, newPhase) => {
              const o = orders.find(x => x.id === orderId);
              if (o) await handleSaveOrder({ ...o, phase: newPhase });
            }}
            onUpdateOrder={async (id, updates) => {
              const o = orders.find(x => x.id === id);
              if (o) await handleSaveOrder({ ...o, ...updates });
            }}
            onAddOrder={handleSaveOrder}
            onAddPhase={addPhase}
            onRenamePhase={renamePhase}
            onDeletePhase={deletePhase}
            onReorderPhases={reorderPhases}
            onTogglePhaseRequirement={togglePhaseRequirement}
            appUsers={appUsers}
            productionStaff={staff}
            activities={activities}
            onAddPhaseResponsible={addPhaseResponsible}
            isAdmin={user.role === 'admin'}
          />
        );
      case 'Ordens de Serviço':
        return <OrderListView orders={orders} />;
      case 'Agenda de Entregas':
        return (
          <DeliverySchedule 
            orders={orders} 
            deliveries={deliveries} 
            onAddDelivery={addDelivery} 
            onUpdateDeliveryStatus={updateDeliveryStatus} 
            onUpdateDelivery={updateDelivery}
            onDeleteDelivery={deleteDelivery}
            onReorderDeliveries={setDeliveries}
            companyAddress={companyInfo.address}
            companyName={companyInfo.name}
            companyLogoUrl={companyInfo.logoUrl}
          />
        );
      case 'Equipe':
        return (
          <TeamView
            appUsers={appUsers}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            staff={staff}
            onSaveStaff={handleSaveStaff}
            onDeleteStaff={handleDeleteStaff}
          />
        );
      case 'Relatórios':
        return <ReportsView orders={orders} deliveries={deliveries} />;
      case 'Configurações':
        return (
          <SettingsView
            phases={phases}
            onToggleRequirement={togglePhaseRequirement}
            onAddPhase={addPhase}
            onRenamePhase={renamePhase}
            onDeletePhase={deletePhase}
            onReorderPhases={reorderPhases}
            salesPhases={salesPhases}
            onAddSalesPhase={addSalesPhase}
            onRenameSalesPhase={renameSalesPhase}
            onDeleteSalesPhase={deleteSalesPhase}
            onReorderSalesPhases={reorderSalesPhases}
            companyInfo={companyInfo}
            onUpdateCompany={setCompanyInfo}
            onImportClients={handleImportClients}
          />
        );
      case 'Clientes':
        return (
          <ClientsView 
            clients={clients} 
            onSaveClient={handleSaveClient} 
            onDeleteClient={async (id) => {
              const { error } = await supabase.from('clients').delete().eq('id', id);
              if (!error) setClients(prev => prev.filter(x => x.id !== id));
            }} 
          />
        );
      case 'Vendas':
        const nextOrderNumber = sales.reduce((max, s) => {
          const num = parseInt(s.orderNumber?.replace(/\D/g, '') || '0');
          return num > max ? num : max;
        }, 0) + 1;

        return (
          <SalesView 
            sales={sales} 
            clients={clients} 
            materials={materials} 
            appUsers={appUsers}
            architects={architects}
            products={products}
            salesChannels={salesChannels}
            companyInfo={companyInfo}
            nextOrderNumber={String(nextOrderNumber)}
            salesPhases={salesPhases}
            services={serviceGroups}
            onAddSalesPhase={addSalesPhase}
            onRenameSalesPhase={renameSalesPhase}
            onDeleteSalesPhase={deleteSalesPhase}
            onReorderSalesPhases={reorderSalesPhases}
            onSaveSale={handleSaveSale} 
          />
        );
      case 'Matéria Prima':
        return (
          <InventoryView 
            materials={materials} 
            onSaveMaterial={handleSaveMaterial} 
            onUpdateStatus={async (id, status) => {
              const m = materials.find(x => x.id === id);
              if (m) {
                await handleSaveMaterial({ ...m, status });
              }
            }}
            brands={brands}
            productGroups={productGroups}
            suppliers={suppliers}
            exchangeRates={exchangeRates}
          />
        );
      case 'Acabamentos':
      case 'Produtos Revenda':
      case 'Mão de obra (Instalação)':
      case 'Serviços':
        const categoryMap: Record<string, string> = {
          'Acabamentos': 'Acabamentos',
          'Produtos Revenda': 'Produtos de Revenda',
          'Mão de obra (Instalação)': 'Colocação',
          'Serviços': 'Serviços'
        };
        return (
          <ProductsView 
            category={categoryMap[currentView] as any} 
            products={products} 
            onSaveProduct={handleSaveProduct}
            onUpdateStatus={async (id, status) => {
              const p = products.find(x => x.id === id);
              if (p) await handleSaveProduct({ ...p, status });
            }}
            brands={brands}
            productGroups={productGroups}
          />
        );
      case 'Financeiro':
        return <FinanceView transactions={transactions} onAddTransaction={(t) => setTransactions(prev => [t, ...prev])} />;
      case 'Fornecedores':
        return (
          <SuppliersView 
            suppliers={suppliers} 
            onSaveSupplier={handleSaveSupplier} 
            onDeleteSupplier={async (id) => {
              const { error } = await supabase.from('suppliers').delete().eq('id', id);
              if (!error) setSuppliers(prev => prev.filter(x => x.id !== id));
            }} 
          />
        );
      case 'Arquitetos':
        return <ArchitectsView architects={architects} onSaveArchitect={(a) => setArchitects(prev => prev.find(item => item.id === a.id) ? prev.map(item => item.id === a.id ? a : item) : [a, ...prev])} onDeleteArchitect={(id) => setArchitects(prev => prev.filter(item => item.id !== id))} />;
      case 'Canais de Vendas':
        return <SalesChannelsView channels={salesChannels} onSaveChannel={(c) => setSalesChannels(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c])} onDeleteChannel={(id) => setSalesChannels(prev => prev.filter(x => x.id !== id))} />;
      case 'Marcas':
        return <BrandsView brands={brands} onSaveBrand={(b) => setBrands(prev => prev.find(item => item.id === b.id) ? prev.map(item => item.id === b.id ? b : item) : [b, ...prev])} onDeleteBrand={(id) => setBrands(prev => prev.filter(item => item.id !== id))} />;
      case 'Grupos de Produtos':
        return <ProductGroupsView groups={productGroups} onSaveGroup={(g) => setProductGroups(prev => prev.find(item => item.id === g.id) ? prev.map(item => item.id === g.id ? g : item) : [g, ...prev])} onDeleteGroup={(id) => setProductGroups(prev => prev.filter(item => item.id !== id))} />;
      case 'Grupos de Serviços':
        return <ServiceGroupsView groups={serviceGroups} onSaveGroup={(g) => setServiceGroups(prev => prev.find(item => item.id === g.id) ? prev.map(item => item.id === g.id ? g : item) : [g, ...prev])} onDeleteGroup={(id) => setServiceGroups(prev => prev.filter(item => item.id !== id))} />;
      default:
        return <PlaceholderView title={currentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentView={currentView}
        onViewChange={setCurrentView}
        companyInfo={companyInfo}
        userRole={user.role}
        exchangeRates={exchangeRates}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          onSearch={setSearchQuery} 
          onToggleActivity={() => setIsHistoryOpen(!isHistoryOpen)} 
        />
        
        <RecentActivity 
          activities={activities} 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
        />

        <main className="flex-1 overflow-x-auto p-4 kanban-container">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
