import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { SplashScreen } from './components/SplashScreen';
import { PlaceholderView } from './components/PlaceholderView';
import { IdleWarningModal } from './components/IdleWarningModal';
import { ReconciliationModal, ReconciliationData, ReconciliationStrategy } from './components/ReconciliationModal';
import { useIdleTimer } from './hooks/useIdleTimer';
import { RecentActivity } from './components/RecentActivity';
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
import { usePaymentMethods } from './hooks/usePaymentMethods';
import { usePaymentTypes } from './hooks/usePaymentTypes';
import { usePayablePaymentMethods } from './hooks/usePayablePaymentMethods';
import { useWorkOrders } from './hooks/useWorkOrders';
import { useAuthorizations } from './hooks/useAuthorizations';
import { useDriverTracking } from './hooks/useDriverTracking';
import { useOrderService } from './hooks/useOrderService';
import { useExchangeRates } from './hooks/useExchangeRates';
import { getModuleAccess, VIEW_MODULE_MAP, VIEW_SUBMODULE_MAP } from './lib/permissions';
import { useMeasurements } from './hooks/useMeasurements';
import { useLegacyMigration } from './hooks/useLegacyMigration';
import { useBankAccounts } from './hooks/useBankAccounts';
import { useCRMActivities } from './hooks/useCRMActivities';
import { ActivityAlertProvider } from './contexts/ActivityAlertContext';

// Retry automático quando chunk falha por deploy (hash antigo não existe mais)
const lazyRetry = <T,>(fn: () => Promise<T>): Promise<T> =>
  fn().catch(() => {
    window.location.reload();
    return new Promise(() => {});
  });

// Lazy-loaded views — só carregam quando o usuário abre a tela
const TeamView          = lazy(() => lazyRetry(() => import('./components/TeamView').then(m => ({ default: m.TeamView }))));
const ReportsView       = lazy(() => lazyRetry(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView }))));
const SettingsView      = lazy(() => lazyRetry(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView }))));
const DeliverySchedule  = lazy(() => lazyRetry(() => import('./components/DeliverySchedule').then(m => ({ default: m.DeliverySchedule }))));
const ClientsView       = lazy(() => lazyRetry(() => import('./components/ClientsView').then(m => ({ default: m.ClientsView }))));
const SalesView         = lazy(() => lazyRetry(() => import('./components/SalesView').then(m => ({ default: m.SalesView }))));
const InventoryView     = lazy(() => lazyRetry(() => import('./components/InventoryView').then(m => ({ default: m.InventoryView }))));
const FinanceView       = lazy(() => lazyRetry(() => import('./components/FinanceView').then(m => ({ default: m.FinanceView }))));
const AccountsView      = lazy(() => lazyRetry(() => import('./components/AccountsView').then(m => ({ default: m.AccountsView }))));
const PaymentMethodsView = lazy(() => lazyRetry(() => import('./components/PaymentMethodsView').then(m => ({ default: m.PaymentMethodsView }))));
const PaymentTypesView  = lazy(() => lazyRetry(() => import('./components/PaymentTypesView').then(m => ({ default: m.PaymentTypesView }))));
const SuppliersView     = lazy(() => lazyRetry(() => import('./components/SuppliersView').then(m => ({ default: m.SuppliersView }))));
const ArchitectsView    = lazy(() => lazyRetry(() => import('./components/ArchitectsView').then(m => ({ default: m.ArchitectsView }))));
const SalesChannelsView = lazy(() => lazyRetry(() => import('./components/SalesChannelsView').then(m => ({ default: m.SalesChannelsView }))));
const ProductsView      = lazy(() => lazyRetry(() => import('./components/ProductsView').then(m => ({ default: m.ProductsView }))));
const BrandsView        = lazy(() => lazyRetry(() => import('./components/BrandsView').then(m => ({ default: m.BrandsView }))));
const ProductGroupsView = lazy(() => lazyRetry(() => import('./components/ProductGroupsView').then(m => ({ default: m.ProductGroupsView }))));
const ServiceGroupsView = lazy(() => lazyRetry(() => import('./components/ServiceGroupsView').then(m => ({ default: m.ServiceGroupsView }))));
const PayablesView      = lazy(() => lazyRetry(() => import('./components/PayablesView').then(m => ({ default: m.PayablesView }))));
const BankAccountsView  = lazy(() => lazyRetry(() => import('./components/BankAccountsView').then(m => ({ default: m.BankAccountsView }))));
const PayablePaymentMethodsView = lazy(() => lazyRetry(() => import('./components/PayablePaymentMethodsView').then(m => ({ default: m.PayablePaymentMethodsView }))));
const ProducaoView      = lazy(() => lazyRetry(() => import('./components/ProducaoView').then(m => ({ default: m.ProducaoView }))));
const MeasurementSchedule = lazy(() => lazyRetry(() => import('./components/MeasurementSchedule').then(m => ({ default: m.MeasurementSchedule }))));


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
  const { crmActivities, createCRMActivity, completeCRMActivity, deleteCRMActivity } = useCRMActivities(activeCompanyId);
  const { sales, handleSaveSale: saveSaleBase, setSales, refreshSales } = useSales(activeCompanyId, logActivity);
  const { clients, loadingClients, handleSaveClient, handleImportClients, deleteClient, setClients } = useClients(activeCompanyId, logActivity);
  const { materials, handleSaveMaterial, deleteMaterial, setMaterials } = useMaterials(activeCompanyId, logActivity);
  const { deliveries, addDelivery, updateDeliveryStatus, updateDelivery, deleteDelivery, setDeliveries } = useDeliveries(activeCompanyId, logActivity);
  const { transactions, handleSaveTransaction, deleteTransaction, setTransactions } = useFinance(activeCompanyId, logActivity);
  const { suppliers, handleSaveSupplier, deleteSupplier, setSuppliers } = useSuppliers(activeCompanyId, logActivity);
  const { architects, handleSaveArchitect, deleteArchitect, setArchitects } = useArchitects(activeCompanyId, logActivity);
  const { products, handleSaveProduct, deleteProduct } = useProducts(activeCompanyId, logActivity);
  const { receivables, handleSaveReceivable, deleteReceivable, payInstallment: payReceivableInstallmentBase, unpayInstallment: unpayReceivableInstallment } = useAccountsReceivable(activeCompanyId, logActivity);
  const { payables, handleSavePayable, deletePayable, settleBill, cancelBill } = useAccountsPayable(activeCompanyId, logActivity);
  const { categories: billCategories, saveCategory: saveBillCategory, deleteCategory: deleteBillCategory } = useBillCategories(activeCompanyId);
  const { paymentMethods, handleSavePaymentMethod, deletePaymentMethod, toggleActive } = usePaymentMethods(activeCompanyId);
  const { bankAccounts, saveBankAccount, deleteBankAccount, toggleBankAccount } = useBankAccounts(activeCompanyId);
  const { paymentTypes, handleSavePaymentType, deletePaymentType: handleDeletePaymentType } = usePaymentTypes(activeCompanyId);
  const { payablePMs, handleSave: handleSavePayablePM, handleDelete: deletePayablePM, toggleActive: togglePayablePM } = usePayablePaymentMethods(activeCompanyId);
  const { workOrders, loadingWO, createWorkOrders, updateWorkOrderStatus, updateWorkOrderPhase, updateWorkOrder, updateDeliveryDate, cancelWorkOrder, addDrawing, deleteDrawing, getEnvironmentOSMap, refreshWorkOrders } = useWorkOrders(activeCompanyId);
  const { authorizations, requestAuthorization, resolveAuthorization } = useAuthorizations(activeCompanyId);
  const { measurements, createMeasurement, updateMeasurement, deleteMeasurement, restoreMeasurement } = useMeasurements(activeCompanyId);
  const { driverLocations, reportLocation, setOffline } = useDriverTracking(activeCompanyId, user);
  const { orders, setOrders, handleSaveOrder } = useOrderService(activeCompanyId, logActivity);

  // 5. Configurações Globais (Depende de setOrders e setSales para renomeação de fases)
  const {
    appUsers, handleSaveUser, handleDeleteUser,
    staff, handleSaveStaff, handleDeleteStaff,
    phases, addPhase, renamePhase, deletePhase, reorderPhases, togglePhaseRequirement, updatePhase,
    salesPhases, addSalesPhase, renameSalesPhase, deleteSalesPhase, updateSalesPhase, reorderSalesPhases,
    brands, handleSaveBrand, handleDeleteBrand,
    productGroups, handleSaveProductGroup, handleDeleteProductGroup,
    serviceGroups, handleSaveServiceGroup, handleDeleteServiceGroup,
    salesChannels, handleSaveSalesChannel, handleDeleteSalesChannel,
    companyInfo, setCompanyInfo, isSavingCompany,
    permissionProfiles, handleSaveProfile, handleDeleteProfile,
    deadlineWarningDays, setDeadlineWarningDays,
    deadlineUrgentDays, setDeadlineUrgentDays,
    idleTimeoutMinutes, setIdleTimeoutMinutes,
    onSyncCloud,
    loadingSettings,
  } = useSettings(setOrders, setSales, activeCompanyId);

  // Estado do modal de reconciliação financeira
  const [pendingReconciliation, setPendingReconciliation] = useState<{
    data: ReconciliationData;
    sale: SalesOrder;
    resolve: (strategy: ReconciliationStrategy, extraDueDate?: string) => void;
    reject: () => void;
  } | null>(null);

  // Idle session timer
  const { isWarning: idleWarning, secondsLeft: idleSecondsLeft, reset: resetIdleTimer } = useIdleTimer({
    timeoutMinutes: idleTimeoutMinutes,
    onLogout: handleLogout,
    enabled: !!user,
  });

  // Wrapper que injeta o nome do usuário logado no histórico de baixa de parcelas
  const payReceivableInstallment = (arId: string, instId: string, pv: number, pd: string, baId?: string, baName?: string) => {
    const userName = appUsers.find(u => u.email === user?.email)?.name || user?.name || user?.email || 'Usuário';
    return payReceivableInstallmentBase(arId, instId, pv, pd, baId, baName, userName);
  };

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

  // Utilitário: aplica reconciliação nas parcelas conforme estratégia escolhida
  const applyReconciliation = (
    installments: import('./types').AccountInstallment[],
    diff: number,
    strategy: ReconciliationStrategy,
    newPendingAmount: number,
    extraDueDate?: string,
    userName?: string,
  ): import('./types').AccountInstallment[] => {
    const today = new Date().toISOString().split('T')[0];
    const byUser = userName || 'Sistema';
    const pending = installments.filter(i => i.status === 'pendente' || i.status === 'atrasado');
    const paid = installments.filter(i => i.status === 'pago' || i.status === 'parcial');

    const mkRecon = (prev: number, next: number): import('./types').ReconciliationEntry => ({
      date: today, by: byUser, reason: 'Edição de pedido',
      previousValue: prev, newValue: next, strategy,
    });

    if (strategy === 'proportional' && pending.length > 0) {
      const n = pending.length;
      const base = Math.floor((newPendingAmount / n) * 100) / 100;
      const remainder = Math.round((newPendingAmount - base * n) * 100) / 100;
      const updatedPending = pending.map((inst, i) => {
        const newVal = Math.round((i === 0 ? base + remainder : base) * 100) / 100;
        return { ...inst, value: newVal, reconciliations: [...(inst.reconciliations || []), mkRecon(inst.value, newVal)] };
      });
      return [...paid, ...updatedPending].sort((a, b) => a.number - b.number);
    }

    if (strategy === 'last_installment') {
      if (pending.length === 0) {
        // Sem pendentes: cria nova parcela de ajuste
        return [...installments, {
          id: crypto.randomUUID(),
          number: installments.length + 1,
          dueDate: today,
          value: Math.round(diff * 100) / 100,
          status: 'pendente' as const,
          notes: 'Ajuste de aditivo — sem parcelas pendentes',
          reconciliations: [mkRecon(0, diff)],
        }];
      }
      return installments.map((inst) => {
        const isLast = inst === pending[pending.length - 1];
        if (!isLast) return inst;
        const newVal = Math.round((inst.value + diff) * 100) / 100;
        return { ...inst, value: newVal, reconciliations: [...(inst.reconciliations || []), mkRecon(inst.value, newVal)] };
      }).filter(i => i.value > 0 || i.status === 'pago' || i.status === 'parcial');
    }

    if (strategy === 'new_installment' && diff > 0) {
      return [...installments, {
        id: crypto.randomUUID(),
        number: installments.length + 1,
        dueDate: extraDueDate || today,
        value: Math.round(diff * 100) / 100,
        status: 'pendente' as const,
        notes: 'Parcela de aditivo — edição de pedido',
        reconciliations: [mkRecon(0, diff)],
      }];
    }

    return installments;
  };

  const handleSaveSale = async (s: SalesOrder) => {
    const round = (n: number) => Math.round(n * 100) / 100;
    const isEditingPedido = !!(s.id && sales.find(x => x.id === s.id)?.status === 'Pedido');
    const oldSale = isEditingPedido ? sales.find(x => x.id === s.id) : null;
    const userName = appUsers.find(u => u.email === user?.email)?.name || user?.email || 'Sistema';

    // ── Calcula impacto financeiro antes de salvar ────────────────────────────
    let reconciliationNeeded = false;
    let reconciliationData: ReconciliationData | null = null;

    if (isEditingPedido && s.status === 'Pedido') {
      const saleId = s.id!;
      const saleAR = receivables.find(r => r.saleId === saleId && r.category === 'Venda' && r.status !== 'cancelado');

      if (saleAR) {
        const oldTotal = oldSale?.totals?.geral || 0;
        const newTotal = s.totals?.geral || 0;
        const oldDP = oldSale?.downPaymentValue || 0;
        const newDP = s.downPaymentValue || 0;

        // Parcelas pagas vs pendentes
        const paidInsts = saleAR.installments.filter(i => i.status === 'pago' || i.status === 'parcial');
        const pendingInsts = saleAR.installments.filter(i => i.status === 'pendente' || i.status === 'atrasado');
        const paidAmount = round(paidInsts.reduce((acc, i) => acc + (i.paidValue ?? i.value), 0));
        const pendingAmount = round(pendingInsts.reduce((acc, i) => acc + i.value, 0));

        // Entrada já paga?
        const dpAR = receivables.find(r => r.saleId === saleId && r.category === 'Entrada' && r.status !== 'cancelado');
        const dpPaid = dpAR ? (dpAR.status === 'quitado' || dpAR.status === 'parcial') : false;

        // Saldo pendente novo = newTotal - entrada (paga ou não) - já recebido nas parcelas
        const effectiveDP = dpPaid ? (dpAR?.totalValue || newDP) : newDP;
        const newPendingAmount = round(newTotal - effectiveDP - paidAmount);
        const diff = round(newPendingAmount - pendingAmount);

        const pmChanged = !!(s.paymentMethodId && s.paymentMethodId !== saleAR.paymentMethodId);
        const installmentsCountChanged = (s.paymentInstallments || 1) !== (oldSale?.paymentInstallments || 1);
        const dueDateChanged = !!(s.firstDueDate && s.firstDueDate !== oldSale?.firstDueDate);
        const dpChanged = round(newDP) !== round(oldDP);

        const needsRecon = Math.abs(diff) > 0.01 || pmChanged || installmentsCountChanged || dueDateChanged;

        if (needsRecon) {
          reconciliationNeeded = true;
          reconciliationData = {
            oldTotal, newTotal, oldDP, newDP,
            paidAmount, pendingAmount, newPendingAmount, diff,
            dpPaid, dpChanged, pmChanged, installmentsCountChanged, dueDateChanged,
            oldPM: paymentMethods.find(p => p.id === saleAR.paymentMethodId),
            newPM: paymentMethods.find(p => p.id === s.paymentMethodId),
            oldInstallmentsCount: oldSale?.paymentInstallments || 1,
            newInstallmentsCount: s.paymentInstallments || 1,
            oldFirstDueDate: oldSale?.firstDueDate,
            newFirstDueDate: s.firstDueDate,
            existingAR: saleAR,
            pendingInstallments: pendingInsts,
            paidInstallments: paidInsts,
          };
        }
      }
    }

    // ── Pede confirmação via modal se houver impacto financeiro ──────────────
    let chosenStrategy: ReconciliationStrategy = 'proportional';
    let chosenExtraDueDate: string | undefined;

    if (reconciliationNeeded && reconciliationData) {
      const userChoice = await new Promise<{ strategy: ReconciliationStrategy; extraDueDate?: string } | null>(resolve => {
        setPendingReconciliation({
          data: reconciliationData!,
          sale: s,
          resolve: (strategy, extraDueDate) => {
            setPendingReconciliation(null);
            resolve({ strategy, extraDueDate });
          },
          reject: () => {
            setPendingReconciliation(null);
            resolve(null);
          },
        });
      });
      if (!userChoice) return; // usuário cancelou — não salva nada
      chosenStrategy = userChoice.strategy;
      chosenExtraDueDate = userChoice.extraDueDate;
    }

    // ── Salva a venda no banco ────────────────────────────────────────────────
    try {
      const savedSale = await saveSaleBase(s);
      const saleId = (savedSale as any)?.id || s.id;

      // 1. Executa reconciliação financeira com a estratégia escolhida
      if (isEditingPedido && s.status === 'Pedido' && reconciliationData) {
        const saleAR = reconciliationData.existingAR;
        let newInstallments = [...saleAR.installments];
        let needsSave = false;
        let reconNote = '';

        // ── Reconciliação de Valor ────────────────────────────────────────
        if (Math.abs(reconciliationData.diff) > 0.01) {
          newInstallments = applyReconciliation(
            newInstallments,
            reconciliationData.diff,
            chosenStrategy,
            reconciliationData.newPendingAmount,
            chosenExtraDueDate,
            userName,
          );
          const sign = reconciliationData.diff > 0 ? '+' : '';
          reconNote = `\n[RECONCILIAÇÃO ${new Date().toLocaleDateString('pt-BR')} por ${userName}] `
            + `Ajuste de valor: ${sign}${reconciliationData.diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} `
            + `| Estratégia: ${chosenStrategy}`;
          needsSave = true;
        }

        // ── Atualização de Vencimentos (só parcelas pendentes) ────────────
        if (reconciliationData.dueDateChanged && s.firstDueDate) {
          const firstDate = new Date(s.firstDueDate + 'T12:00:00');
          let pendingIdx = 0;
          newInstallments = newInstallments.map(inst => {
            if (inst.status !== 'pendente' && inst.status !== 'atrasado') return inst;
            const newDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + pendingIdx, firstDate.getDate()).toISOString().split('T')[0];
            pendingIdx++;
            return { ...inst, dueDate: newDate };
          });
          needsSave = true;
        }

        // ── Atualização de Forma de Pagamento ────────────────────────────
        const pmChanged = reconciliationData.pmChanged;
        const newPM = reconciliationData.newPM;

        if (needsSave || pmChanged) {
          const updatedTotal = round(newInstallments.reduce((acc, i) => acc + i.value, 0));
          const paidValue = round(newInstallments
            .filter(i => i.status === 'pago' || i.status === 'parcial')
            .reduce((acc, i) => acc + (i.paidValue ?? i.value), 0));
          const remaining = round(updatedTotal - paidValue);
          await handleSaveReceivable({
            ...saleAR,
            installments: newInstallments,
            totalValue: updatedTotal,
            paidValue,
            paymentMethodId: pmChanged ? s.paymentMethodId : saleAR.paymentMethodId,
            paymentMethodName: pmChanged ? (newPM?.name || s.paymentMethodName || saleAR.paymentMethodName) : saleAR.paymentMethodName,
            status: remaining <= 0.01 ? 'quitado' : paidValue > 0 ? 'parcial' : 'pendente',
            notes: (saleAR.notes || '') + reconNote,
          });
        }
      }

      // 2. Criação de AR (primeira vez) — hasDownAR / hasRegularAR previnem duplicação
      if (s.status === 'Pedido') {
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
            const grossTotal = s.totals?.geral ?? (s as any).totalValue ?? 0;
            const total = grossTotal - (s.downPaymentValue || 0);
            const n = s.paymentInstallments || 1;
            const firstDate = new Date(s.firstDueDate + 'T12:00:00');
            const fee = pm?.installmentFee ?? 0;
            const netTotal = fee > 0 && n > 1
              ? round(total * (1 - (fee * (n - 1)) / 100))
              : total;
            const baseValue = Math.floor((netTotal / n) * 100) / 100;
            const diffVal = round(netTotal - baseValue * n);
            const installments = Array.from({ length: n }, (_, i) => ({
              id: crypto.randomUUID(),
              number: i + 1,
              dueDate: new Date(firstDate.getFullYear(), firstDate.getMonth() + i, firstDate.getDate()).toISOString().split('T')[0],
              value: i === 0 ? baseValue + diffVal : baseValue,
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

      // 3. Geração de O.S.
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
  
  if (loadingSettings) {
    return (
      <SplashScreen 
        logoUrl={companyInfo.logoUrl} 
        companyName={companyInfo.name} 
        primaryColor={companyInfo.buttonColor} 
      />
    );
  }

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
          <ProducaoView
            workOrders={workOrders}
            loading={loadingWO}
            phases={phases}
            appUsers={appUsers}
            sales={sales}
            currentUserName={user?.name || user?.email || 'Usuário'}
            canCancelOS={getAccess('producao') === 'full'}
            canEditDeadline={getAccess('producao') === 'full'}
            canMoveCards={getAccess('producao') === 'full'}
            deadlineWarningDays={deadlineWarningDays}
            deadlineUrgentDays={deadlineUrgentDays}
            onUpdatePhase={(id, toPhase, fromPhase, userName) => {
              updateWorkOrderPhase(id, toPhase, fromPhase, userName);
              // Auto-arquivar ao chegar na última fase
              if (phases.length > 0 && toPhase === phases[phases.length - 1].name) {
                updateWorkOrderStatus(id, 'Entregue');
              }
            }}
            onUpdate={updateWorkOrder}
            onUpdateDeliveryDate={updateDeliveryDate}
            onCancelWorkOrder={cancelWorkOrder}
            onAddDrawing={addDrawing}
            onDeleteDrawing={deleteDrawing}
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
        return <ReportsView orders={orders} deliveries={deliveries} receivables={receivables} />;
      case 'Configurações':
        return (
          <SettingsView
            phases={phases}
            onToggleRequirement={togglePhaseRequirement}
            onAddPhase={addPhase}
            onRenamePhase={renamePhase}
            onUpdatePhase={updatePhase}
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
            isSavingCompany={isSavingCompany}
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
                requestedValuePct: requestedPct,
                maxValuePct: maxPct,
                adminId: admin.id,
                adminName: admin.name,
                type: 'discount'
              });
            }}
            onRequestCommission={async (admin, requestedPct, maxPct) => {
              await requestAuthorization({
                sellerId: user.id,
                sellerName: user.name || user.email || '',
                requestedValuePct: requestedPct,
                maxValuePct: maxPct,
                adminId: admin.id,
                adminName: admin.name,
                type: 'commission'
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
            bankAccounts={bankAccounts}
            clients={clients}
            onSave={handleSaveReceivable}
            onDelete={deleteReceivable}
            onPayInstallment={payReceivableInstallment}
            onUnpayInstallment={unpayReceivableInstallment}
            canEdit={getAccess('financeiro') === 'full'}
          />
        );
      case 'Contas Bancárias':
        return (
          <BankAccountsView
            bankAccounts={bankAccounts}
            onSave={saveBankAccount}
            onDelete={deleteBankAccount}
            onToggle={toggleBankAccount}
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
      case 'Formas de PGTO AR':
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
      case 'Formas de PGTO CP':
        return (
          <PayablePaymentMethodsView
            payablePMs={payablePMs}
            paymentMethods={paymentMethods}
            onSave={handleSavePayablePM}
            onDelete={deletePayablePM}
            onToggle={togglePayablePM}
          />
        );

      case 'Agenda de Entregas':
        return (
          <DeliverySchedule 
            orders={workOrders} 
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
            phases={phases}
            clients={clients}
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
    <ActivityAlertProvider
      crmActivities={crmActivities}
      createCRMActivity={createCRMActivity}
      completeCRMActivity={completeCRMActivity}
      deleteCRMActivity={deleteCRMActivity}
    >
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {idleWarning && (
        <IdleWarningModal
          secondsLeft={idleSecondsLeft}
          onContinue={resetIdleTimer}
          onLogout={handleLogout}
        />
      )}
      {pendingReconciliation && (
        <ReconciliationModal
          data={pendingReconciliation.data}
          onConfirm={(strategy, extraDueDate) => pendingReconciliation.resolve(strategy, extraDueDate)}
          onCancel={pendingReconciliation.reject}
          currentUser={appUsers.find(u => u.email === user?.email)?.name || user?.email || 'Sistema'}
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
          user={appUsers.find(u => u.email === user?.email) || user!}
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
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin" /></div>}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </ActivityAlertProvider>
  );
};

export default App;
