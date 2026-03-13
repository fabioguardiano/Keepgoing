
import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
        <Construction size={40} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-md mx-auto">
        Esta funcionalidade está em desenvolvimento para a próxima versão do KeepGoing. 
        Estamos trabalhando para trazer o melhor gerenciamento de {title.toLowerCase()} para sua marmoraria.
      </p>
      <button 
        onClick={() => alert('Você será notificado quando esta funcionalidade estiver disponível!')}
        className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Receber notificação
      </button>
    </div>
  );
};
