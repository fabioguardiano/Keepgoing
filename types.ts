export type Category = 'Matéria Prima' | 'Produtos de Revenda' | 'Serviços' | 'Colocação' | 'Acabamentos';

export type ProductionPhase = 
  | 'Serviço Lançado' 
  | 'Medição' 
  | 'Aprovação' 
  | 'Corte' 
  | 'Acabamento' 
  | 'Conferência' 
  | 'Serviço Finalizado' 
  | 'A Retirar' 
  | 'A Entregar' 
  | 'Instalação' 
  | 'Pós-Venda' 
  | 'Entregue';

export type SalesPhase = string;

export interface SalesPhaseConfig {
  name: string;
  color?: string;
  desirableDays?: number;
  alertDays?: number;
  code?: string;
}

export type OrderPhase = ProductionPhase;

export interface PhaseConfig {
  name: string;
  description?: string;
  isRequired?: boolean;
  requiresResponsible: boolean;
  code?: string;
}

export const INITIAL_PHASES: PhaseConfig[] = [
  { name: 'Serviço Lançado', isRequired: false, requiresResponsible: false },
  { name: 'Medição', isRequired: true, requiresResponsible: false },
  { name: 'Aprovação', isRequired: true, requiresResponsible: false },
  { name: 'Corte', isRequired: true, requiresResponsible: false },
  { name: 'Acabamento', isRequired: true, requiresResponsible: false },
  { name: 'Conferência', isRequired: true, requiresResponsible: false },
  { name: 'Serviço Finalizado', isRequired: false, requiresResponsible: false },
  { name: 'A Retirar', isRequired: false, requiresResponsible: false },
  { name: 'A Entregar', isRequired: false, requiresResponsible: false },
  { name: 'Entregue', isRequired: false, requiresResponsible: false }
];

export type StaffPosition = 'serrador' | 'acabador' | 'ajudante_serrador' | 'ajudante_acabador' | 'motorista' | 'medidor' | 'instalador' | 'vendedor' | 'gerente';

// ─── Sistema de Permissões ────────────────────────────────────────────────────

export type ModuleKey =
  | 'producao'
  | 'vendas'
  | 'agenda_entregas'
  | 'financeiro'
  | 'clientes'
  | 'estoque'
  | 'equipe'
  | 'relatorios'
  | 'configuracoes'
  | 'agenda_medicao'
  | 'cadastros';

export type AccessLevel = 'none' | 'view' | 'full';

export type VendasScope = 'all' | 'own' | 'view_all_edit_own';

export type SubModuleKey =
  // cadastros
  | 'fornecedores'
  | 'arquitetos'
  | 'canais_vendas'
  | 'marcas'
  | 'grupos_produtos'
  | 'grupos_servicos'
  // financeiro
  | 'contas_receber'
  | 'contas_pagar'
  | 'formas_pagamento'
  // estoque
  | 'materia_prima'
  | 'acabamentos'
  | 'produtos_revenda'
  // producao
  | 'os_producao';

export interface PermissionProfile {
  id: string;
  name: string;
  isDefault?: boolean; // perfis padrão não podem ser excluídos
  permissions: Record<ModuleKey, AccessLevel>;
  vendasScope?: VendasScope; // escopo de visibilidade em Vendas
  subPermissions?: Partial<Record<SubModuleKey, AccessLevel>>; // permissões granulares por sub-módulo
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  code?: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'seller' | 'viewer' | 'driver' | 'production';
  status: 'ativo' | 'inativo';
  profileId?: string; // ID do PermissionProfile atribuído
  company_id?: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface ProductionStaff {
  id: string;
  code?: number;
  name: string;
  position: StaffPosition;
  hourlyRate: number;
  phone: string;
  status: 'ativo' | 'inativo';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'move' | 'upload' | 'login' | 'logout';
  details: string;
  orderId?: string;
  orderNumber?: string;
  module?: string;
  entityType?: string;
}

export interface PhaseRecord {
  phaseName: string;
  startedAt: string;
  completedAt?: string;
  responsibles: {
    id: string;
    staffName: string;
    addedAt: string;
  }[];
}

export interface PhaseResponsible {
  id: string;
  staffName: string;
  addedAt: string;
}

export interface CRMNote {
  id: string;
  userName: string;
  timestamp: string;
  text: string;
}

export interface ProductService {
  id: string;
  type: Category;
  code: string;
  group: string;
  description: string;
  brand?: string;
  manufacturerNumber?: string;
  unit: string;
  stockBalance: number;
  minStock: number;
  unitCost: number;
  freight: number;
  lossPercentage: number;
  taxPercentage: number;
  profitMargin: number;
  commissionPercentage: number;
  discountPercentage: number;
  suggestedPrice: number;
  sellingPrice: number;
  status: 'ativo' | 'inativo';
  createdAt: string;
  imageUrl?: string;
  nfeData?: {
    ncm?: string;
    cfop?: string;
    icms?: number;
    ipi?: number;
    cest?: string;
    origem?: string;
  };
}

export interface Client {
  id: string;
  legalName: string;
  tradingName: string;
  name?: string;
  type: 'Pessoa Física' | 'Pessoa Jurídica';
  document: string;
  rgInsc?: string;
  email: string;
  phone: string;
  cellphone: string;
  birthDate?: string;
  sellerName?: string;
  useSpecialTable: boolean;
  observations?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    cityCode?: string;
    lat?: number;
    lng?: number;
  };
  deliveryAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    referencePoint?: string;
    lat?: number;
    lng?: number;
  };
  code?: number;
  createdAt: string;
  company_id?: string;
  status?: 'ativo' | 'inativo';
}


export interface SalesChannel {
  id: string;
  code?: number;
  name: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
}

export interface Supplier {
  id: string;
  type: 'Pessoa Física' | 'Pessoa Jurídica';
  document: string;
  rgInsc?: string;
  legalName: string;
  tradingName: string;
  contactName?: string;
  email: string;
  phone: string;
  cellphone?: string;
  website?: string;
  observations?: string;
  code?: number;
  createdAt: string;
  status?: 'ativo' | 'inativo';
  address: {
    street: string;
    number?: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    lat?: number;
    lng?: number;
  };
}

export interface Architect {
  id: string;
  type: 'Pessoa Física' | 'Pessoa Jurídica';
  document: string;
  rgInsc?: string;
  legalName: string;
  tradingName: string;
  contactName?: string;
  email: string;
  phone: string;
  cellphone?: string;
  createdAt: string;
  observations?: string;
  code?: number;
  status?: 'ativo' | 'inativo';
  address: {
    street: string;
    number?: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    lat?: number;
    lng?: number;
  };
}

export type Priority = 'baixa' | 'media' | 'alta';

export interface OrderService {
  id: string;
  osNumber: string;
  orderNumber: string;
  clientName: string;
  projectDescription: string;
  material: string;
  materialArea: number;
  phase: ProductionPhase;
  seller: string;
  createdAt: string;
  lastInteractionAt?: string;
  deadline: string;
  priority: Priority;
  clientId?: string;
  architectId?: string;
  architectName?: string;
  architectCommissionPct?: number;
  totalValue?: number;
  remainingValue?: number;
  observations?: string;
  internalObservations?: string;
  imageUrls: string[];
  items?: OrderItem[];
  payments?: Payment[];
  logs?: OrderLog[];
  phaseHistory?: PhaseRecord[];
  responsibleStaffName?: string;
  salesChannel?: string;
  salesPhase?: SalesPhase;
  isOsGenerated?: boolean;
  status?: 'Orçamento' | 'Pedido' | 'Confirmado' | 'Cancelado' | 'Finalizado';
  discountValue?: number;
  discountPercentage?: number;
  paymentConditions?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentInstallments?: number;
  firstDueDate?: string;
  downPaymentValue?: number;
  downPaymentMethodId?: string;
  downPaymentMethodName?: string;
  downPaymentDueDate?: string;
  deliveryDeadline?: string;
  deliveryFee?: number;
  totals?: {
    vendas: number;
    desconto: number;
    frete: number;
    comissaoArquiteto?: number;
    geral: number;
  };
  crmNotes?: CRMNote[];
  lostReason?: string;
  lostDetails?: string;
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: 'pendente' | 'produzindo' | 'concluido';
  length?: number;
  width?: number;
  m2?: number;
  environment?: string;
  servicePercentage?: number;
  materialId?: string;
  materialName?: string;
  productId?: string;
}

export interface Payment {
  id: string;
  date: string;
  value: number;
  method: string;
  status: 'confirmado' | 'pendente';
}

export interface OrderLog {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  osNumber: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  status: 'pendente' | 'em_rota' | 'entregue';
  driverId?: string;
  routeGroup?: string;
}

export interface Measurement {
  id: string;
  clientName: string;
  address: string;
  addressNumber?: string;
  cep?: string;
  date: string;
  time: string;
  status: 'Pendente' | 'Concluída' | 'Cancelada' | 'Excluída';
  description?: string;
  measurerName?: string;
  osId?: string;
  osNumber?: string;
  addressComplement?: string;
  clientPhone?: string;
  sellerName?: string;
  company_id: string;
}

export interface DriverStatus {
  lat: number;
  lng: number;
  lastUpdate: string;
  isOnline: boolean;
}

export interface CompanyInfo {
  name: string;
  document: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  printLogoUrl?: string;
  iconUrl?: string;
  sidebarColor?: string;
  sidebarTextColor?: string;
  buttonColor?: string;
  lostReasonOptions?: string[];
  legalNote?: string;
  maxDiscountPct?: number;
  maxArchitectCommissionPct?: number;
  sellerCommissionPct?: number;
  adminExpensesPerM2?: number;
  technicalReservePct?: number;
  permissionProfiles?: PermissionProfile[];
}

export interface Authorization {
  id: string;
  companyId: string;
  saleId?: string;
  saleOrderNumber?: string | number;
  clientName?: string;
  sellerId: string;
  sellerName: string;
  requestedValuePct: number; // Porcentagem solicitada (pode ser desconto ou comissão)
  maxValuePct: number;       // Limite permitido original
  adminId: string;
  adminName: string;
  type: 'discount' | 'commission';
  status: 'pending' | 'approved' | 'rejected';
  adminMessage?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
  lastUpdate: string;
}

export interface PriceHistoryEntry {
  date: string;
  cost: number;
  sellingPrice: number;
  suggestedPrice: number;
  currency: 'BRL' | 'USD' | 'EUR';
  supplier: string;
  difal: number;
  margin: number;
  freight: number;
  tax: number;
  loss: number;
  commission: number;
  discount: number;
  contributionMargin: number;
  cmv: number;
  dolarRate: number;
  euroRate: number;
}

export interface Material {
  id: string;
  name: string; // Descrição
  thickness?: number; // Espessura
  type: Category;
  code: string;
  registrationDate: string;
  group?: string;
  brand?: string;
  unit: string; // Und
  stockQuantity: number; // Saldo Estoque
  minStock: number; // Saldo Mínimo
  supplier?: string;
  stockLocation?: string;
  m2PerUnit?: number;
  weight?: number; // Qtde/Peso
  unitCost: number; // Custo Unitário
  freightCost: number;
  lossPercentage: number;
  taxPercentage: number;
  profitMargin: number;
  commissionPercentage: number;
  discountPercentage: number;
  dolarRate: number;
  euroRate: number;
  difal?: number;
  cmv?: number;
  contributionMargin?: number;
  suggestedPrice: number;
  specialTableMargin?: number;
  specialTableValue?: number;
  specialTableCommission?: number;
  sellingPrice: number;
  currency: 'BRL' | 'USD' | 'EUR';
  status: 'ativo' | 'inativo';
  imageUrl?: string;
  priceHistory?: PriceHistoryEntry[];
  nfeData?: {
    ncm?: string;
    cfop?: string;
    icms?: number;
    ipi?: number;
  };
}

export interface SalesOrder extends OrderService {}
export interface FinanceTransaction {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  value: number;
  date: string;
  status: 'pago' | 'pendente';
  description: string;
}

export type PaymentCategory = string;

export interface PaymentType {
  id: string;
  code?: string;
  name: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
  company_id?: string;
}

export interface PaymentMethod {
  id: string;
  code?: string;
  name: string;
  category: PaymentCategory;
  type: 'avista' | 'aprazo';
  installments?: number;          // nº máximo de parcelas (a prazo)
  installmentFee?: number;        // taxa por parcela em % (cartão parcelado)
  anticipationDiscount?: number;  // desconto p/ antecipação em %
  active: boolean;
  companyId?: string;
  createdAt: string;
}

export interface PayablePaymentMethod {
  id: string;
  code?: string;
  name: string;
  active: boolean;
  companyId?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  code?: number;
  name: string;
  bankName: string;
  accountType: 'corrente' | 'poupanca' | 'pagamento' | 'investimento' | 'caixa';
  agency: string;
  accountNumber: string;
  pixKey: string;
  notes: string;
  active: boolean;
  companyId?: string;
  createdAt: string;
}

export interface InstallmentPayment {
  id: string;
  date: string;        // data do pagamento (informada pelo usuário)
  updatedAt: string;   // timestamp exato do registro (ISO 8601)
  updatedBy: string;   // nome do usuário que registrou
  value: number;
  bankAccountId?: string;
  bankAccountName?: string;
  notes?: string;
}

export interface AccountInstallment {
  id: string;
  number: number;
  dueDate: string;
  value: number;
  status: 'pendente' | 'pago' | 'parcial' | 'atrasado';
  paidDate?: string;
  paidValue?: number;
  bankAccountId?: string;
  bankAccountName?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  notes?: string;
  payments?: InstallmentPayment[];
}

export interface AccountReceivable {
  id: string;
  description: string;
  clientId?: string;
  clientName?: string;
  saleId?: string;
  orderNumber?: string;
  totalValue: number;
  paidValue: number;
  remainingValue: number;
  installments: AccountInstallment[];
  paymentMethodId?: string;
  paymentMethodName?: string;
  category: string;
  dueDate: string;
  notes?: string;
  status: 'pendente' | 'parcial' | 'quitado' | 'cancelado';
  companyId?: string;
  createdAt: string;
}

export interface BillCategory {
  id: string;
  name: string;
  color: string;       // hex color, e.g. '#6366F1'
  nature: 'Fixa' | 'Variável';
  companyId?: string;
  createdAt: string;
}

export interface BillTransaction {
  id: string;
  date: string;              // YYYY-MM-DD
  paidValue: number;         // cash that went out
  interest: number;          // juros/multa acrescidos
  discount: number;          // desconto concedido
  paymentMethodId?: string;
  paymentMethodName?: string;
  receipt?: string;          // url ou nº do comprovante
  notes?: string;
}

export interface AccountPayable {
  id: string;
  description: string;
  supplierId?: string;
  supplierName?: string;
  totalValue: number;
  paidValue: number;
  remainingValue: number;
  installments: AccountInstallment[];
  transactions: BillTransaction[];   // histórico de baixas
  paymentMethodId?: string;
  paymentMethodName?: string;
  category: string;
  categoryId?: string;               // ref → BillCategory.id
  dueDate: string;
  competenceDate?: string;           // data de competência (YYYY-MM-DD)
  recurrence?: 'none' | 'monthly' | 'yearly';
  notes?: string;
  status: 'pendente' | 'parcial' | 'quitado' | 'cancelado';
  companyId?: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  code: string;
  description: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
}

export interface ProductGroup {
  id: string;
  code: string;
  description: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
}

export interface ServiceGroup {
  id: string;
  code: string;
  description: string;
  status?: 'ativo' | 'inativo';
  altMin?: number;
  altMax?: number;
  un?: string;
  indice?: number;
  bnto?: string;
  descFrete?: string;
  perda?: number;
  ifp?: number;
  tpMin?: number;
  qtFun?: number;
  es?: string;
  createdAt: string;
}

export interface WorkOrderMaterialM2 {
  materialName: string;
  materialId?: string;
  totalM2: number;
}

export interface WorkOrderFinishingLinear {
  itemName: string;
  materialName?: string;
  totalLinear: number;
  totalQty: number;
}

export interface WorkOrderLog {
  id: string;
  companyId: string;
  workOrderId: string;
  saleId?: string;
  environment: string;
  action: 'created' | 'reissued' | 'phase_changed' | 'deadline_changed' | 'cancelled' | 'drawing_added' | 'drawing_deleted';
  reason?: string;
  userName?: string;
  createdAt: string;
  fromPhase?: string;
  toPhase?: string;
}

export interface WorkOrder {
  id: string;
  companyId: string;
  osNumber: number;
  osSubNumber: number;
  saleId: string;
  saleOrderNumber?: number;
  clientName?: string;
  clientId?: string;
  environments: string[];
  saleItemIds: string[];
  status: 'Aguardando' | 'Em Produção' | 'Concluído' | 'Entregue' | 'Cancelada';
  notes?: string;
  materialsM2: WorkOrderMaterialM2[];
  finishingsLinear: WorkOrderFinishingLinear[];
  totalM2: number;
  totalLinear: number;
  createdAt: string;
  updatedAt?: string;
  logs?: WorkOrderLog[];
  productionPhase?: string;
  drawingUrl?: string;
  drawingUrls: string[];
  deliveryDeadline?: string;
  deliveryDate?: string;
  priority: 'alta' | 'media' | 'baixa';
  assignedUsers: Array<{ name: string; role?: string }>;
  sellerName?: string;
}

export type View =
  | 'Produção'
  | 'Agenda de Entregas'
  | 'Agenda de Medição'
  | 'Equipe'
  | 'Relatórios'
  | 'Configurações'
  | 'Clientes'
  | 'Vendas'
  | 'O.S. de Produção'
  | 'Estoque / Acabamentos'
  | 'Matéria Prima'
  | 'Acabamentos'
  | 'Produtos Revenda'
  | 'Mão de obra (Instalação)'
  | 'Financeiro'
  | 'Fornecedores'
  | 'Arquitetos'
  | 'Produtos de Revenda'
  | 'Serviços'
  | 'Colocação'
  | 'Marcas'
  | 'Canais de Vendas'
  | 'Grupos de Produtos'
  | 'Grupos de Serviços'
  | 'Contas a Receber'
  | 'Contas a Pagar'
  | 'Formas de PGTO AR'
  | 'Tipos de Pagamento'
  | 'Contas Bancárias'
  | 'Formas de PGTO CP';

export type User = AppUser;
