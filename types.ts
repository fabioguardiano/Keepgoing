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
  projectName?: string;
  phase: ProductionPhase;
  priority: 'baixa' | 'media' | 'alta';
  dueDate: string;
  items: string[];
  totalValue: number;
  notes?: string;
  address?: string;
  installationAddress?: string;
  imageUrls: string;
  responsibleStaffName?: string;
  phaseHistory?: PhaseRecord[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'manager' | 'seller';
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'seller';
  status: 'ativo' | 'inativo';
  createdAt: string;
  avatarUrl?: string;
  isMaster?: boolean;
}

export interface ProductionStaff {
  id: string;
  name: string;
  position: string;
  hourlyRate: number;
  phone: string;
  status: 'ativo' | 'inativo';
}

export interface ActivityLog {
  id: string;
  type: 'create' | 'move' | 'update' | 'delete' | 'upload';
  description: string;
  timestamp: string;
  orderId?: string;
  osNumber?: string;
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
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  document: string;
  notes?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  minStock: number;
  status: 'ativo' | 'inativo';
  imageUrl?: string;
}

export interface ProductService {
  id: string;
  name: string;
  category: Category;
  unit: string;
  price: number;
  status: 'ativo' | 'inativo';
  imageUrl?: string;
  brand?: string;
  group?: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  date: string;
  total: number;
  status: 'pendente' | 'aprovado' | 'cancelado';
  items: any[];
  salesPhase?: string;
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
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  document: string;
}

export interface Architect {
  id: string;
  name: string;
  email: string;
  phone: string;
  office: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface ProductGroup {
  id: string;
  name: string;
}

export interface ServiceGroup {
  id: string;
  name: string;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
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
