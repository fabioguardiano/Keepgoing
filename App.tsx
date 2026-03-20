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
import { useActivities } from './hooks/useActivities';
import { useClients } from './hooks/useClients';
import { useMaterials } from './hooks/useMaterials';
import { useSales } from './hooks/useSales';
import { useArchitects } from './hooks/useArchitects';
import { useFinance } from './hooks/useFinance';
import { useSuppliers } from './hooks/useSuppliers';
import { useDeliveries } from './hooks/useDeliveries';
import { useProducts } from './hooks/useProducts';
import { useSettings } from './hooks/useSettings';
import 'leaflet/dist/leaflet.css';


const App: React.FC = () => {
  // 1. Estados de Autenticação e UI de topo
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>('Produção');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 2. Logs de Atividade (Depende do usuário)
  const { activities, logActivity } = useActivities(user);

  // 3. Estado de Ordens de Serviço (Lógica modularizada mas mantida em App para orquestração)
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Efeito de busca de ordens
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
        console.error('Erro ao carregar ordens de serviço:', err);
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

      const { data, error } = await supabase.from('orders_service').upsert(payload).select().single();
      if (error) throw error;
      
      const savedOrder = {
        ...data,
        osNumber: data.os_number,
        orderNumber: data.order_number,
        clientName: data.client_name,
        projectDescription: data.project_description,
        materialArea: data.material_area,
        clientId: data.client_id,
        architectId: data.architect_id,
        architectName: data.architect_name,
        totalValue: data.total_value,
        remainingValue: data.remaining_value,
        imageUrls: data.image_urls,
        phaseHistory: data.phase_history,
        responsibleStaffName: data.responsible_staff_name,
        salesChannel: data.sales_channel,
        salesPhase: data.sales_phase,
        isOsGenerated: data.is_os_generated,
        discountValue: data.discount_value,
        discountPercentage: data.discount_percentage,
        paymentConditions: data.payment_conditions,
        deliveryDeadline: data.delivery_deadline,
        lostReason: data.lost_reason,
        lost_details: data.lost_details,
        createdAt: data.created_at
      } as OrderService;
      
      setOrders(prev => prev.find(x => x.id === o.id || x.id === savedOrder.id) ? prev.map(x => (x.id === o.id || x.id === savedOrder.id) ? savedOrder : x) : [savedOrder, ...prev]);
      logActivity(orders.find(x => x.id === o.id) ? 'update' : 'create', `${orders.find(x => x.id === o.id) ? 'Atualizou' : 'Iniciou'} produção da OS: ${o.osNumber}`, savedOrder.id, o.osNumber);
    } catch (err) {
      console.error('Erro ao salvar ordem de serviço:', err);
    }
  };

  // 4. Hooks de Domínio (Dependem de company_id e logActivity)
  const { sales, handleSaveSale: saveSaleBase, setSales } = useSales(user?.company_id, logActivity);
  const { clients, loadingClients, handleSaveClient, handleImportClients, deleteClient, setClients } = useClients(user?.company_id, logActivity);
  const { materials, handleSaveMaterial, setMaterials } = useMaterials(user?.company_id, logActivity);
  const { deliveries, addDelivery, updateDeliveryStatus, updateDelivery, deleteDelivery, setDeliveries } = useDeliveries(user?.company_id, logActivity);
  const { transactions, handleSaveTransaction, deleteTransaction, setTransactions } = useFinance(user?.company_id, logActivity);
  const { suppliers, handleSaveSupplier, deleteSupplier, setSuppliers } = useSuppliers(user?.company_id, logActivity);
  const { architects, handleSaveArchitect, deleteArchitect, setArchitects } = useArchitects(user?.company_id, logActivity);
  const { products, handleSaveProduct } = useProducts(user?.company_id, logActivity);

  // 5. Configurações Globais (Depende de setOrders e setSales para renomeação de fases)
  const { 
    appUsers, handleSaveUser, handleDeleteUser,
    staff, handleSaveStaff, handleDeleteStaff,
    phases, addPhase, renamePhase, deletePhase, reorderPhases, togglePhaseRequirement,
    salesPhases, addSalesPhase, renameSalesPhase, deleteSalesPhase, reorderSalesPhases,
    brands, handleSaveBrand, handleDeleteBrand,
    productGroups, handleSaveProductGroup, handleDeleteProductGroup,
    serviceGroups, handleSaveServiceGroup, handleDeleteServiceGroup,
    salesChannels, handleSaveSalesChannel, handleDeleteSalesChannel,
    companyInfo, setCompanyInfo
  } = useSettings(setOrders, setSales);

  // 6. Efeitos de Terceiros e Gerais
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 0, eur: 0, lastUpdate: '--:--' });
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL');
        if (response.ok) {
          const data = await response.json();
          setExchangeRates({
            usd: Number(data.USDBRL.bid),
            eur: Number(data.EURBRL.bid),
            lastUpdate: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        }
      } catch (error) { console.error('Erro cotações:', error); }
    };
    fetchRates();
    const inv = setInterval(fetchRates, 300000);
    return () => clearInterval(inv);
  }, []);

  // 7. Handlers de Negócio Orquestrados
  const handleSaveSale = async (s: SalesOrder) => {
    try {
      const savedSale = await saveSaleBase(s);
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
    } catch (err) { /* Erro já tratado no hook */ }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('marmo_user', JSON.stringify(u));
    if (u.role === 'driver') setCurrentView('Agenda de Entregas');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('marmo_user');
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
      handleSaveOrder({ ...order, phaseHistory: history });
      logActivity('update', `Adicionou ${staffName} como responsável na fase ${phaseName}`, orderId, order.osNumber);
    }
  };

  // Persistência inicial de login
  useEffect(() => {
    const savedUser = localStorage.getItem('marmo_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // 8. Lógica de Renderização
  if (!user) return <Login onLogin={handleLogin} />;

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
        return <ClientsView clients={clients} onSaveClient={handleSaveClient} onDeleteClient={deleteClient} />;
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
              if (m) await handleSaveMaterial({ ...m, status });
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
          'Mão de obra (Instalação) Spain': 'Colocação',
          'Serviços': 'Serviços'
        };
        return (
          <ProductsView 
            category={(categoryMap[currentView] || currentView) as any} 
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
        return <FinanceView transactions={transactions} onAddTransaction={handleSaveTransaction} />;
      case 'Fornecedores':
        return <SuppliersView suppliers={suppliers} onSaveSupplier={handleSaveSupplier} onDeleteSupplier={deleteSupplier} />;
      case 'Arquitetos':
        return <ArchitectsView architects={architects} onSaveArchitect={handleSaveArchitect} onDeleteArchitect={deleteArchitect} />;
      case 'Canais de Vendas':
        return <SalesChannelsView channels={salesChannels} onSaveChannel={handleSaveSalesChannel} onDeleteChannel={handleDeleteSalesChannel} />;
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
        userRole={user.role}
        exchangeRates={exchangeRates}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={handleLogout} onSearch={setSearchQuery} onToggleActivity={() => setIsHistoryOpen(!isHistoryOpen)} />
        <RecentActivity activities={activities} isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
        <main className="flex-1 overflow-x-auto p-4 kanban-container">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
