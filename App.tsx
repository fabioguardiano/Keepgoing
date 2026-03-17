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
import { MeasurementSchedule } from './components/MeasurementSchedule';
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
import { OrderService, User, View, ProductionPhase, INITIAL_PHASES, AppUser, ProductionStaff, PhaseConfig, ActivityLog, PhaseRecord, PhaseResponsible, Delivery, Measurement, CompanyInfo, Client, Material, SalesOrder, SalesChannel, FinanceTransaction, Supplier, Architect, ProductService, Brand, ProductGroup, ServiceGroup, SalesPhaseConfig, ExchangeRates, DriverStatus } from './types';
import { supabase } from './lib/supabase';
import { notificationService, AppNotification } from './lib/notifications';
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

function App() {
  console.log('%c[System] KeepGoing v13-stable carregando...', 'color: var(--primary-color); font-weight: bold;');
  
  // 1. Estados
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>('Clientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [orders, setOrders] = useState<OrderService[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [phases, setPhases] = useState<PhaseConfig[]>(INITIAL_PHASES);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [staff, setStaff] = useState<ProductionStaff[]>(INITIAL_STAFF);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loadingProductGroups, setLoadingProductGroups] = useState(true);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [loadingServiceGroups, setLoadingServiceGroups] = useState(true);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [loadingArchitects, setLoadingArchitects] = useState(true);
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [salesPhases, setSalesPhases] = useState<SalesPhaseConfig[]>([]);
  const [staffLocations, setStaffLocations] = useState<Record<string, DriverStatus>>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 0, eur: 0, lastUpdate: '--:--' });
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
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
  });

  const validateUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 2. Efeitos de Autenticação
  useEffect(() => {
    const timeoutId = setTimeout(() => setLoadingSession(false), 10000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (data) {
            console.log('[Auth] Perfil carregado com sucesso:', data.name, data.role);
            setUser({
              id: data.id, name: data.name, role: data.role as any, email: session.user.email || '',
              status: 'ativo', createdAt: data.created_at, isMaster: data.is_master, avatarUrl: data.avatar_url
            });
            setAuthError(null);
          } else if (error && error.code === 'PGRST116') {
            console.error('[Auth] Perfil não encontrado para o ID:', session.user.id);
            setAuthError('Perfil não encontrado.');
          }
        } catch (err) { console.error('Erro ao buscar perfil:', err); }
      } else {
        setUser(null);
      }
      setLoadingSession(false);
    });
    return () => { clearTimeout(timeoutId); subscription.unsubscribe(); };
  }, []);

  // 3. Orquestrador de Dados
  const refreshAppData = async () => {
    if (!user) return;
    const runner = async (name: string, fn: () => Promise<void>) => {
      try { 
        console.log(`[Fetch] Carregando ${name}...`);
        await fn(); 
      }
      catch (err) { console.error(`Erro em ${name}:`, err); }
    };

    await runner('CompanyInfo', async () => {
      const { data } = await supabase.from('company_info').select('*').single();
      if (data) setCompanyInfo({
        name: data.name, document: data.document, address: data.address, phone: data.phone, email: data.email,
        logoUrl: data.logo_url, lostReasonOptions: data.lost_reason_options || [],
        buttonColor: data.button_color, sidebarColor: data.sidebar_color, sidebarTextColor: data.sidebar_text_color
      });
    });

    await runner('Orders', async () => {
      const { data } = await supabase.from('orders_service').select('*').order('os_number', { ascending: false });
      if (data) setOrders(data.map(o => ({
        ...o, osNumber: o.os_number, orderNumber: o.order_number, clientName: o.client_name,
        totalValue: Number(o.total_value), phaseHistory: o.phase_history || []
      })) as OrderService[]);
      setLoadingOrders(false);
    });

    await runner('Profiles', async () => {
      const { data } = await supabase.from('profiles').select('*').order('name');
      if (data) setAppUsers(data.map(p => ({
        id: p.id, name: p.name, role: p.role as any, email: '', status: 'ativo',
        createdAt: p.created_at?.slice(0, 10), isMaster: p.is_master, avatarUrl: p.avatar_url
      })));
      setLoadingUsers(false);
    });

    await runner('Staff', async () => {
      const { data } = await supabase.from('production_staff').select('*').order('name');
      if (data) setStaff(data.map(s => ({ ...s, id: s.id, hourlyRate: s.hourly_rate })));
    });

    await runner('ProductionPhases', async () => {
      const { data } = await supabase.from('production_phases').select('*');
      if (data && data.length > 0) setPhases(data.map(p => ({ name: p.name, requiresResponsible: p.requires_responsible || false })));
    });

    await runner('Activities', async () => {
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) setActivities(data.map(l => ({
        id: l.id, timestamp: l.created_at, userName: l.user_name, type: l.type as any,
        action: l.type as any, description: l.message, details: l.message, orderId: l.reference_id
      })));
      setLoadingActivities(false);
    });

    await runner('Clients', async () => {
      // Supabase limita a 1000 por query - buscar em lotes
      const PAGE_SIZE = 1000;
      let allClients: any[] = [];
      let from = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        
        if (error) {
          console.error('[Runner] Erro ao buscar clientes (page):', error);
          break;
        }
        
        if (data && data.length > 0) {
          allClients = allClients.concat(data);
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[Runner] ${allClients.length} clientes carregados do Supabase (paginado).`);
      
      if (allClients.length > 0) {
        setClients(allClients.map(c => {
          let addr = c.address;
          if (typeof addr === 'string') {
            try { addr = JSON.parse(addr); } catch { addr = null; }
          }
          return {
            ...c, 
            address: addr || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
            code: c.client_code, 
            rgInsc: c.rg_insc, 
            cellphone: c.cellphone,
            birthDate: c.birth_date, 
            sellerName: c.seller_name, 
            useSpecialTable: c.use_special_table,
            createdAt: c.created_at
          };
        }) as Client[]);
      }
      setLoadingClients(false);
    });
    await runner('Suppliers', async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('trading_name');
      if (error) throw error;
      if (data) setSuppliers(data.map(s => ({
        ...s, legalName: s.legal_name, tradingName: s.trading_name, contactName: s.contact_name,
        rgInsc: s.rg_insc, cellphone: s.cellphone, observations: s.observations,
        code: s.supplier_code, createdAt: s.created_at
      })) as Supplier[]);
    });

    await runner('Products', async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      if (data) setProducts(data.map(p => ({
        ...p, description: p.name, type: p.category, sellingPrice: p.base_price, imageUrl: p.image_url
      })) as ProductService[]);
    });

    await runner('Deliveries', async () => {
      const { data, error } = await supabase.from('deliveries').select('*').order('date');
      if (error) throw error;
      if (data) setDeliveries(data.map(d => ({
        id: d.id, orderId: d.order_id, osNumber: d.os_number, clientName: d.client_name,
        address: d.address, date: d.date, time: d.time, status: d.status as any
      })) as Delivery[]);
    });

    await runner('Measurements', async () => {
      const { data, error } = await supabase.from('measurements').select('*').order('date');
      if (error) throw error;
      if (data) setMeasurements(data.map(m => ({
        id: m.id, orderId: m.order_id, osNumber: m.os_number, clientName: m.client_name,
        address: m.address, date: m.date, time: m.time, status: m.status as any
      })) as Measurement[]);
    });

    await runner('Materials', async () => {
      // Aumentamos o limite para materiais também, embora o usuário tenha ~434 no momento
      const { data, error } = await supabase.from('materials').select('*').order('name');
      if (error) throw error;
      if (data) setMaterials(data.map(m => ({
        ...m, 
        unitCost: m.unit_cost || 0, 
        minStock: m.min_stock || 0, 
        stockQuantity: m.stock_quantity || 0,
        registrationDate: m.registration_date, 
        freightCost: m.freight_cost || 0, 
        taxPercentage: m.tax_percentage || 0,
        lossPercentage: m.loss_percentage || 0, 
        profitMargin: m.profit_margin || 0, 
        commissionPercentage: m.commission_percentage || 0,
        discountPercentage: m.discount_percentage || 0, 
        suggestedPrice: m.suggested_price || 0,
        sellingPrice: m.selling_price || 0, 
        dolarRate: m.dolar_rate || 1, 
        euroRate: m.euro_rate || 1,
        priceHistory: m.price_history || [], 
        imageUrl: m.image_url, 
        stockLocation: m.inventory_location,
        m2PerUnit: m.m2_per_unit || 1,
        status: m.status || 'ativo',
        type: m.type || 'Matéria Prima',
        name: m.name || 'Sem Nome',
        code: m.code || 'S/C',
        price: m.selling_price || 0,
        stock: m.stock_quantity || 0
      })) as Material[]);
    });

    await runner('Architects', async () => {
      const { data, error } = await supabase.from('architects').select('*').order('trading_name');
      if (error) throw error;
      if (data) setArchitects(data.map(a => ({
        ...a, legalName: a.legal_name, tradingName: a.trading_name, contactName: a.contact_name,
        rgInsc: a.rg_insc, cellphone: a.cellphone, observations: a.observations,
        code: a.architect_code, createdAt: a.created_at
      })) as Architect[]);
    });

    await runner('Sales', async () => {
      const { data, error } = await supabase.from('sales').select('*').order('order_number', { ascending: false });
      if (error) throw error;
      if (data) setSales(data.map(s => ({
        ...s, orderNumber: s.order_number, clientName: s.client_name, totalValue: s.total,
        createdAt: s.created_at, deliveryDeadline: s.delivery_date, seller: s.seller_name,
        isOsGenerated: s.is_os_generated, observations: s.notes,
        totals: { vendas: Number(s.subtotal), desconto: Number(s.discount), geral: Number(s.total) }
      })) as SalesOrder[]);
    });

    await runner('SalesChannels', async () => {
      const { data, error } = await supabase.from('sales_channels').select('*').order('name');
      if (error) throw error;
      if (data) setSalesChannels(data.map(c => ({ id: c.id, name: c.name, color: '#3B82F6' } as SalesChannel)));
    });

    await runner('SalesPhases', async () => {
      const { data, error } = await supabase.from('sales_phases').select('*').order('name');
      if (error) throw error;
      if (data) setSalesPhases(data.map(p => ({ name: p.name })));
    });

    await runner('Transactions', async () => {
      const { data, error } = await supabase.from('finance_transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      if (data) setTransactions(data.map(t => ({
        id: t.id,
        description: t.description,
        value: Number(t.amount),
        type: (t.type === 'revenue' ? 'receita' : 'despesa') as 'receita' | 'despesa',
        category: t.category,
        date: t.date,
        status: t.status === 'completed' ? 'pago' : 'pendente'
      })));
    });

    console.log('--- Orquestração de Dados Concluída ---');
  };

  useEffect(() => { if (user?.id) refreshAppData(); }, [user?.id]);

  // 4. Handlers Principais
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
        priority: o.priority, 
        total_value: o.totalValue, 
        items: o.items,
        phase_history: o.phaseHistory, 
        responsible_staff_name: o.responsibleStaffName,
        status: o.status
      };
      
      const { data, error } = await supabase
        .from('orders_service')
        .upsert(payload)
        .select()
        .single();
        
      if (error) throw error;
      
      const saved = { 
        ...data, 
        osNumber: data.os_number, 
        orderNumber: data.order_number, 
        clientName: data.client_name, 
        totalValue: data.total_value 
      } as OrderService;
      
      setOrders(prev => {
        const exists = prev.find(x => x.id === o.id || x.id === saved.id);
        if (exists) return prev.map(x => (x.id === o.id || x.id === saved.id) ? saved : x);
        return [saved, ...prev];
      });
      
      logActivity(
        orders.find(x => x.id === o.id) ? 'update' : 'create', 
        `${orders.find(x => x.id === o.id) ? 'Atualizou' : 'Criou'} produção OS: ${o.osNumber}`, 
        saved.id, 
        o.osNumber
      );
    } catch (err) { 
      console.error('Erro ao salvar OS:', err);
      alert('Erro ao salvar Ordem de Serviço.');
    }
  };

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

  // Inject theme colors into CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const primary = companyInfo.buttonColor || '#ec5b13';
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--sidebar-bg', companyInfo.sidebarColor || '#0f172a');
    root.style.setProperty('--sidebar-text', companyInfo.sidebarTextColor || '#cbd5e1');

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


  // Real-time location sharing for Medidor
  useEffect(() => {
    if (user?.role !== 'medidor' || !('geolocation' in navigator)) return;

    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await supabase
              .from('profiles')
              .update({ 
                last_lat: latitude, 
                last_lng: longitude, 
                last_update: new Date().toISOString() 
              })
              .eq('id', user.id);
          } catch (err) {
            console.error('Erro ao atualizar localização:', err);
          }
        },
        (error) => console.error('Erro de geolocalização:', error),
        { enableHighAccuracy: true }
      );
    }, 30000); // Update every 30 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const sub = notificationService.subscribe(user.id, (n: AppNotification) => {
      // Usar a Notification API do navegador se permitida
      if (window.Notification && window.Notification.permission === 'granted') {
        new window.Notification(n.title, { body: n.message });
      }
      // Alerta simples no sistema (pode ser melhorado com um Toast)
      alert(`${n.title}\n${n.message}`);
    });

    // Pedir permissão para notificações de navegador
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    return () => {
      sub.unsubscribe();
    };
  }, [user]);



  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'manager') return;

    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, last_lat, last_lng, last_update')
          .not('last_lat', 'is', null);

        if (error) throw error;

        const locations: Record<string, DriverStatus> = {};
        data.forEach((p: any) => {
          locations[p.id] = {
            lat: p.last_lat,
            lng: p.last_lng,
            lastUpdate: new Date(p.last_update).toLocaleTimeString('pt-BR'),
            isOnline: true // Simplified logic
          };
        });
        setStaffLocations(locations);
      } catch (err) {
        console.error('Erro ao buscar localizações:', err);
      }
    };

    const intervalId = setInterval(fetchLocations, 30000);
    fetchLocations();

    return () => clearInterval(intervalId);
  }, [user]);

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
          client_code: c.code,
          rg_insc: c.rgInsc,
          cellphone: c.cellphone,
          birth_date: c.birthDate,
          seller_name: c.sellerName,
          use_special_table: c.useSpecialTable
        })
        .select()
        .single();
      
      if (error) throw error;
      const saved = data as Client;
      
      setClients(prev => {
        const exists = prev.find(x => x.id === c.id || (saved.id && x.id === saved.id));
        const mappedSaved = { 
          ...saved, 
          code: (saved as any).client_code,
          rgInsc: (saved as any).rg_insc,
          cellphone: (saved as any).cellphone,
          birthDate: (saved as any).birth_date,
          sellerName: (saved as any).seller_name,
          useSpecialTable: (saved as any).use_special_table,
          createdAt: (saved as any).created_at
        };
        if (exists) return prev.map(x => (x.id === c.id || x.id === mappedSaved.id) ? mappedSaved : x);
        return [mappedSaved, ...prev];
      });
      
      logActivity(
        clients.find(x => x.id === c.id) ? 'update' : 'create',
        `${clients.find(x => x.id === c.id) ? 'Atualizou' : 'Cadastrou'} cliente: ${c.name}`,
        saved.id,
        c.code
      );
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente no banco de dados.');
    }
  };

  const handleImportClients = async (data: any[]) => {
    try {
      if (!data || data.length === 0) return;

      const firstRow = data[0] || {};
      const keys = Object.keys(firstRow).map(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
      
      const materialIndicators = ['custo', 'margem', 'perda', 'preco', 'material', 'descricao', 'desc', 'unit_cost', 'selling_price'];
      const clientIndicators = ['documento', 'email', 'doc', 'cpf', 'cnpj', 'cliente'];
      
      const hasMaterialKeys = keys.some(k => materialIndicators.some(mi => k.includes(mi)));
      const hasClientKeys = keys.some(k => clientIndicators.some(ci => k.includes(ci)));

      if (hasMaterialKeys && !hasClientKeys) {
        console.log('Detectado formato de materiais. Redirecionando importação...');
        return handleImportMaterials(data);
      }

      const batchSize = 50;
      const totalGroups = Math.ceil(data.length / batchSize);
      
      for (let i = 0; i < totalGroups; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, data.length);
        const batch = data.slice(start, end);
        
        const clientsToInsertRaw = batch.map(row => {
          const rawCode = row.codigo || row.code;
          const parsedCode = (rawCode !== undefined && rawCode !== null && rawCode !== '') 
            ? Number(String(rawCode).replace(/\D/g, '')) 
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

        const clientsMap = new Map();
        const clientsWithoutCode = [];
        
        clientsToInsertRaw.forEach(c => {
          if (c.client_code) {
            clientsMap.set(c.client_code, c);
          } else {
            clientsWithoutCode.push(c);
          }
        });
        
        const clientsToInsert = [...Array.from(clientsMap.values()), ...clientsWithoutCode];

        const { data: insertedData, error } = await supabase
          .from('clients')
          .upsert(clientsToInsert, { onConflict: 'client_code' })
          .select();
        
        if (error) throw error;
        if (insertedData) {
          const mappedBatch = insertedData.map(c => ({
            ...c,
            code: (c as any).client_code,
            rgInsc: (c as any).rg_insc,
            cellphone: (c as any).cellphone,
            birthDate: (c as any).birth_date,
            sellerName: (c as any).seller_name,
            useSpecialTable: (c as any).use_special_table,
            createdAt: (c as any).created_at
          }));
          
          setClients(prev => {
            const newBatch = mappedBatch as Client[];
            const prevFiltered = prev.filter(p => !newBatch.some(n => n.id === p.id || (n.code && p.code && n.code === p.code)));
            return [...newBatch, ...prevFiltered];
          });
        }
      }
      
      logActivity('update', `Importou ${data.length} clientes via planilha`, 'bulk_import', 'BATCH');
      refreshAppData();
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      alert('Erro na importação: ' + err.message);
    }
  };

  const handleImportMaterials = async (data: any[]) => {
    try {
      const batchSize = 50;
      const totalGroups = Math.ceil(data.length / batchSize);
      
      for (let i = 0; i < totalGroups; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, data.length);
        const batch = data.slice(start, end);
        
        const materialsToInsertRaw = batch.map((row, idx) => {
          const getVal = (possibleKeys: string[]) => {
            const keys = Object.keys(row);
            for (const pk of possibleKeys) {
              const foundKey = keys.find(k => 
                k.toLowerCase().trim() === pk.toLowerCase().trim() ||
                k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === pk.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
              );
              if (foundKey) return row[foundKey];
            }
            return undefined;
          };

          const cost = Number(String(getVal(['custo', 'unit_cost', 'cost', 'unitCost', 'valor']) || 0).replace(/[^\d.,]/g, '').replace(',', '.'));
          const freight = Number(String(getVal(['frete', 'freight', 'freight_cost', 'freightCost']) || 0).replace(/[^\d.,]/g, '').replace(',', '.'));
          const loss = Number(String(getVal(['perda', 'loss', 'loss_percentage']) || 20).replace(/[^\d.,]/g, '').replace(',', '.'));
          const tax = Number(String(getVal(['imposto', 'tax', 'tax_percentage']) || 6).replace(/[^\d.,]/g, '').replace(',', '.'));
          const margin = Number(String(getVal(['margem', 'margin', 'profit_margin']) || 40).replace(/[^\d.,]/g, '').replace(',', '.'));
          const commission = Number(String(getVal(['comissao', 'commission', 'commission_percentage']) || 2.5).replace(/[^\d.,]/g, '').replace(',', '.'));
          const discount = Number(String(getVal(['desconto', 'discount', 'discount_percentage']) || 5).replace(/[^\d.,]/g, '').replace(',', '.'));
          const stock = Number(String(getVal(['estoque', 'stock', 'stock_quantity', 'stockQuantity', 'qtd', 'quantidade']) || 0).replace(/[^\d.,]/g, '').replace(',', '.'));
          const sellingPrice = Number(String(getVal(['preco venda', 'preco_venda', 'selling_price', 'sellingPrice', 'venda', 'preco', 'preco_total']) || 0).replace(/[^\d.,]/g, '').replace(',', '.'));

          const totalMarkup = (loss + tax + margin + commission + discount) / 100;
          const calculatedSellingPrice = totalMarkup < 1 ? cost / (1 - totalMarkup) : cost * 2;
          const finalSellingPrice = sellingPrice || Number(calculatedSellingPrice.toFixed(2));

          let itemCode = String(getVal(['codigo', 'code', 'cod', 'item']) || '').trim();
          if (!itemCode) {
            itemCode = `IMP-${Date.now()}-${start + idx}`;
          }

          return {
            code: itemCode,
            name: String(getVal(['descricao', 'name', 'material', 'produto', 'desc']) || 'Sem Descrição'),
            brand: String(getVal(['grupo', 'brand', 'group', 'categoria', 'marca', 'gr']) || 'Geral'),
            category: 'Matéria Prima',
            type: 'Matéria Prima',
            thickness: Number(String(getVal(['espessura', 'thickness', 'bitola']) || '').replace(/\D/g, '')) || 2,
            unit_cost: cost,
            freight_cost: freight,
            loss_percentage: loss,
            tax_percentage: tax,
            profit_margin: margin,
            commission_percentage: commission,
            discount_percentage: discount,
            suggested_price: finalSellingPrice,
            selling_price: finalSellingPrice,
            unit: String(getVal(['unidade', 'unit', 'un', 'medida']) || 'M2').toUpperCase(),
            status: 'ativo',
            currency: 'BRL',
            dolar_rate: 1,
            euro_rate: 1,
            stock_quantity: stock
          };
        });

        const materialsMap = new Map();
        materialsToInsertRaw.forEach(m => {
          materialsMap.set(m.code, m);
        });
        const materialsToInsert = Array.from(materialsMap.values());

        const { data: insertedData, error } = await supabase
          .from('materials')
          .upsert(materialsToInsert, { onConflict: 'code' })
          .select();
        
        if (error) throw error;
        if (insertedData) {
          const mappedBatch = insertedData.map(m => ({
            ...m,
            unitCost: m.unit_cost,
            freightCost: m.freight_cost,
            lossPercentage: m.loss_percentage,
            taxPercentage: m.tax_percentage,
            profitMargin: m.profit_margin,
            commissionPercentage: m.commission_percentage,
            discountPercentage: m.discount_percentage,
            suggestedPrice: m.suggested_price,
            sellingPrice: m.selling_price,
            minStock: m.min_stock,
            stockQuantity: m.stock_quantity,
            stockLocation: m.inventory_location
          }));
          
          setMaterials(prev => {
            const newBatch = mappedBatch as Material[];
            const prevFiltered = prev.filter(p => !newBatch.some(n => n.id === p.id || n.code === p.code));
            return [...newBatch, ...prevFiltered];
          });
        }
      }
      
      logActivity('update', `Importou ${data.length} matérias-primas via planilha`, 'bulk_import', 'BATCH');
      refreshAppData();
    } catch (err: any) {
      console.error('Erro na importação de materiais:', err);
      alert('Erro na importação: ' + err.message);
    }
  };

  // Materials será buscado no orquestrador central

  // Marcas
  const handleSaveBrand = async (b: Brand) => {
    try {
      const { error } = await supabase.from('brands').upsert({
        id: validateUUID(b.id) ? b.id : undefined,
        name: b.description
      });
      if (error) {
        alert('Erro ao salvar no banco de dados. O item será mantido apenas localmente por enquanto.');
        throw error;
      }
      setBrands(prev => {
        const index = prev.findIndex(item => item.id === b.id || item.description === b.description);
        if (index >= 0) return prev.map((item, i) => i === index ? b : item);
        return [b, ...prev];
      });
      logActivity('create', `Salvou marca: ${b.description}`);
    } catch (err) {
      console.error('Erro ao salvar marca:', err);
      // Fallback local se falhar
      setBrands(prev => prev.find(item => item.id === b.id) ? prev.map(item => item.id === b.id ? b : item) : [b, ...prev]);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    try {
      if (validateUUID(id)) {
        await supabase.from('brands').delete().eq('id', id);
      } else {
        await supabase.from('brands').delete().eq('name', brands.find(b => b.id === id)?.description);
      }
      setBrands(prev => prev.filter(item => item.id !== id));
      logActivity('delete', `Removeu marca`);
    } catch (err) {
      console.error('Erro ao deletar marca:', err);
      setBrands(prev => prev.filter(item => item.id !== id));
    }
  };

  // Grupos de Produtos
  const handleSaveProductGroup = async (g: Omit<Brand, 'createdAt'> & {createdAt?: string}) => {
    try {
      const { error } = await supabase.from('product_groups').upsert({
        id: validateUUID(g.id) ? g.id : undefined,
        code: g.code,
        description: g.description
      });
      if (error) {
        alert('Erro ao salvar no banco de dados. O item será mantido apenas localmente por enquanto.');
        throw error;
      }
      
      const groupWithDate = { ...g, createdAt: g.createdAt || new Date().toISOString() };
      setProductGroups(prev => {
        const index = prev.findIndex(item => item.id === g.id || item.code === g.code);
        if (index >= 0) return prev.map((item, i) => i === index ? groupWithDate : item);
        return [groupWithDate, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar grupo de produtos:', err);
      const groupWithDate = { ...g, createdAt: g.createdAt || new Date().toISOString() };
      setProductGroups(prev => prev.find(item => item.id === g.id) ? prev.map(item => item.id === g.id ? groupWithDate : item) : [groupWithDate, ...prev]);
    }
  };

  const handleDeleteProductGroup = async (id: string) => {
    try {
      if (validateUUID(id)) {
        await supabase.from('product_groups').delete().eq('id', id);
      } else {
        await supabase.from('product_groups').delete().eq('code', productGroups.find(g => g.id === id)?.code);
      }
      setProductGroups(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erro ao deletar grupo de produtos:', err);
      setProductGroups(prev => prev.filter(item => item.id !== id));
    }
  };

  // Grupos de Serviços
  const handleSaveServiceGroup = async (g: Omit<Brand, 'createdAt'> & {createdAt?: string}) => {
    try {
      const { error } = await supabase.from('service_groups').upsert({
        id: validateUUID(g.id) ? g.id : undefined,
        code: g.code,
        description: g.description
      });
      if (error) {
        alert('Erro ao salvar no banco de dados. O item será mantido apenas localmente por enquanto.');
        throw error;
      }
      
      const groupWithDate = { ...g, createdAt: g.createdAt || new Date().toISOString() };
      setServiceGroups(prev => {
        const index = prev.findIndex(item => item.id === g.id || item.code === g.code);
        if (index >= 0) return prev.map((item, i) => i === index ? groupWithDate : item);
        return [groupWithDate, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar grupo de serviços:', err);
      const groupWithDate = { ...g, createdAt: g.createdAt || new Date().toISOString() };
      setServiceGroups(prev => prev.find(item => item.id === g.id) ? prev.map(item => item.id === g.id ? groupWithDate : item) : [groupWithDate, ...prev]);
    }
  };

  const handleDeleteServiceGroup = async (id: string) => {
    try {
      if (validateUUID(id)) {
        await supabase.from('service_groups').delete().eq('id', id);
      } else {
        await supabase.from('service_groups').delete().eq('code', serviceGroups.find(g => g.id === id)?.code);
      }
      setServiceGroups(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erro ao deletar grupo de serviços:', err);
      setServiceGroups(prev => prev.filter(item => item.id !== id));
    }
  };
  
  const handleSaveMaterial = async (m: Material) => {
    try {
      const payload = {
        id: validateUUID(m.id) ? m.id : undefined,
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
        supplier_id: m.supplierId, // Sync with column name
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
        m2PerUnit: savedRow.m2_per_unit,
        supplierId: savedRow.supplier_id
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
  
  // Architects será buscado no orquestrador central

  const handleSaveArchitect = async (a: Architect) => {
    try {
      const { data, error } = await supabase
        .from('architects')
        .upsert({
          id: a.id.length > 20 ? a.id : undefined,
          type: a.type,
          document: a.document,
          legal_name: a.legalName,
          trading_name: a.tradingName,
          contact_name: a.contactName,
          email: a.email,
          phone: a.phone,
          cellphone: a.cellphone,
          address: a.address,
          observations: a.observations,
          rg_insc: a.rgInsc,
          architect_code: a.code
        })
        .select()
        .single();
      
      if (error) throw error;
      const saved = { 
        ...data, 
        legalName: data.legal_name, 
        tradingName: data.trading_name, 
        contactName: data.contact_name,
        rgInsc: data.rg_insc,
        cellphone: data.cellphone,
        observations: data.observations,
        code: data.architect_code,
        createdAt: data.created_at
      } as Architect;
      
      setArchitects(prev => {
        const exists = prev.find(x => x.id === a.id || x.id === saved.id);
        if (exists) return prev.map(x => (x.id === a.id || x.id === saved.id) ? saved : x);
        return [saved, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar arquiteto:', err);
      alert('Erro ao salvar arquiteto no banco de dados.');
    }
  };

  // Sales será buscado no orquestrador central

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
            priority: 'media',
            dueDate: s.date,
            totalValue: s.total,
            imageUrls: []
          };
          await handleSaveOrder(newOrder);
        }
      }

    } catch (err) {
      console.error('Erro ao salvar venda:', err);
      alert('Erro ao salvar venda no banco de dados.');
    }
  };




  const handleUpdateCompany = async (info: CompanyInfo) => {
    setCompanyInfo(info);
    try {
      // Tentar salvar no banco se houver sessão
      if (user) {
        console.log('[App] Persistindo configurações da empresa no Supabase...');
        const { error } = await supabase
          .from('company_info')
          .upsert({
            id: 1, // Usamos um ID fixo para configurações globais
            name: info.name,
            document: info.document,
            address: info.address,
            phone: info.phone,
            email: info.email,
            logo_url: info.logoUrl,
            button_color: info.buttonColor,
            sidebar_color: info.sidebarColor,
            sidebar_text_color: info.sidebarTextColor,
            lost_reason_options: info.lostReasonOptions
          });
        if (error) {
          console.warn('[App] Erro ao persistir no banco (pode ser falta da tabela):', error.message);
        }
      }
    } catch (err) {
      console.error('[App] Erro crítico ao salvar configurações:', err);
    }
  };

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
          address: s.address,
          rg_insc: s.rgInsc,
          cellphone: s.cellphone,
          observations: s.observations,
          supplier_code: s.code
        })
        .select()
        .single();
      
      if (error) throw error;
      const saved = { 
        ...data, 
        legalName: data.legal_name, 
        tradingName: data.trading_name, 
        contactName: data.contact_name,
        rgInsc: data.rg_insc,
        cellphone: data.cellphone,
        observations: data.observations,
        code: data.supplier_code,
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

  // Master List for Service Groups provided by User
  const MASTER_SERVICE_GROUPS = [
    { id: '06', code: '06', description: 'BALCAO' },
    { id: '28', code: '28', description: 'BANCADA' },
    { id: '29', code: '29', description: 'BASE' },
    { id: '40', code: '40', description: 'BOQUETA' },
    { id: '42', code: '42', description: 'BORDA' },
    { id: '34', code: '34', description: 'CACOS / RETALHOS' },
    { id: '32', code: '32', description: 'CANTONEIRA' },
    { id: '21', code: '21', description: 'COLUNA' },
    { id: '16', code: '16', description: 'CUBA ESCULPIDA' },
    { id: '39', code: '39', description: 'DEGRAUS' },
    { id: '19', code: '19', description: 'DIVISORIA' },
    { id: '23', code: '23', description: 'ENGROSSO' },
    { id: '07', code: '07', description: 'ESPELHO' },
    { id: '46', code: '46', description: 'EXTENSAO' },
    { id: '22', code: '22', description: 'FAIXA' },
    { id: '44', code: '44', description: 'FECHAMENTO' },
    { id: '37', code: '37', description: 'FILETE' },
    { id: '47', code: '47', description: 'FRONTAO' },
    { id: '11', code: '11', description: 'GUARNICAO' },
    { id: '03', code: '03', description: 'LAVATORIO' },
    { id: '25', code: '25', description: 'MESA' },
    { id: '36', code: '36', description: 'MOLDURA' },
    { id: '33', code: '33', description: 'NICHO' },
    { id: '05', code: '05', description: 'PALITO' },
    { id: '48', code: '48', description: 'PAPELEIRA' },
    { id: '31', code: '31', description: 'PATAMAR' },
    { id: '30', code: '30', description: 'PE' },
    { id: '24', code: '24', description: 'PE CAIXA' },
    { id: '08', code: '08', description: 'PEITORIL' },
    { id: '02', code: '02', description: 'PIA' },
    { id: '09', code: '09', description: 'PISANTE' },
    { id: '17', code: '17', description: 'PISO' },
    { id: '20', code: '20', description: 'PRATELEIRA' },
    { id: '45', code: '45', description: 'REVESTIMENTO' },
    { id: '18', code: '18', description: 'RODABASE' },
    { id: '10', code: '10', description: 'RODAPE' },
    { id: '15', code: '15', description: 'SAIA' },
    { id: '26', code: '26', description: 'SERVIÇO' },
    { id: '04', code: '04', description: 'SOLEIRA' },
    { id: '12', code: '12', description: 'TAMPO' },
    { id: '35', code: '35', description: 'TAMPO REDONDO' },
    { id: '41', code: '41', description: 'TESTEIRA' },
    { id: '43', code: '43', description: 'TUMULO' }
  ];

  useEffect(() => {
    if (!user?.id) return;
    // Otimização: Escutar apenas mudanças nas tabelas que realmente afetam a UI principal
    // E usar um debounce simples (via tempo de resposta)
    const subscription = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public' }, (payload) => {
        console.log('[Realtime] Novo registro detectado:', payload.table);
        refreshAppData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public' }, (payload) => {
        // Se for uma atualização de localização, não precisamos recarregar TUDO
        if (payload.table === 'profiles' && (payload.new as any).last_lat) return;
        console.log('[Realtime] Alteração detectada em:', payload.table);
        refreshAppData();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public' }, (payload) => {
        console.log('[Realtime] Remoção detectada:', payload.table);
        refreshAppData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);





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
        type: data.type as any,
        action: data.type as any,
        description: data.message,
        details: data.message,
        orderId: data.reference_id
      };
      
      setActivities(prev => [newLog, ...prev].slice(0, 100));

    } catch (err) {
      console.error('Erro ao registrar log no Supabase:', err);
      // Fallback local se falhar
      const fallbackLog: ActivityLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userName: user?.name || 'Sistema',
        type: action,
        action: action,
        description: message,
        details: message,
        orderId: referenceId,
        osNumber: orderNumber
      };
      setActivities(prev => [fallbackLog, ...prev].slice(0, 100));
    }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    if (u.role === 'driver') {
      setCurrentView('Agenda de Entregas');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
    
    // Limpeza seletiva do localStorage: remove tokens do Supabase (sb-*) e dados do app (marmo_*)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('marmo_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Limpeza de estado React
    setUser(null);
    setOrders([]);
    setDeliveries([]);
    setSales([]);
    setActivities([]);
    setClients([]);
    setSuppliers([]);
    setMaterials([]);
    setProducts([]);
    setAppUsers([]);
    
    window.location.reload();
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

  const addMeasurement = async (measurement: Omit<Measurement, 'id'>) => {
    try {
      const payload = {
        order_id: measurement.orderId,
        os_number: measurement.osNumber,
        client_name: measurement.clientName,
        address: measurement.address,
        date: measurement.date,
        time: measurement.time,
        status: measurement.status
      };

      const { data, error } = await supabase
        .from('measurements')
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;

      const newMeasurement = {
        ...data,
        orderId: data.order_id,
        osNumber: data.os_number,
        clientName: data.client_name
      } as Measurement;

      setMeasurements(prev => [newMeasurement, ...prev]);
      logActivity('update', `Agendou medição para a O.S. ${newMeasurement.osNumber} em ${newMeasurement.address}`, newMeasurement.orderId, newMeasurement.osNumber);
    } catch (err) {
      console.error('Erro ao adicionar medição:', err);
    }
  };

  const updateMeasurementStatus = async (id: string, status: Measurement['status']) => {
    try {
      const { error } = await supabase
        .from('measurements')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      setMeasurements(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    } catch (err) {
      console.error('Erro ao atualizar status da medição:', err);
    }
  };

  const deleteMeasurement = async (id: string) => {
    const measurement = measurements.find(m => m.id === id);
    if (!measurement) return;

    try {
      const { error } = await supabase
        .from('measurements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setMeasurements(prev => prev.filter(m => m.id !== id));
      logActivity('delete', `Removeu agendamento de medição da O.S. ${measurement.osNumber}`, measurement.orderId, measurement.osNumber);
    } catch (err) {
      console.error('Erro ao deletar medição:', err);
    }
  };

  const updateMeasurement = async (id: string, updates: Partial<Measurement>) => {
    try {
      const payload: any = { ...updates };
      if (updates.orderId) payload.order_id = updates.orderId;
      if (updates.osNumber) payload.os_number = updates.osNumber;
      if (updates.clientName) payload.client_name = updates.clientName;

      delete payload.orderId;
      delete payload.osNumber;
      delete payload.clientName;

      const { error } = await supabase
        .from('measurements')
        .update(payload)
        .eq('id', id);
      
      if (error) throw error;

      setMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      const measurement = measurements.find(m => m.id === id);
      if (measurement) {
        logActivity('update', `Atualizou agendamento de medição da O.S. ${measurement.osNumber}`, measurement.orderId, measurement.osNumber);
      }
    } catch (err) {
      console.error('Erro ao atualizar medição:', err);
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

  const handleSaveUser = async (u: AppUser) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: u.name, 
          role: u.role,
          avatar_url: u.avatarUrl 
        })
        .eq('id', u.id);
      
      if (error) throw error;
      setAppUsers(prev => prev.map(x => x.id === u.id ? u : x));
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err);
      alert('Erro ao atualizar perfil: ' + err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const targetUser = appUsers.find(u => u.id === id);
    if (targetUser?.isMaster) {
      alert('Ação Bloqueada: Este é o Administrador Master e não pode ser excluído.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja remover o acesso deste usuário?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) {
        if (error.message.includes('Administrador Master')) {
          alert('Ação Bloqueada: ' + error.message);
          return;
        }
        throw error;
      }
      
      setAppUsers(prev => prev.filter(x => x.id !== id));
      logActivity('delete', `Removeu acesso do usuário: ${targetUser?.name || id}`);
    } catch (err: any) {
      console.error('Erro ao deletar usuário:', err);
      alert('Erro ao excluir usuário: ' + err.message);
    }
  };

  const handleSaveStaff = async (s: ProductionStaff) => {
    try {
      const { error } = await supabase.from('production_staff').upsert({
        id: validateUUID(s.id) ? s.id : undefined,
        name: s.name,
        position: s.position || '',
        hourly_rate: s.hourlyRate || 0,
        phone: s.phone || '',
        status: s.status || 'ativo'
      });
      if (error) throw error;
      setStaff(prev => {
        const index = prev.findIndex(item => item.id === s.id);
        if (index >= 0) return prev.map((item, i) => i === index ? s : item);
        return [s, ...prev];
      });
    } catch (err) {
      console.error('Erro ao salvar funcionário:', err);
      // Fallback local se falhar
      setStaff(prev => prev.find(item => item.id === s.id) ? prev.map(item => item.id === s.id ? s : item) : [s, ...prev]);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      if (validateUUID(id)) {
        await supabase.from('production_staff').delete().eq('id', id);
      }
      setStaff(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Erro ao deletar funcionário:', err);
      setStaff(prev => prev.filter(x => x.id !== id));
    }
  };

  const addSalesPhase = async (name: string) => {
    try {
      if (!salesPhases.find(p => p.name === name)) {
        await supabase.from('sales_phases').insert({ name });
        setSalesPhases([...salesPhases, { name }]);
      }
    } catch (err) {
      console.error('Erro ao salvar fase de venda:', err);
      if (!salesPhases.find(p => p.name === name)) {
        setSalesPhases([...salesPhases, { name }]);
      }
    }
  };

  const renameSalesPhase = async (oldName: string, newName: string) => {
    try {
      await supabase.from('sales_phases').update({ name: newName }).eq('name', oldName);
      setSalesPhases(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
      setSales(prev => prev.map(s => s.salesPhase === oldName ? { ...s, salesPhase: newName } : s));
    } catch(err) {
      console.error(err);
      setSalesPhases(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    }
  };

  const deleteSalesPhase = async (name: string) => {
    try {
      await supabase.from('sales_phases').delete().eq('name', name);
      setSalesPhases(prev => prev.filter(p => p.name !== name));
    } catch(err) {
      console.error(err);
      setSalesPhases(prev => prev.filter(p => p.name !== name));
    }
  };

  const handleSaveChannel = async (c: SalesChannel) => {
    try {
      await supabase.from('sales_channels').upsert({ 
        id: validateUUID(c.id) ? c.id : undefined, 
        name: c.name, 
        color: c.color 
      });
      setSalesChannels(prev => {
        const index = prev.findIndex(item => item.id === c.id);
        if (index >= 0) return prev.map((item, i) => i === index ? c : item);
        return [c, ...prev];
      });
    } catch(err) {
      console.error(err);
      setSalesChannels(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      if (validateUUID(id)) await supabase.from('sales_channels').delete().eq('id', id);
      setSalesChannels(prev => prev.filter(x => x.id !== id));
    } catch(err) {
      console.error(err);
      setSalesChannels(prev => prev.filter(x => x.id !== id));
    }
  };

  const onAddTransaction = async (t: Omit<FinanceTransaction, 'id'>) => {
    try {
      const { data, error } = await supabase.from('finance_transactions').insert({
        description: t.description,
        amount: t.value,
        type: t.type === 'receita' ? 'revenue' : 'expense',
        category: t.category,
        date: t.date,
        status: t.status === 'pago' ? 'completed' : 'pending'
      }).select().single();
      
      if (error) throw error;
      if (data) {
        const newTrans: FinanceTransaction = {
          ...t,
          id: data.id
        };
        setTransactions(prev => [newTrans, ...prev]);
      }
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
      const newTrans: FinanceTransaction = { ...t, id: Date.now().toString() };
      setTransactions(prev => [newTrans, ...prev]);
    }
  };

  const onDeleteTransaction = async (id: string) => {
    try {
      if (validateUUID(id)) await supabase.from('finance_transactions').delete().eq('id', id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Erro ao deletar transação:', err);
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const reorderSalesPhases = (startIndex: number, endIndex: number) => {
    const result = Array.from(salesPhases);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSalesPhases(result);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 border-4 border-[#ec5b13] border-t-transparent rounded-full animate-spin"></div>
          <div className="space-y-2">
            <p className="text-slate-700 font-bold text-lg animate-pulse">Carregando KeepGoing...</p>
            <p className="text-slate-400 text-sm">Validando sua sessão e dados locais...</p>
          </div>
          
          <div className="pt-8 border-t border-slate-200">
            <button 
              onClick={() => {
                if (window.confirm("Isso irá limpar as configurações locais salvas no seu navegador (como cores e preferências) para tentar destravar o sistema. Deseja continuar?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-xs text-slate-400 underline hover:text-[#ec5b13] transition-colors"
            >
              O sistema está demorando? Clique aqui para resetar dados locais.
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        {authError && (
          <div className="max-w-md w-full mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700 font-medium">
                  {authError}
                </p>
              </div>
            </div>
          </div>
        )}
        <Login onLogin={handleLogin} />
      </div>
    );
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
      case 'Agenda de Medições':
        return (
          <MeasurementSchedule 
            orders={orders} 
            measurements={measurements} 
            onAddMeasurement={addMeasurement} 
            onUpdateMeasurementStatus={updateMeasurementStatus} 
            onUpdateMeasurement={updateMeasurement}
            onDeleteMeasurement={deleteMeasurement}
            onReorderMeasurements={(newMeasurements) => setMeasurements(newMeasurements)}
            companyAddress={companyInfo.address}
            companyName={companyInfo.name}
            companyLogoUrl={companyInfo.logoUrl}
            userRole={user?.role}
            staffLocations={staffLocations}
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
            onUpdateCompany={handleUpdateCompany}
            onImportClients={handleImportClients}
            onImportMaterials={handleImportMaterials}
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
            onImportMaterials={handleImportMaterials}
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
        return <FinanceView transactions={transactions} onAddTransaction={onAddTransaction} onDeleteTransaction={onDeleteTransaction} />;
      case 'Financeiro':
        return <FinanceView transactions={transactions} onAddTransaction={onAddTransaction} onDeleteTransaction={onDeleteTransaction} />;
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
        return (
          <ArchitectsView 
            architects={architects} 
            onSaveArchitect={handleSaveArchitect} 
            onDeleteArchitect={async (id) => {
              const { error } = await supabase.from('architects').delete().eq('id', id);
              if (!error) setArchitects(prev => prev.filter(x => x.id !== id));
            }} 
          />
        );
      case 'Canais de Vendas':
        return <SalesChannelsView channels={salesChannels} onSaveChannel={handleSaveChannel} onDeleteChannel={handleDeleteChannel} />;
      case 'Marcas':
        return <BrandsView brands={brands} onSaveBrand={handleSaveBrand} onDeleteBrand={handleDeleteBrand} />;
      case 'Grupos de Produtos':
        return <ProductGroupsView groups={productGroups} onSaveGroup={handleSaveProductGroup} onDeleteGroup={handleDeleteProductGroup} />;
      case 'Grupos de Serviços':
        return <ServiceGroupsView groups={serviceGroups} onSaveGroup={handleSaveServiceGroup} onDeleteGroup={handleDeleteServiceGroup} />;
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
        user={user}
        exchangeRates={exchangeRates}
        onLogout={handleLogout}
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
}

export default App;
