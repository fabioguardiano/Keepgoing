export type Category = 'Matéria Prima' | 'Produtos de Revenda' | 'Serviços' | 'Colocação' | 'Acabamentos';

export type StaffPosition = 
  | 'serrador' 
  | 'acabador' 
  | 'ajudante_serrador' 
  | 'ajudante_acabador' 
  | 'motorista' 
  | 'medidor' 
  | 'instalador' 
  | 'vendedor' 
  | 'gerente';

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
];

export interface PhaseResponsible {
  id: string;
  staffName: string;
  addedAt: string;
}

export interface PhaseRecord {
  phaseName: string;
  startedAt: string;
  completedAt?: string;
  responsibles: PhaseResponsible[];
}

export interface OrderService {
  id: string;
  osNumber: string;
  orderNumber: string;
  clientName: string;
  clientPhone?: string;
  projectName?: string;
  projectDescription?: string;
  material?: string;
  materialArea?: number;
  phase: ProductionPhase;
  priority: 'baixa' | 'media' | 'alta';
  dueDate: string;
  items: any[];
  totalValue: number;
  remainingValue?: number;
  notes?: string;
  observations?: string;
  internalObservations?: string;
  address?: string;
  installationAddress?: string;
  imageUrls: string[];
  responsibleStaffName?: string;
  phaseHistory?: PhaseRecord[];
  seller?: string;
  deadline?: string;
  clientId?: string;
  architectId?: string;
  architectName?: string;
  salesChannel?: string;
  salesPhase?: string;
  isOsGenerated?: boolean;
  status?: string;
  discountValue?: number;
  discountPercentage?: number;
  paymentConditions?: string;
  deliveryDeadline?: string;
  totals?: any;
  payments?: any[];
  logs?: any[];
  lostReason?: string;
  lostDetails?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'manager' | 'seller' | 'medidor' | 'driver' | 'viewer';
  status?: string;
  isMaster?: boolean;
  createdAt?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'seller' | 'medidor' | 'driver' | 'viewer';
  status: 'ativo' | 'inativo';
  createdAt: string;
  avatarUrl?: string;
  isMaster?: boolean;
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
  type: 'create' | 'move' | 'update' | 'delete' | 'upload';
  action?: 'create' | 'move' | 'update' | 'delete' | 'upload'; // Alias usado em alguns locais
  description: string;
  details?: string; // Alias usado em alguns locais
  message?: string;
  timestamp: string;
  userName?: string;
  orderId?: string;
  osNumber?: string;
  reference_id?: string;
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
  orderId: string;
  osNumber: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  status: 'pendente' | 'em_rota' | 'entregue';
  staffId?: string;
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
  primaryColor?: string;
  secondaryColor?: string;
  buttonColor?: string;
  lostReasonOptions?: string[];
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
  referencePoint?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  document: string;
  notes?: string;
  code?: string;
  rgInsc?: string;
  cellphone?: string;
  birthDate?: string;
  sellerName?: string;
  useSpecialTable?: boolean;
  createdAt?: string;
  type?: 'Pessoa Física' | 'Pessoa Jurídica';
  deliveryAddress?: Address;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  type?: string;
  unit: string;
  price: number;
  stock: number;
  minStock: number;
  status: 'ativo' | 'inativo';
  imageUrl?: string;
  unitCost?: number;
  stockQuantity?: number;
  registrationDate?: string;
  brand?: string;
  supplier?: string;
  difal?: number;
  freightCost?: number;
  taxPercentage?: number;
  lossPercentage?: number;
  profitMargin?: number;
  commissionPercentage?: number;
  discountPercentage?: number;
  suggestedPrice?: number;
  sellingPrice?: number;
  currency?: string;
  dolarRate?: number;
  euroRate?: number;
  bcfp?: number;
  thickness?: number;
  weight?: number;
  m2PerUnit?: number;
  stockLocation?: string;
  priceHistory?: any[];
  code?: string;
}

export interface ProductService {
  id: string;
  name: string;
  description: string;
  category: Category;
  type?: string;
  unit: string;
  price: number;
  sellingPrice: number;
  status: 'ativo' | 'inativo';
  imageUrl?: string;
  brand?: string;
  group?: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  clientId?: string;
  date: string;
  total: number;
  totals?: any;
  totalValue?: number;
  deliveryDeadline?: string;
  seller?: string;
  observations?: string;
  notes?: string;
  status: 'Orçamento' | 'Pedido' | 'Confirmado' | 'Finalizado' | 'Cancelado' | 'pendente' | 'aprovado' | 'cancelado';
  items: any[];
  salesPhase?: string;
  isOsGenerated?: boolean;
  projectDescription?: string;
  salesChannel?: string;
  createdAt?: string;
  lostReason?: string;
  lostDetails?: string;
}

export interface SalesChannel {
  id: string;
  name: string;
  color: string;
}

export interface FinanceTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: 'receita' | 'despesa';
  category: string;
  status?: 'pago' | 'pendente';
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  document: string;
  type?: string;
  legalName?: string;
  tradingName?: string;
  contactName?: string;
  website?: string;
  rgInsc?: string;
  cellphone?: string;
  observations?: string;
  code?: string;
  createdAt?: string;
}

export interface Architect {
  id: string;
  name: string;
  email: string;
  phone: string;
  office?: string;
  type?: string;
  document?: string;
  legalName?: string;
  tradingName?: string;
  contactName?: string;
  cellphone?: string;
  address?: string;
  observations?: string;
  rgInsc?: string;
  code?: string;
  createdAt?: string;
}

export interface Brand {
  id: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface ProductGroup {
  id: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface ServiceGroup {
  id: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
  lastUpdate: string;
}

export type View = 
  | 'Produção' 
  | 'Ordens de Serviço' 
  | 'Agenda de Entregas' 
  | 'Agenda de Medições' 
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
  | 'Grupos de Produtos' 
  | 'Grupos de Serviços' 
  | 'Canais de Vendas';
