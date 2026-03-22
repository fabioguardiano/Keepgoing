import React from 'react';
import { OrderService } from '../types';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

interface OrderListViewProps {
  orders: OrderService[];
}

export const OrderListView: React.FC<OrderListViewProps> = ({ orders }) => {
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ordens de Serviço</h2>
          <p className="text-sm text-gray-500">Gerencie todas as ordens em formato de lista</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="p-4 font-bold">Nº O.S.</th>
              <th className="p-4 font-bold">Pedido</th>
              <th className="p-4 font-bold">Cliente</th>
              <th className="p-4 font-bold">Vendedor</th>
              <th className="p-4 font-bold">Fase</th>
              <th className="p-4 font-bold">Material</th>
              <th className="p-4 font-bold">Metragem</th>
              <th className="p-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-xs font-bold text-gray-900">{order.osNumber}</td>
                <td className="p-4 text-xs text-gray-600">#{order.orderNumber}</td>
                <td className="p-4 text-xs font-semibold text-gray-700">{order.clientName}</td>
                <td className="p-4 text-xs text-gray-500">{order.seller}</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 uppercase">
                    {order.phase}
                  </span>
                </td>
                <td className="p-4 text-xs text-gray-500">{order.material}</td>
                <td className="p-4 text-xs font-semibold text-gray-700">{order.materialArea} m²</td>
                <td className="p-4 text-right">
                  <button className="text-gray-400 hover:text-[var(--primary-color)] p-1">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Nenhuma ordem de serviço encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
