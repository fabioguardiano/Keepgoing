import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { PlaceholderView } from './components/PlaceholderView';
import { TeamView } from './components/TeamView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { IdleWarningModal } from './components/IdleWarningModal';
import { useIdleTimer } from './hooks/useIdleTimer';
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
import { BrandsView } from './components/BrandsView';
import { ProductGroupsView } from './components/ProductGroupsView';
import { ServiceGroupsView } from './components/ServiceGroupsView';
import { View, ProductionPhase, SalesOrder, OrderService } from './types';
import { useAuth } from './hooks/useAuth';
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
import { useBillCategories } from './hooks/useBillCategories';
import { PayablesView } from './components/PayablesView';
import { usePaymentMethods } from './hooks/usePaymentMethods';
import { usePaymentTypes } from './hooks/usePaymentTypes';
import { usePayablePaymentMethods } from './hooks/usePayablePaymentMethods';
import { useWorkOrders } from './hooks/useWorkOrders';
import { useDiscountAuthorizations } from './hooks/useDiscountAuthorizations';
import { useDriverTracking } from './hooks/useDriverTracking';
import { useOrderService } from './hooks/useOrderService';
import { useExchangeRates } from './hooks/useExchangeRates';
import { getModuleAccess, VIEW_MODULE_MAP, VIEW_SUBMODULE_MAP } from './lib/permissions';
import { WorkOrdersView } from './components/WorkOrdersView';
import { WorkOrderKanban } from './components/WorkOrderKanban';
import { useMeasurements } from './hooks/useMeasurements';
import { MeasurementSchedule } from './components/MeasurementSchedule';
import { useLegacyMigration } from './hooks/useLegacyMigration';
import 'leaflet/dist/leaflet.css';


const App: React.FC = () => {
  // 1. Autenticação
  const { user, authReady, handleLogin: authLogin, handleLogout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>('Produção');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 2. Logs de Atividade
  const { activities, logActivity, loadingActivities, refreshActivities } = useActivities(user);

  // 3. Cotações
  const exchangeRates = useExchangeRates();

  // 4. Hooks de Domínio
  // Só passamos o companyId quando authReady=true para evitar busca prematura com UUID errado
  const activeCompanyId = authReady ? user?.company_id : undefined;

  // Migração única: move dados do localStorage (legado) para o Supabase se o banco estiver vazio
  useLegacyMigration(activeCompanyId);
  const { sales, handleSaveSale: saveSaleBase, setSales, refreshSales } = useSales(activeCompanyId, logActivity);
  const { clients, loadingClients, handleSaveClient, handleImportClients, deleteClient, setClients } = useClients(activeCompanyId, logActivity);
  const { materials, handleSaveMaterial, deleteMaterial, setMaterials } = useMaterials(activeCompanyId, logActivity);
  const { deliveries, addDelivery, updateDeliveryStatus, updateDelivery, deleteDelivery, setDeliveries } = useDeliveries(activeCompanyId, logActivity);
  const { transactions, handleSaveTransaction, deleteTransaction, setTransactions } = useFinance(activeCompanyId, logActivity);
  const { suppliers, handleSaveSupplier, deleteSupplier, setSuppliers } = useSuppliers(activeCompanyId, logActivity);
  const { architects, handleSaveArchitect, deleteArchitect, setArchitects } = useArchitects(activeCompanyId, logActivity);
  const { products, handleSaveProduct, deleteProduct } = useProducts(activeCompanyId, logActivity);
  const { receivables, handleSaveReceivable, deleteReceivable, payInstallment: payReceivableInstallment, unpayInstallment: unpayReceivableInstallment } = useAccountsReceivable(activeCompanyId, logActivity);
  const { payables, handleSavePayable, deletePayable, settleBill, cancelBill } = useAccountsPayable(activeCompanyId, logActivity);
  const { categories: billCategories, saveCategory: saveBillCategory, deleteCategory: deleteBillCategory } = useBillCategories(activeCompanyId);
  const { paymentMethods, handleSavePaymentMethod, deletePaymentMethod, toggleActive } = usePaymentMethods(activeCompanyId);
  const { paymentTypes, handleSavePaymentType, deletePaymentType: handleDeletePaymentType } = usePaymentTypes(activeCompanyId);
  const { payablePMs, handleSave: handleSavePayablePM, handleDelete: deletePayablePM, toggleActive: togglePayablePM } = usePayablePaymentMethods(activeCompanyId);
  const { workOrders, loadingWO, createWorkOrders, updateWorkOrderStatus, updateWorkOrderPhase, updateWorkOrder, updateDeliveryDate, cancelWorkOrder, addDrawing, deleteDrawing, getEnvironmentOSMap, refreshWorkOrders } = useWorkOrders(activeCompanyId);
  const { authorizations, requestAuthorization, resolveAuthorization } = useDiscountAuthorizations(activeCompanyId);
  const { measurements, createMeasurement, updateMeasurement, deleteMeasurement, restoreMeasurement } = useMeasurements(activeCompanyId);
  const { driverLocations, reportLocation, setOffline } = useDriverTracking(activeCompanyId, user);
  const { orders, setOrders, handleSaveOrder } = useOrderService(activeCompanyId, logActivity);

  // 5. Configurações Globais (Depende de setOrders e setSales para renomeação de fases)
  const {
    appUsers, handleSaveUser, handleDeleteUser,
    staff, handleSaveStaff, handleDeleteStaff,
    phases, addPhase, renamePhase, deletePhase, reorderPhases, togglePhaseRequirement,
    salesPhases, addSalesPhase, renameSalesPhase, deleteSalesPhase, updateSalesPhase, reorderSalesPhases,
    brands, handleSaveBrand, handleDeleteBrand,
    productGroups, handleSaveProductGroup, handleDeleteProductGroup,
    serviceGroups, handleSaveServiceGroup, handleDeleteServiceGroup,
    salesChannels, handleSaveSalesChannel, handleDeleteSalesChannel,
    companyInfo, setCompanyInfo,
    permissionProfiles, handleSaveProfile, handleDeleteProfile,
    deadlineWarningDays, setDeadlineWarningDays,
    deadlineUrgentDays, setDeadlineUrgentDays,
    idleTimeoutMinutes, setIdleTimeoutMinutes,
    onSyncCloud,
  } = useSettings(setOrders, setSales, activeCompanyId);

  // Idle session timer
  const { isWarning: idleWarning, secondsLeft: idleSecondsLeft, reset: resetIdleTimer } = useIdleTimer({
    timeoutMinutes: idleTimeoutMinutes,
    onLogout: handleLogout,
    enabled: !!user,
  });

  // Função de acesso por módulo (e opcionalmente sub-módulo) para o usuário logado
  const getAccess = (module: import('./types').ModuleKey, subModule?: import('./types').SubModuleKey) =>
    getModuleAccess(user!, appUsers, permissionProfiles, module, subModule);

  // Escopo de visibilidade em Vendas para o usuário logado
  const getVendasScope = (): import('./types').VendasScope => {
    const appUser = appUsers.find(u => u.email === user?.email);
    if (!appUser?.profileId) return 'all';
    const profile = permissionProfiles.find(p => p.id === appUser.profileId);
    return profile?.vendasScope ?? 'all';
  };

  // 6. Handlers de Negócio Orquestrados
  const handleSaveSale = async (s: SalesOrder) => {
    // ── Prepara reconciliação se for alteração de pedido existente ─────────────
    let diffToReconcile = 0;
    const isEditingPedido = s.id && sales.find(x => x.id === s.id)?.status === 'Pedido';
    
    // ── Logica de Reconciliação Financeira ────────────────────────────────────
    if (isEditingPedido && s.status === 'Pedido') {
      const oldSale = sales.find(x => x.id === s.id);
      const oldTotal = oldSale?.totals?.geral || 0;
      const newTotal = s.totals?.geral || 0;
      const oldDP = oldSale?.downPaymentValue || 0;
      const newDP = s.downPaymentValue || 0;
      
      // Calculamos a diferença líquida que deve ser refletida nas parcelas
      // (Novo Total - Nova Entrada) - (Total Antigo - Entrada Antiga)
      diffToReconcile = Math.round(((newTotal - newDP) - (oldTotal - oldDP)) * 100) / 100;
    }

    try {
      const savedSale = await saveSaleBase(s);
      const saleId = (savedSale as any)?.id || s.id;

      // 1. Executa Reconciliação se necessário
      if (isEditingPedido && Math.abs(diffToReconcile) > 0.01) {
        const saleAR = receivables.find(r => r.saleId === saleId && r.category === 'Venda' && r.status !== 'cancelado');
        if (saleAR) {
          const newInstallments = [...saleAR.installments];
          
          if (diffToReconcile > 0) {
            // Aumento: adiciona na última parcela pendente ou cria uma nova
            const lastPending = [...newInstallments].reverse().find(i => i.status === 'pendente');
            if (lastPending) {
              lastPending.value = Math.round((lastPending.value + diffToReconcile) * 100) / 100;
            } else {
              newInstallments.push({
                id: crypto.randomUUID(),
                number: newInstallments.length + 1,
                dueDate: new Date().toISOString().split('T')[0],
                value: diffToReconcile,
                status: 'pendente',
                notes: 'Ajuste de Aditivo de Pedido'
              } as any);
            }
          } else {
            // Redução: abate das parcelas pendentes (da última para a primeira)
            let remainingToSub = Math.abs(diffToReconcile);
            const pendingIndices = newInstallments
              .map((inst, idx) => ({ inst, idx }))
              .filter(x => x.inst.status === 'pendente')
              .sort((a, b) => b.inst.number - a.inst.number);

            for (const { idx } of pendingIndices) {
              if (remainingToSub <= 0) break;
              const sub = Math.min(newInstallments[idx].value, remainingToSub);
              newInstallments[idx].value = Math.round((newInstallments[idx].value - sub) * 100) / 100;
              remainingToSub = Math.round((remainingToSub - sub) * 100) / 100;
            }
          }

          // Filtra parcelas com valor zero e atualiza totais
          const finalInsts = newInstallments.filter(i => i.value > 0 || i.status === 'pago');
          const updatedTotal = finalInsts.reduce((acc, i) => acc + i.value, 0);
          const paidValue = finalInsts.filter(i => i.status === 'pago').reduce((acc, i) => acc + (i.paidValue || i.value), 0);

          await handleSaveReceivable({
            ...saleAR,
            installments: finalInsts,
            totalValue: updatedTotal,
            paidValue: paidValue,
            status: (updatedTotal - paidValue) <= 0 ? 'quitado' : (paidValue > 0 ? 'parcial' : 'pendente'),
            notes: (saleAR.notes || '') + `\n[RECONCILIAÇÃO ${new Date().toLocaleDateString('pt-BR')}] Ajuste de valor: ${diffToReconcile > 0 ? '+' : ''}${diffToReconcile.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
          });
        }
      }

      // 2. Criação Inicial de AR (fluxo normal quando vira pedido pela primeira vez)
      if (s.status === 'Pedido' && !isEditingPedido) {
        const existingARs = receivables.filter(r => r.saleId === saleId && r.status !== 'cancelado');

        // ── AR de Entrada ──
        if (s.downPaymentValue && s.downPaymentValue > 0 && s.downPaymentDueDate) {
          const hasDownAR = existingARs.some(r => r.category === 'Entrada');
          if (!hasDownAR) {
            const dpPm = paymentMethods.find(p => p.id === s.downPaymentMethodId);
            await handleSaveReceivable({
              id: undefined as any,
              description: `Entrada — Venda ${s.orderNumber} — ${s.clientName}`,
              clientId: s.clientId,
              clientName: s.clientName || '',
              saleId,
              orderNumber: s.orderNumber || '',
              totalValue: s.downPaymentValue,
              paidValue: 0,
              installments: [{
                id: crypto.randomUUID(),
                number: 1,
                dueDate: s.downPaymentDueDate,
                value: s.downPaymentValue,
                status: 'pendente' as const,
              }],
              paymentMethodId: s.downPaymentMethodId,
              paymentMethodName: dpPm?.name || s.downPaymentMethodName || '',
              category: 'Entrada',
              dueDate: s.downPaymentDueDate,
              notes: '',
              status: 'pendente',
              companyId: activeCompanyId || '',
              createdAt: new Date().toISOString(),
            } as any);
          }
        }

        // ── AR de Parcelas Regulares ──
        if (s.paymentMethodId && s.firstDueDate) {
          const hasRegularAR = existingARs.some(r => r.category === 'Venda');
          if (!hasRegularAR) {
            const pm = paymentMethods.find(p => p.id === s.paymentMethodId);
            const grossTotal = s.totals?.geral ?? s.totalValue ?? 0;
            const total = grossTotal - (s.downPaymentValue || 0);
            const n = s.paymentInstallments || 1;
            const firstDate = new Date(s.firstDueDate + 'T12:00:00');
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
    } catch (err) {
      console.error('[handleSaveSale] Erro nas operações em cascata:', err);
      alert('Venda salva, mas ocorreu um erro ao criar os registros financeiros ou de O.S. Verifique os dados e tente novamente.');
    }
  };

  // Login com redirect para motoristas
  const handleLogin = (u: import('./types').User) => {
    authLogin(u);
    if (u.role === 'driver') setCurrentView('Agenda de Entregas');
  };

  // 7. Rastreamento automático de GPS para motoristas
  useEffect(() => {
    if (!user || !activeCompanyId) return;
    
    // Verificamos se o cargo (role) é de motorista ou gerente de campo
    const isDriver = user.role === 'driver' || (user as any).position === 'motorista';
    if (!isDriver) {
      setOffline();
      return;
    }

    let watchId: number | null = null;
    
    if ("geolocation" in navigator) {
      // Inicia a observação da posição
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          reportLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.error("Erro ao vigiar posição GPS:", err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setOffline();
    };
  }, [user, activeCompanyId, reportLocation, setOffline]);

  // 8. Lógica de Renderização
  if (!user) return <Login onLogin={handleLogin} />;

  const filteredOrders = orders.filter(o =>
    (o.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.osNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    // Bloqueia acesso se o módulo (ou sub-módulo) da view atual for 'none'
    const viewModule = VIEW_MODULE_MAP[currentView];
    const viewSubModule = VIEW_SUBMODULE_MAP[currentView];
    if (viewModule && getAccess(viewModule, viewSubModule) === 'none') {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-lg font-black text-slate-600">Acesso restrito</p>
          <p className="text-sm">Você não tem permissão para acessar este módulo.</p>
        </div>
      );
    }

    switch (currentView) {
      case 'Produção':
        return (
          <WorkOrderKanban
            workOrders={workOrders}
            phases={phases}
            appUsers={appUsers}
            currentUserName={user?.name || user?.email || 'Usuário'}
            canCancelOS={getAccess('producao') === 'full'}
            canEditDeadline={getAccess('producao') === 'full'}
            deadlineWarningDays={deadlineWarningDays}
            deadlineUrgentDays={deadlineUrgentDays}
            onUpdatePhase={updateWorkOrderPhase}
            onUpdate={updateWorkOrder}
            onUpdateDeliveryDate={updateDeliveryDate}
            onCancelWorkOrder={cancelWorkOrder}
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
            driverTrackingLocations={driverLocations}
            companyAddress={companyInfo.address}
            companyName={companyInfo.name}
            companyLogoUrl={companyInfo.logoUrl}
          />
        );
      case 'Agenda de Medição':
        return (
          <MeasurementSchedule
            measurements={measurements}
            orders={workOrders}
            onAddMeasurement={createMeasurement}
            onUpdateMeasurement={updateMeasurement}
            onDeleteMeasurement={deleteMeasurement}
            onRestoreMeasurement={restoreMeasurement}
            driverTrackingLocations={driverLocations}
            companyAddress={companyInfo.address}
            companyName={companyInfo.name}
            companyLogoUrl={companyInfo.logoUrl}
            companyIconUrl={companyInfo.iconUrl}
            appUsers={appUsers}
            staff={staff}
            permissionProfiles={permissionProfiles}
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
            permissionProfiles={permissionProfiles}
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
            onUpdateSalesPhase={updateSalesPhase}
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
            permissionProfiles={permissionProfiles}
            appUsers={appUsers}
            onSaveProfile={handleSaveProfile}
            onDeleteProfile={handleDeleteProfile}
            onSaveUser={handleSaveUser}
            deadlineWarningDays={deadlineWarningDays}
            deadlineUrgentDays={deadlineUrgentDays}
            onSetDeadlineWarningDays={v => setDeadlineWarningDays(v)}
            onSetDeadlineUrgentDays={v => setDeadlineUrgentDays(v)}
            idleTimeoutMinutes={idleTimeoutMinutes}
            onSetIdleTimeoutMinutes={v => setIdleTimeoutMinutes(v)}
            payablePMs={payablePMs}
            onSavePayablePM={handleSavePayablePM}
            onDeletePayablePM={deletePayablePM}
            onTogglePayablePM={togglePayablePM}
            currentUser={user ?? undefined}
            activities={activities}
            loadingActivities={loadingActivities}
            refreshActivities={refreshActivities}
          />
        );
      case 'Clientes':
        return <ClientsView clients={clients} onSaveClient={handleSaveClient} onDeleteClient={deleteClient} canEdit={getAccess('clientes') === 'full'} />;
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
            canEdit={getAccess('vendas') === 'full'}
            vendasScope={getVendasScope()}
            currentUser={user}
            receivables={receivables}
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
            canEdit={getAccess('financeiro') === 'full'}
          />
        );
      case 'Contas a Pagar':
        return (
          <PayablesView
            accounts={payables}
            paymentMethods={payablePMs}
            suppliers={suppliers}
            categories={billCategories}
            onSave={handleSavePayable}
            onDelete={deletePayable}
            onSettle={settleBill}
            onCancel={cancelBill}
            onSaveCategory={saveBillCategory}
            onDeleteCategory={deleteBillCategory}
            canEdit={getAccess('financeiro') === 'full'}
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
      case 'Tipos de Pagamento':
        return (
          <PaymentTypesView 
            paymentTypes={paymentTypes}
            onSaveType={handleSavePaymentType}
            onDeleteType={handleDeletePaymentType}
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
            companyAddress={companyInfo.address}
            companyName={companyInfo.name}
            companyLogoUrl={companyInfo.logoUrl}
            driverTrackingLocations={driverLocations}
          />
        );
      case 'Agenda de Medição':
        return (
          <MeasurementSchedule 
            measurements={measurements}
            orders={workOrders}
            onAddMeasurement={createMeasurement}
            onUpdateMeasurement={updateMeasurement}
            onDeleteMeasurement={deleteMeasurement}
            onRestoreMeasurement={restoreMeasurement}
            driverTrackingLocations={driverLocations}
            companyAddress={companyInfo.address}
            companyName={companyInfo.name}
            companyLogoUrl={companyInfo.logoUrl}
            companyIconUrl={companyInfo.iconUrl}
            appUsers={appUsers}
            staff={staff}
            permissionProfiles={permissionProfiles}
          />
        );
      case 'Fornecedores':
        return <SuppliersView suppliers={suppliers} onSaveSupplier={handleSaveSupplier} onDeleteSupplier={deleteSupplier} />;
      case 'Arquitetos':
        return <ArchitectsView architects={architects} onSaveArchitect={handleSaveArchitect} onDeleteArchitect={deleteArchitect} />;
      case 'Canais de Vendas':
        return <SalesChannelsView channels={salesChannels} onSaveChannel={handleSaveSalesChannel} onDeleteChannel={handleDeleteSalesChannel} />;
      case 'Marcas':
        return <BrandsView brands={brands} onSaveBrand={handleSaveBrand} onDeleteBrand={handleDeleteBrand} onSyncCloud={() => onSyncCloud('brands')} />;
      case 'Grupos de Produtos':
        return <ProductGroupsView groups={productGroups} onSaveGroup={handleSaveProductGroup} onDeleteGroup={handleDeleteProductGroup} onSyncCloud={() => onSyncCloud('product_groups')} />;
      case 'Grupos de Serviços':
        return <ServiceGroupsView groups={serviceGroups} onSaveGroup={handleSaveServiceGroup} onDeleteGroup={handleDeleteServiceGroup} onSyncCloud={() => onSyncCloud('service_groups')} />;
      default:
        return <PlaceholderView title={currentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {idleWarning && (
        <IdleWarningModal
          secondsLeft={idleSecondsLeft}
          onContinue={resetIdleTimer}
          onLogout={handleLogout}
        />
      )}
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentView={currentView}
        onViewChange={setCurrentView}
        companyInfo={companyInfo}
        exchangeRates={exchangeRates}
        getAccess={getAccess}
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
        <RecentActivity activities={activities} isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} currentUserName={user?.name || user?.email} />
        <main className="flex-1 overflow-x-auto p-4 kanban-container">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default App;
