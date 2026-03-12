import React from 'react';
import { SalesOrder, CompanyInfo, Client, Material } from '../types';

interface PrintBudgetProps {
  sale: SalesOrder;
  companyInfo: CompanyInfo;
  client?: Client;
  materials: Material[];
  blurMeasurements?: boolean;
}

export const PrintBudget: React.FC<PrintBudgetProps> = ({ sale, companyInfo, client, materials, blurMeasurements = false }) => {
  const today = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="print-only bg-white text-black pt-0 pb-12 text-[12px] leading-tight w-full mx-auto relative" style={{ fontFamily: 'Calibri, "Inter", sans-serif' }}>
      {/* Header */}
      <div className="border-b-2 border-black flex justify-between items-start pt-2 pb-0">
        <div className="w-1/2 -mb-10">
          {companyInfo.logoUrl ? (
            <img src={companyInfo.logoUrl} alt="Logo" className="max-h-48 w-auto object-contain object-top" />
          ) : (
            <div className="text-6xl font-black tracking-tighter text-slate-800">
              <span className="text-[var(--primary-color)]">TOK</span> <span className="text-slate-400">DE</span> ART
              <div className="text-[12px] font-normal uppercase tracking-[0.3em] mt-[-4px] text-slate-500">marmoraria</div>
            </div>
          )}
        </div>
        <div className="w-1/3 border border-black p-2 bg-slate-50">
          <div className="grid grid-cols-2 gap-x-2 text-[10px]">
            <span className="font-bold">Digitador:</span> <span>{(sale.seller || '').toUpperCase()}</span>
            <span className="font-bold">ORÇAMENTO</span> <span></span>
            <span className="font-bold">Número:</span> <span>{sale.orderNumber}</span>
            <span className="font-bold">Validade.:</span> <span>{sale.deadline || '15 dias'}</span>
            
            <span className="font-bold">Data:</span> <span>{sale.createdAt ? sale.createdAt.split('T')[0].split('-').reverse().join('/') : ''}</span>
            <span className="font-bold">Dt. Imp.:</span> <span>{today}</span>
            <span className="font-bold">Hora:</span> <span>{currentTime}</span>
            <span className="font-bold text-right col-span-2">Pag.: 1</span>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="space-y-1 mb-2">
        <div className="flex gap-2">
          <span className="font-bold">Cliente......:</span>
          <span className="flex-1 uppercase">{sale.clientName}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-2 flex-[0.8]">
            <span className="font-bold">CPF/CNPJ.:</span>
            <span className="flex-1">{client?.document || ''}</span>
          </div>
          <div className="flex gap-2 flex-[0.8]">
            <span className="font-bold">RG/Inscrição:</span>
            <span className="flex-1">{client?.rgInsc || ''}</span>
          </div>
          <div className="flex gap-2 flex-[0.6]">
            <span className="font-bold">Telefone:</span>
            <span className="flex-1">{client?.phone || ''}</span>
          </div>
           <div className="flex gap-2 flex-1">
            <span className="font-bold">E-mail:</span>
            <span className="flex-1 lowercase truncate">{client?.email || ''}</span>
          </div>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="font-bold">Endereço...:</span>
          <span className="flex-1 uppercase">
            {client?.address.street}, {client?.address.number} - {client?.address.neighborhood} - {client?.address.city}/{client?.address.state} - CEP: {client?.address.zipCode}
          </span>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="grid grid-cols-1 gap-y-1 mb-6 text-[10px]">
        <div className="flex gap-2">
          <span className="font-bold w-32">Endereço de Entrega:</span> 
          <span className="uppercase">
            {client?.deliveryAddress?.street || client?.address.street || '-'}, {client?.deliveryAddress?.number || client?.address.number || ''} {client?.deliveryAddress?.complement || ''}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-2">
            <span className="font-bold w-32">Bairro:</span> 
            <span className="uppercase truncate">{client?.deliveryAddress?.neighborhood || client?.address.neighborhood || '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">Cidade:</span> 
            <span className="uppercase truncate">{client?.deliveryAddress?.city || client?.address.city || '-'}</span>
          </div>
          <div className="grid grid-cols-2">
             <div className="flex gap-2">
               <span className="font-bold">CEP:</span> 
               <span>{client?.deliveryAddress?.zipCode || client?.address.zipCode || '-'}</span>
             </div>
             <div className="flex gap-2">
               <span className="font-bold">UF:</span> 
               <span className="uppercase">{client?.deliveryAddress?.state || client?.address.state || '-'}</span>
             </div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="font-bold w-32">Ponto de Referência:</span> 
          <span className="uppercase">{client?.deliveryAddress?.referencePoint || '-'}</span>
        </div>
      </div>

      {/* Items Grouped by Environment */}
      {Array.from(new Set(sale.items?.map(i => i.environment || 'Sem Ambiente'))).map((env, envIdx) => {
        const envItems = sale.items?.filter(i => (i.environment || 'Sem Ambiente') === env) || [];
        const envTotal = envItems.reduce((acc, i) => acc + i.totalPrice, 0);

        return (
          <div key={env} className="mb-6">
            <div className="border-b border-black mb-1 flex justify-between items-end">
              <h3 className="font-black text-[11px] uppercase tracking-wider">{env}</h3>
              <span className="text-[9px] font-bold">Sub-Total Ambiente: R$ {(envTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <table className="w-full mb-2 border-collapse">
              <thead className="border-b border-black">
                <tr className="font-bold text-left text-[10px]">
                  <th className="w-12 py-1">Qtde.:</th>
                  <th className="py-1 pr-4">Descrição:</th>
                  <th className="w-64 py-1 pr-2">Matéria Prima:</th>
                  <th className="w-12 py-1 text-center">Comp.:</th>
                  <th className="w-8 py-1 text-center"></th>
                  <th className="w-12 py-1 text-center">Larg.:</th>
                  <th className="w-24 py-1 text-right">Total:</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {envItems.map((item) => (
                  <tr key={item.id} className="align-top text-[11px]">
                    <td className="py-1.5 text-center font-bold">{Number(item.quantity || 0).toFixed(2)}</td>
                    <td className="py-1.5 uppercase font-bold pr-4">
                      {item.description}
                    </td>
                    <td className="py-1.5 text-[10px] uppercase font-bold pr-2 text-slate-700">
                      {materials.find(m => m.id === item.materialId)?.name || item.materialName || '-'}
                    </td>
                    <td className="py-1.5 text-center font-mono text-[10px]">
                      {blurMeasurements ? (
                        <span className="blur-sm select-none opacity-50">0.000</span>
                      ) : (
                        Number(item.length || 0).toFixed(3) || '0.000'
                      )}
                    </td>
                    <td className="py-1.5 text-center font-bold text-[12px]" style={{ filter: blurMeasurements ? 'none' : 'auto' }}>
                      X
                    </td>
                    <td className="py-1.5 text-center font-mono text-[10px]">
                      {blurMeasurements ? (
                        <span className="blur-sm select-none opacity-50">0.000</span>
                      ) : (
                        Number(item.width || 0).toFixed(3) || '0.000'
                      )}
                    </td>
                    <td className="py-2 text-right border-b border-gray-100 font-bold">R$ {(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Totals Section */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex-1 p-2 border border-black text-[9px] space-y-1">
          <p>Mármores e granitos por sua natureza, estão sujeitos a variação de tonalidades, veios, buracos, fissuras e/ou manchas não podendo ser recusado ou devolvidos por essa natureza.</p>
          <p>Serviços em obra só serão executados se estiverem inclusos no orçamento, como: colagem, calafate, polimento etc.</p>
          <p>Não fazemos instalações.</p>
        </div>
        <div className="w-[300px] border border-black">
          <div className="flex justify-between border-b border-black p-2 bg-slate-50 font-bold">
            <span>Sub Total...:</span>
            <span className="font-black">{(sale.totals?.vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {((sale.totals?.vendas || 0) > (sale.totals?.geral || 0)) && (
            <div className="flex justify-between p-2 font-bold text-red-700">
              <span>Desconto...:</span>
              <span className="font-black">- {((sale.totals?.vendas || 0) - (sale.totals?.geral || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-black p-2 bg-slate-50 font-black text-sm">
            <span>Valor Total..........R$:</span>
            <span className="">{(sale.totals?.geral || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Delivery / Extra Info */}
      <div className="border border-black flex mb-8">
        <div className="border-r border-black p-2 w-1/4 font-bold bg-slate-50">
          Previsão de entrega:
          <div className="uppercase">COMBINAR Dias Úteis</div>
        </div>
        <div className="p-2 flex-1 uppercase font-bold">
          ENTREGA NÃO INCLUSA NO ORÇAMENTO.
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-20 px-8 pb-10 break-inside-avoid">
        <div className="text-center">
          <div className="border-t border-black pt-2">
            <div className="font-black uppercase">{sale.seller}</div>
            <div className="text-[10px]">Departamento Comercial</div>
            <div className="text-[10px] lowercase">E-Mail: {companyInfo.email}</div>
            <div className="text-[10px]">Cel.: {companyInfo.phone}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2">
            <div className="font-black uppercase">{sale.clientName}</div>
            <div className="text-[10px] uppercase">CNPJ - {client?.document}</div>
          </div>
        </div>
      </div>

      {/* Company Contact Bottom */}
      <div className="fixed bottom-0 left-0 right-0 text-center text-[9px] uppercase font-bold text-slate-500 bg-white py-2 z-50">
        {companyInfo.address} - Fone: {companyInfo.phone} - CEP: 14015-050 - RIBEIRÃO PRETO-SP -
      </div>

    </div>
    </>
  );
};
