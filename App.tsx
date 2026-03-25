import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { PlaceholderView } from './components/PlaceholderView';
import { TeamView } from './components/TeamView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { RecentActivity } from './components/RecentActivity';
import { DeliverySchedule } from './components/DeliverySchedule';
import { ClientsView } from './components/ClientsView';
import { SalesView } from './components/SalesView';
import { InventoryView } from './components/InventoryView';
import { FinanceView } from './components/FinanceView';
import { AccountsView } from './components/AccountsView';
import { PaymentMethodsView } from './components/PaymentMethodsView';
import { PaymentTypesView } from './components/PaymentTypesView';
import { SuppliersView } from './components/SuppliersView';
import { ArchitectsView } from './components/ArchitectsView';
import { SalesChannelsView } from './components/SalesChannelsView';
import { ProductsView } from './components/ProductsView';
import { NewProductModal } from './components/NewProductModal';
import { BrandsView } from './components/BrandsView';
import { ProductGroupsView } from './components/ProductGroupsView';
import { ServiceGroupsView } from './components/ServiceGroupsView';
import { MOCK_ORDERS } from './constants';
import { OrderService, User, View, ProductionPhase, INITIAL_PHASES, AppUser, ProductionStaff, PhaseConfig, ActivityLog, Delivery, CompanyInfo, Client, Material, SalesOrder, SalesChannel, FinanceTransaction, Supplier, Architect, ProductService, Brand, ProductGroup, ServiceGroup, SalesPhaseConfig, ExchangeRates } from './types';
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
import { useAccountsReceivable } from './hooks/useAccountsReceivable';
import { useAccountsPayable } from './hooks/useAccountsPayable';
import { usePaymentMethods } from './hooks/usePaymentMethods';
import { usePaymentTypes } from './hooks/usePaymentTypes';
import { useWorkOrders } from './hooks/useWorkOrders';
import { useDiscountAuthorizations } from './hooks/useDiscountAuthorizations';
import { WorkOrdersView } from './components/WorkOrdersView';
import { WorkOrderKanban } from './components/WorkOrderKanban';
import 'leaflet/dist/leaflet.css';


const App: React.FC = () => {
  // 1. Estados de Autenticação e UI de topo
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>('Produção');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 2. Logs de Atividade (Depende do usuário)
  const { activities, logActivity } = useActivities(user);

  // 3. Estado de Ordens de Serviço (Lógica modularizada mas mantida em App para orquestração)
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Efeito de busca de ordens — depende do company_id para evitar vazar dados entre empresas
  useEffect(() => {
    if (!user?.company_id) return;
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const { data, error } = await supabase
          .from('orders_service')
          .select('*')
          .eq('company_id', user.company_id)
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
  }, [user?.company_id]);

  const handleSaveOrder = async (o: OrderService) => {
    try {
      const payload = {
        id: o.id.length > 20 ? o.id : undefined,
        company_id: user?.company_id || '00000000-0000-0000-0000-000000000000',
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
  // Só passamos o companyId quando authReady=true para evitar busca prematura com UUID errado
  const activeCompanyId = authReady ? user?.company_id : undefined;
  const { sales, handleSaveSale: saveSaleBase, setSales, refreshSales } = useSales(activeCompanyId, logActivity);
  const { clients, loadingClients, handleSaveClient, handleImportClients, deleteClient, setClients } = useClients(activeCompanyId, logActivity);
  const { materials, handleSaveMaterial, setMaterials } = useMaterials(activeCompanyId, logActivity);
  const { deliveries, addDelivery, updateDeliveryStatus, updateDelivery, deleteDelivery, setDeliveries } = useDeliveries(activeCompanyId, logActivity);
  const { transactions, handleSaveTransaction, deleteTransaction, setTransactions } = useFinance(activeCompanyId, logActivity);
  const { suppliers, handleSaveSupplier, deleteSupplier, setSuppliers } = useSuppliers(activeCompanyId, logActivity);
  const { architects, handleSaveArchitect, deleteArchitect, setArchitects } = useArchitects(activeCompanyId, logActivity);
  const { products, handleSaveProduct } = useProducts(activeCompanyId, logActivity);
  const { receivables, handleSaveReceivable, deleteReceivable, payInstallment: payReceivableInstallment, unpayInstallment: unpayReceivableInstallment } = useAccountsReceivable(activeCompanyId);
  const { payables, handleSavePayable, deletePayable, payInstallment: payPayableInstallment, unpayInstallment: unpayPayableInstallment } = useAccountsPayable(activeCompanyId);
  const { paymentMethods, handleSavePaymentMethod, deletePaymentMethod, toggleActive } = usePaymentMethods(activeCompanyId);
  const { paymentTypes, handleSavePaymentType, deletePaymentType: handleDeletePaymentType } = usePaymentTypes(activeCompanyId);
  const { workOrders, loadingWO, createWorkOrders, updateWorkOrderStatus, updateWorkOrderPhase, updateWorkOrder, addDrawing, deleteDrawing, getEnvironmentOSMap, refreshWorkOrders } = useWorkOrders(activeCompanyId);
  const { authorizations, requestAuthorization, resolveAuthorization } = useDiscountAuthorizations(activeCompanyId);

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
    const controller = new AbortController();
    const fetchRates = async () => {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL', { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setExchangeRates({
            usd: Number(data.USDBRL.bid),
            eur: Number(data.EURBRL.bid),
            lastUpdate: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Erro cotações:', error);
        setExchangeRates(prev => prev.usd > 0 ? prev : { usd: 5.70, eur: 6.10, lastUpdate: 'Offline' });
      }
    };
    fetchRates();
    const inv = setInterval(fetchRates, 300000);
    return () => { clearInterval(inv); controller.abort(); };
  }, []);

  // 7. Handlers de Negócio Orquestrados
  const handleSaveSale = async (s: SalesOrder) => {
    // ── Retorno Pedido → Orçamento: protege o financeiro ──────────────────────
    if (s.status === 'Orçamento' && s.id) {
      const previousSale = sales.find(x => x.id === s.id);
      if (previousSale?.status === 'Pedido') {
        const linkedAR = receivables.find(r => r.saleId === s.id && r.status !== 'cancelado');
        if (linkedAR) {
          const hasPaid = linkedAR.installments.some(i => i.status === 'pago');
          if (hasPaid) {
            throw new Error(
              'Este pedido possui pagamentos registrados no Contas a Receber. ' +
              'Estorne os pagamentos antes de retornar para Orçamento.'
            );
          }
          // Nenhum pagamento recebido — cancela o AR (mantém histórico)
          await handleSaveReceivable({ ...linkedAR, status: 'cancelado' });
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    try {
      const savedSale = await saveSaleBase(s);
      const saleId = (savedSale as any)?.id || s.id;

      // Auto-cria Conta a Receber quando venda vira Pedido com forma de pagamento
      if (s.status === 'Pedido' && s.paymentMethodId && s.firstDueDate) {
        // Ignora ARs cancelados para permitir recriação após retorno de orçamento
        const existingAR = receivables.find(r => r.saleId === saleId && r.status !== 'cancelado');
        if (!existingAR) {
          const pm = paymentMethods.find(p => p.id === s.paymentMethodId);
          const total = s.totals?.geral ?? s.totalValue ?? 0;
          const n = s.paymentInstallments || 1;
          const firstDate = new Date(s.firstDueDate + 'T12:00:00');
          // Desconta a taxa da operadora: ela cobra installmentFee% por parcela (exceto a 1ª)
          const fee = (pm?.installmentFee ?? 0);
          const netTotal = fee > 0 && n > 1
            ? Math.round(total * (1 - (fee * (n - 1)) / 100) * 100) / 100
            : total;
          const baseValue = Math.floor((netTotal / n) * 100) / 100;
          const diff = Math.round((netTotal - baseValue * n) * 100) / 100;
          const installments = Array.from({ length: n }, (_, i) => ({
            id: crypto.randomUUID(),
            number: i + 1,
            dueDate: new Date(firstDate.getFullYear(), firstDate.getMonth() + i, firstDate.getDate()).toISOString().split('T')[0],
            value: i === 0 ? baseValue + diff : baseValue,
            status: 'pendente' as const,
          }));
          const feeNote = fee > 0 && n > 1
            ? ` | Taxa operadora: ${fee}% × ${n - 1} = ${(fee * (n - 1)).toFixed(2)}% | Líquido: R$ ${netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : '';
          await handleSaveReceivable({
            id: undefined as any,
            description: `Venda ${s.orderNumber} — ${s.clientName}${feeNote}`,
            clientId: s.clientId,
            clientName: s.clientName || '',
            saleId,
            orderNumber: s.orderNumber || '',
            totalValue: netTotal,
            paidValue: 0,
            installments,
            paymentMethodId: s.paymentMethodId,
            paymentMethodName: pm?.name || s.paymentMethodName || '',
            category: 'Venda',
            dueDate: s.firstDueDate,
            notes: s.paymentConditions || '',
            status: 'pendente',
            companyId: activeCompanyId || '',
            createdAt: new Date().toISOString(),
          } as any);
        }
      }

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('marmo_user');
  };


  // Persistência inicial de login via Supabase Auth
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userMetadata = session.user.user_metadata;
        const mappedUser = {
          id: session.user.id,
          email: session.user.email,
          name: userMetadata.full_name || userMetadata.name || session.user.email?.split('@')[0],
          role: userMetadata.role || 'viewer',
          company_id: userMetadata.company_id || '00000000-0000-0000-0000-000000000000',
          status: 'ativo',
          createdAt: session.user.created_at
        } as User;

        setUser(mappedUser);
        localStorage.setItem('marmo_user', JSON.stringify(mappedUser));
      } else {
        // Fallback for legacy local storage users if any (optional)
        const savedUser = localStorage.getItem('marmo_user');
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            if (u && !u.company_id) {
              u.company_id = '00000000-0000-0000-0000-000000000000';
              localStorage.setItem('marmo_user', JSON.stringify(u));
            }
            setUser(u);
          } catch (e) {
            console.error('Erro ao recuperar usuário local:', e);
          }
        }
      }
      setAuthReady(true);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userMetadata = session.user.user_metadata;
        const mappedUser = {
          id: session.user.id,
          email: session.user.email,
          name: userMetadata.full_name || userMetadata.name || session.user.email?.split('@')[0],
          role: userMetadata.role || 'viewer',
          company_id: userMetadata.company_id || '00000000-0000-0000-0000-000000000000',
          status: 'ativo',
          createdAt: session.user.created_at
        } as User;
        setUser(prev => {
          if (prev?.id === mappedUser.id && prev?.company_id === mappedUser.company_id) return prev;
          return mappedUser;
        });
        localStorage.setItem('marmo_user', JSON.stringify(mappedUser));
      } else {
        setUser(null);
        localStorage.removeItem('marmo_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 8. Lógica de Renderização
  if (!user) return <Login onLogin={handleLogin} />;

  const filteredOrders = orders.filter(o =>
    (o.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.osNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (currentView) {
      case 'Produção':
        return (
          <WorkOrderKanban
            workOrders={workOrders}
            phases={phases}
            appUsers={appUsers}
            currentUserName={user?.name || user?.email || 'Usuário'}
            onUpdatePhase={updateWorkOrderPhase}
            onUpdate={updateWorkOrder}
            onAddDrawing={addDrawing}
            onDeleteDrawing={deleteDrawing}
          />
        );
      case 'O.S. de Produção':
        return (
          <WorkOrdersView
            workOrders={workOrders}
            loading={loadingWO}
            onUpdateStatus={updateWorkOrderStatus}
          />
        );
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
            paymentTypes={paymentTypes}
            onSavePaymentType={handleSavePaymentType}
            onDeletePaymentType={handleDeletePaymentType}
            paymentMethods={paymentMethods}
            onSavePaymentMethod={handleSavePaymentMethod}
            onDeletePaymentMethod={deletePaymentMethod}
            onTogglePaymentMethod={toggleActive}
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
            paymentMethods={paymentMethods}
            onRenameSalesPhase={renameSalesPhase}
            onDeleteSalesPhase={deleteSalesPhase}
            onReorderSalesPhases={reorderSalesPhases}
            onSaveSale={handleSaveSale}
            companyId={activeCompanyId}
            createWorkOrders={createWorkOrders}
            getEnvironmentOSMap={getEnvironmentOSMap}
            onRequestDiscount={async (admin, requestedPct, maxPct) => {
              await requestAuthorization({
                sellerId: user.id,
                sellerName: user.name || user.email || '',
                requestedDiscountPct: requestedPct,
                maxDiscountPct: maxPct,
                adminId: admin.id,
                adminName: admin.name,
              });
            }}
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
          'Mão de obra (Instalação)': 'Colocação',
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
      case 'Contas a Receber':
        return (
          <AccountsView
            mode="receber"
            accounts={receivables}
            paymentMethods={paymentMethods}
            clients={clients}
            onSave={handleSaveReceivable}
            onDelete={deleteReceivable}
            onPayInstallment={payReceivableInstallment}
            onUnpayInstallment={unpayReceivableInstallment}
          />
        );
      case 'Contas a Pagar':
        return (
          <AccountsView
            mode="pagar"
            accounts={payables}
            paymentMethods={paymentMethods}
            suppliers={suppliers}
            onSave={handleSavePayable}
            onDelete={deletePayable}
            onPayInstallment={payPayableInstallment}
            onUnpayInstallment={unpayPayableInstallment}
          />
        );
      case 'Formas de Pagamento':
        return (
          <PaymentMethodsView
            paymentMethods={paymentMethods}
            paymentTypes={paymentTypes}
            onSave={handleSavePaymentMethod}
            onDelete={deletePaymentMethod}
            onToggle={toggleActive}
          />
        );

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
        <Header
          user={user}
          onLogout={handleLogout}
          onSearch={setSearchQuery}
          onToggleActivity={() => setIsHistoryOpen(!isHistoryOpen)}
          authorizations={authorizations}
          onApproveDiscount={(id, msg) => resolveAuthorization(id, 'approved', msg)}
          onRejectDiscount={(id, msg) => resolveAuthorization(id, 'rejected', msg)}
        />
        <RecentActivity activities={activities} isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
        <main className="flex-1 overflow-x-auto p-4 kanban-container">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
