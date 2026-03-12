import { ProductionPhase, OrderService, INITIAL_PHASES } from './types';

export const PHASES = INITIAL_PHASES;

export const MOCK_ORDERS: OrderService[] = [
  {
    id: '1',
    osNumber: 'OS-1002',
    orderNumber: 'PED-5590',
    clientName: 'Chok Doce',
    projectDescription: 'Chopeira Itaúnas Escovado',
    material: 'Itaúnas Escovado',
    materialArea: 2.5,
    phase: 'Serviço Lançado',
    seller: 'Carlos Vendas',
    imageUrls: [
      'https://picsum.photos/seed/os1/400/600',
      'https://picsum.photos/seed/os1b/400/600'
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'alta'
  },
  {
    id: '2',
    osNumber: 'OS-1005',
    orderNumber: 'PED-5612',
    clientName: 'Residencial Aurora',
    projectDescription: 'Bancada Cozinha Gourmet',
    material: 'Granito São Gabriel',
    materialArea: 4.8,
    phase: 'Corte',
    seller: 'Carlos Vendas',
    imageUrls: ['https://picsum.photos/seed/os2/400/600'],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'media'
  },
  {
    id: '3',
    osNumber: 'OS-1008',
    orderNumber: 'PED-5620',
    clientName: 'Apartamento 402',
    projectDescription: 'Soleiras e Pingadeiras',
    material: 'Mármore Branco Paraná',
    materialArea: 1.2,
    phase: 'Acabamento',
    seller: 'Ana Gerente',
    imageUrls: [
      'https://picsum.photos/seed/os3/400/600',
      'https://picsum.photos/seed/os3b/400/600',
      'https://picsum.photos/seed/os3c/400/600'
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'baixa'
  }
];

