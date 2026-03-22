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
}

export type OrderPhase = ProductionPhase;

export interface PhaseConfig {
  name: string;
  description?: string;
  isRequired?: boolean;
  requiresResponsible: boolean;
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

export type StaffPosition = 'serrador' | 'acabador' | 'ajudante_serrador' | 'medidor' | 'instalador' | 'vendedor' | 'gerente';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'seller' | 'viewer' | 'driver';
  status: 'ativo' | 'inativo';
  company_id?: string;
  createdAt: string;
}

export interface ProductionStaff {
  id: string;
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
  action: 'create' | 'update' | 'delete' | 'move' | 'upload';
  details: string;
  orderId?: string;
  orderNumber?: string;
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
  deadline: string;
  priority: Priority;
  clientId?: string;
  architectId?: string;
  architectName?: string;
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
  salesPhase: SalesPhase;
  isOsGenerated: boolean;
  status?: 'Orçamento' | 'Pedido' | 'Confirmado' | 'Cancelado' | 'Finalizado';
  discountValue?: number;
  discountPercentage?: number;
  paymentConditions?: string;
  deliveryDeadline?: string;
  totals?: {
    vendas: number;
    desconto: number;
    geral: number;
  };
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
  sidebarColor?: string;
  sidebarTextColor?: string;
  buttonColor?: string;
  lostReasonOptions?: string[];
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
  bcfp: number;
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
  bcfp: number;
  suggestedPrice: number;
  specialTableMargin?: number;
  specialTableValue?: number;
  specialTableCommission?: number;
  sellingPrice: number;
  currency: 'BRL' | 'USD' | 'EUR';
  status: 'ativo' | 'inativo';
  imageUrl?: string;
  difal?: number;
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

export type View = 
  | 'Produção' 
  | 'Ordens de Serviço' 
  | 'Agenda de Entregas' 
  | 'Equipe' 
  | 'Relatórios' 
  | 'Configurações' 
  | 'Clientes' 
  | 'Vendas' 
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
  | 'Grupos de Serviços';

export type User = AppUser;
