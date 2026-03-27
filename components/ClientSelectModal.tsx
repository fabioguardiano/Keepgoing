import React, { useState } from 'react';
import { X, Search, User, Phone, MapPin } from 'lucide-react';
import { Client } from '../types';

interface ClientSelectModalProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  onClose: () => void;
}

export const ClientSelectModal: React.FC<ClientSelectModalProps> = ({ clients, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document.includes(searchTerm) ||
    client.phone.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Selecionar Cliente</h2>
            <p className="text-sm text-slate-500 font-medium">Pesquise por nome, CPF/CNPJ ou telefone</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              autoFocus
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--primary-color)] rounded-2xl outline-none transition-all font-medium text-slate-800 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredClients.length > 0) {
                  onSelect(filteredClients[0]);
                }
              }}
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => onSelect(client)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-[var(--primary-color)] dark:hover:border-[var(--primary-color)] hover:bg-orange-50 dark:hover:bg-[var(--primary-color)]/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-[var(--primary-color)] transition-colors">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white group-hover:text-[var(--primary-color)] transition-colors">{client.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <Phone size={12} /> {client.phone || client.cellphone}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <MapPin size={12} /> {client.address.city}, {client.address.state}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-[var(--primary-color)] group-hover:text-white transition-all">
                    Selecionar
                  </div>
                </button>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-slate-700">
                  <User size={32} />
                </div>
                <p className="text-slate-500 font-bold">Nenhum cliente encontrado</p>
                <p className="text-slate-400 text-sm">Tente uma busca diferente ou cadastre um novo cliente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
