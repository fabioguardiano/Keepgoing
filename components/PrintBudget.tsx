import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { SalesOrder, CompanyInfo, Client, Material, AppUser } from '../types';
import { fmt } from '../utils/formatting';

interface PrintBudgetProps {
  sale: SalesOrder;
  companyInfo: CompanyInfo;
  client?: Client;
  materials: Material[];
  blurMeasurements?: boolean;
  sellerUser?: AppUser;
  hideM2Unit?: boolean;
  onClose: () => void;
}

const fmtDim = (v?: number) =>
  v && v > 0 ? Number(v).toFixed(3) : null;

export const PrintBudget: React.FC<PrintBudgetProps> = ({
  sale,
  companyInfo,
  client,
  materials,
  blurMeasurements = false,
  sellerUser,
  hideM2Unit = true,
  onClose,
}) => {
  const today = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isPedido = sale.status === 'Pedido';
  const docTitle = isPedido ? 'PEDIDO DE COMPRA' : 'ORÇAMENTO';

  // Remove linhas internas de [RETORNO] — informação gerencial, não deve aparecer ao cliente
  const clientObservations = (sale.observations || '')
    .split('\n')
    .filter(line => !line.trimStart().startsWith('[RETORNO]'))
    .join('\n')
    .trim();

  const environments = Array.from(
    new Set((sale.items || []).map(i => i.environment || 'Sem Ambiente'))
  ).sort((a, b) => a.localeCompare(b));

  const deliveryDays = sale.deliveryDeadline ? parseInt(sale.deliveryDeadline as string) : null;

  const subtotal = sale.totals?.vendas || (sale.items || []).reduce((a, i) => a + (i.totalPrice || 0), 0);
  const frete = sale.totals?.frete || sale.deliveryFee || 0;
  const discount = sale.totals?.desconto ?? ((subtotal + frete > (sale.totals?.geral || 0)) ? subtotal + frete - (sale.totals?.geral || 0) : 0);
  const architectCommission = sale.totals?.comissaoArquiteto || 0;
  const total = sale.totals?.geral || (subtotal + frete);

  const addr = client?.address;
  const del = client?.deliveryAddress;

  const useDeliveryAddr = del?.street && del.street !== addr?.street;

  const content = (
    <div
      className="bg-white text-black w-full"
      style={{ fontFamily: '"Calibri", "Arial", sans-serif', fontSize: '11px', lineHeight: '1.35' }}
    >
      {/* ── CABEÇALHO ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
        {/* Logo / Nome */}
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
          {companyInfo.printLogoUrl || companyInfo.logoUrl ? (
            <img 
              src={companyInfo.printLogoUrl || companyInfo.logoUrl} 
              alt="Logo" 
              style={{ maxHeight: '260px', maxWidth: '600px', width: 'auto', objectFit: 'contain', display: 'block' }} 
            />
          ) : (
          <div style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-1px', color: '#000' }}>
            {companyInfo.name}
          </div>
          )}
          {/* Dados da empresa removidos a pedido do usuário */}
        </div>

        {/* Bloco doc info */}
        <div style={{ width: '38%', border: '1px solid #000', padding: '6px 8px', backgroundColor: '#f8fafc' }}>
          <div style={{ fontWeight: 900, fontSize: '14px', textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '4px', letterSpacing: '1px' }}>
            {docTitle}
          </div>
          <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, paddingRight: '4px' }}>Número:</td>
                <td style={{ fontWeight: 900 }}>#{sale.orderNumber}</td>
                <td style={{ fontWeight: 700, paddingLeft: '8px' }}>Data:</td>
                <td>{sale.createdAt ? sale.createdAt.split('T')[0].split('-').reverse().join('/') : today}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Vendedor:</td>
                <td style={{ textTransform: 'uppercase' }}>{sale.seller || '-'}</td>
                <td style={{ fontWeight: 700, paddingLeft: '8px' }}>Impressão:</td>
                <td>{today} {currentTime}</td>
              </tr>
              {sale.architectName && (
                <tr>
                  <td style={{ fontWeight: 700 }}>Arquiteto:</td>
                  <td colSpan={3} style={{ textTransform: 'uppercase' }}>{sale.architectName}</td>
                </tr>
              )}
              {sale.salesChannel && (
                <tr>
                  <td style={{ fontWeight: 700 }}>Canal:</td>
                  <td colSpan={3} style={{ textTransform: 'uppercase' }}>{sale.salesChannel}</td>
                </tr>
              )}
              {!isPedido && (
                <tr>
                  <td style={{ fontWeight: 700 }}>Validade:</td>
                  <td colSpan={3}>30 dias</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DADOS DO CLIENTE ─────────────────────────────────── */}
      <div style={{ border: '1px solid #000', marginBottom: '6px' }}>
        <div style={{ backgroundColor: '#000', color: '#fff', fontWeight: 900, fontSize: '9px', padding: '2px 6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Dados do Cliente
        </div>
        <div style={{ padding: '5px 7px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 12px', marginBottom: '3px' }}>
            <div>
              <span style={{ fontWeight: 700 }}>Nome / Razão Social: </span>
              <span style={{ textTransform: 'uppercase', fontWeight: 900 }}>{client?.tradingName || client?.legalName || sale.clientName}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>CPF / CNPJ: </span>
              <span>{client?.document || '-'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>RG / Insc.: </span>
              <span>{client?.rgInsc || '-'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px', marginBottom: '3px' }}>
            <div>
              <span style={{ fontWeight: 700 }}>Telefone: </span>
              <span>{client?.phone || '-'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>Celular: </span>
              <span>{client?.cellphone || '-'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>E-mail: </span>
              <span style={{ textTransform: 'lowercase' }}>{client?.email || '-'}</span>
            </div>
          </div>
          {addr && (
            <div style={{ marginBottom: '3px' }}>
              <span style={{ fontWeight: 700 }}>Endereço: </span>
              <span style={{ textTransform: 'uppercase' }}>
                {addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''} — {addr.neighborhood} — {addr.city}/{addr.state} — CEP: {addr.zipCode}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── ENDEREÇO DE ENTREGA ───────────────────────────────── */}
      <div style={{ border: '1px solid #000', marginBottom: '10px' }}>
        <div style={{ backgroundColor: '#333', color: '#fff', fontWeight: 900, fontSize: '9px', padding: '2px 6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Endereço de Entrega
        </div>
        <div style={{ padding: '5px 7px' }}>
          {useDeliveryAddr ? (
            <>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: 700 }}>Logradouro: </span>
                <span style={{ textTransform: 'uppercase' }}>
                  {del!.street}, {del!.number}{del!.complement ? ` - ${del!.complement}` : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 12px' }}>
                <div><span style={{ fontWeight: 700 }}>Bairro: </span><span style={{ textTransform: 'uppercase' }}>{del!.neighborhood}</span></div>
                <div><span style={{ fontWeight: 700 }}>Cidade: </span><span style={{ textTransform: 'uppercase' }}>{del!.city}</span></div>
                <div><span style={{ fontWeight: 700 }}>UF: </span><span>{del!.state}</span></div>
                <div><span style={{ fontWeight: 700 }}>CEP: </span><span>{del!.zipCode}</span></div>
              </div>
              {del!.referencePoint && (
                <div style={{ marginTop: '3px' }}>
                  <span style={{ fontWeight: 700 }}>Referência: </span>
                  <span style={{ textTransform: 'uppercase' }}>{del!.referencePoint}</span>
                </div>
              )}
            </>
          ) : addr ? (
            <div style={{ textTransform: 'uppercase', color: '#000' }}>
              {addr.street}, {addr.number} — {addr.neighborhood} — {addr.city}/{addr.state} — CEP: {addr.zipCode}
            </div>
          ) : (
            <span style={{ color: '#000' }}>Endereço de entrega não informado.</span>
          )}
        </div>
      </div>

      {/* ── ITENS POR AMBIENTE ───────────────────────────────── */}
      {environments.map((env) => {
        const envItems = (sale.items || []).filter(i => (i.environment || 'Sem Ambiente') === env);
        const envTotal = envItems.reduce((a, i) => a + (i.totalPrice || 0), 0);

        return (
          <div key={env} style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
            {/* Cabeçalho do ambiente */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', color: '#fff', padding: '3px 8px', marginBottom: '0' }}>
              <span style={{ fontWeight: 900, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {env}
              </span>
            </div>

            {/* Tabela de itens */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', fontSize: '8.5px', fontWeight: 700, borderBottom: '1px solid #000' }}>
                  <th style={{ padding: '3px 4px', textAlign: 'left', width: '5%' }}>Qtde.</th>
                  <th style={{ padding: '3px 4px', textAlign: 'left', width: hideM2Unit ? '20%' : '12%' }}>Descrição</th>
                  <th style={{ padding: '3px 4px', textAlign: 'left', width: '41%' }}>Matéria Prima / Material</th>
                  <th style={{ padding: '3px 4px', textAlign: 'center', width: '10%' }}>Comp. (m)</th>
                  <th style={{ padding: '3px 4px', textAlign: 'center', width: '10%' }}>Larg. (m)</th>
                  {!hideM2Unit && <th style={{ padding: '3px 4px', textAlign: 'center', width: '8%' }}>M² / Un</th>}
                  <th style={{ padding: '3px 4px', textAlign: 'right', width: '14%' }}>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {envItems.map((item, idx) => {
                  const isAcab = item.category === 'Acabamentos';
                  const hasDimensions = !isAcab && (fmtDim(item.length) !== null || fmtDim(item.width) !== null);
                  const m2 = item.m2 || (item.length && item.width ? item.length * item.width * (item.quantity || 1) : null);
                  const matName = materials.find(m => m.id === item.materialId)?.name || item.materialName || '-';
                  const isOdd = idx % 2 === 0;

                  return (
                    <tr key={item.id} style={{ backgroundColor: isOdd ? '#fff' : '#f8fafc', fontSize: '10px', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 700 }}>
                        {Number(item.quantity || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '3px 4px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {item.description}
                      </td>
                      <td style={{ padding: '3px 4px', fontSize: '9px', textTransform: 'uppercase', color: '#000' }}>
                        {matName}
                      </td>
                      <td style={{ padding: '3px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px' }}>
                        {hasDimensions ? (
                          blurMeasurements
                            ? <span style={{ filter: 'blur(4px)', userSelect: 'none' }}>0.000</span>
                            : fmtDim(item.length) || '—'
                        ) : '—'}
                      </td>
                      <td style={{ padding: '3px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px' }}>
                        {hasDimensions ? (
                          blurMeasurements
                            ? <span style={{ filter: 'blur(4px)', userSelect: 'none' }}>0.000</span>
                            : fmtDim(item.width) || '—'
                        ) : '—'}
                      </td>
                      {!hideM2Unit && (
                        <td style={{ padding: '3px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px' }}>
                          {hasDimensions && m2 && !blurMeasurements
                            ? Number(m2).toFixed(3)
                            : (item.unit === 'un' ? item.quantity : '—')}
                        </td>
                      )}
                      <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 900 }}>
                        {fmt(item.totalPrice || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Sub-rodapé do ambiente */}
              <tfoot>
                <tr style={{ backgroundColor: '#e2e8f0', borderTop: '1px solid #000' }}>
                  <td colSpan={6} style={{ padding: '3px 8px', fontWeight: 700, fontSize: '9px', textAlign: 'right' }}>
                    Sub-Total — {env}:
                  </td>
                  <td style={{ padding: '3px 8px', fontWeight: 900, fontSize: '10px', textAlign: 'right' }}>
                    {fmt(envTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {/* ── TOTAIS + OBSERVAÇÕES ─────────────────────────────── */}
      {(() => {
        const n = sale.paymentInstallments || 1;
        const totalVal = sale.totals?.geral ?? sale.totalValue ?? 0;
        const baseValue = Math.floor((totalVal / n) * 100) / 100;
        const diff = Math.round((totalVal - baseValue * n) * 100) / 100;
        const fmtR = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const rows = n > 1
          ? Array.from({ length: n }, (_, i) => ({
              num: i + 1,
              value: i === 0 ? baseValue + diff : baseValue,
              due: sale.firstDueDate ? (() => {
                const d = new Date(sale.firstDueDate + 'T12:00:00');
                return new Date(d.getFullYear(), d.getMonth() + i, d.getDate()).toLocaleDateString('pt-BR');
              })() : null,
            }))
          : null;

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', marginBottom: '10px', pageBreakInside: 'avoid' }}>
            {/* Coluna esquerda: Observações + Nota legal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Observações — campo que o usuário preenche na tela de manutenção */}
              <div style={{ border: '1px solid #000', padding: '6px 8px', flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '9px', textTransform: 'uppercase', marginBottom: '4px', color: '#000' }}>
                  Observações
                </div>
                <div style={{ fontSize: '10px', minHeight: '40px', whiteSpace: 'pre-wrap' }}>
                  {sale.paymentConditions || ''}
                </div>
              </div>

              {/* Nota legal */}
              {(() => {
                const note = companyInfo.legalNote ?? 'Mármores e granitos, por sua natureza, estão sujeitos a variações de tonalidade, veios, buracos, fissuras e/ou manchas, não podendo ser recusados ou devolvidos por essa razão.\nServiços em obra (colagem, calafetagem, polimento etc.) só serão executados se explicitamente inclusos neste orçamento.';
                return note.trim() ? (
                  <div style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '8.5px', color: '#000', whiteSpace: 'pre-wrap' }}>
                    {note}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Coluna direita: Totais → Prazo → Condições de Pagamento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Resumo financeiro */}
              {/* Resumo financeiro */}
              <div style={{ border: '2px solid #000' }}>
                <div style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000', padding: '5px 10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Sub-Total Geral</span>
                  <span style={{ fontWeight: 700 }}>R$ {fmt(subtotal)}</span>
                </div>
                {frete > 0 && (
                  <div style={{ padding: '5px 10px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700 }}>Frete / Entrega</span>
                    <span style={{ fontWeight: 700 }}>+ R$ {fmt(frete)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div style={{ padding: '5px 10px', display: 'flex', justifyContent: 'space-between', color: '#b91c1c', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700 }}>Desconto</span>
                    <span style={{ fontWeight: 700 }}>- R$ {fmt(discount)}</span>
                  </div>
                )}
                {/* Comissão do arquiteto removida da impressão para o cliente conforme solicitado */}
                <div style={{ backgroundColor: '#000', color: '#fff', padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 900, fontSize: '12px' }}>VALOR TOTAL</span>
                  <span style={{ fontWeight: 900, fontSize: '13px' }}>R$ {fmt(total)}</span>
                </div>
              </div>

              {/* Condições de Pagamento */}
              {sale.paymentMethodName && (
                <div style={{ border: '1px solid #000', padding: '6px 8px' }}>
                  <div style={{ fontWeight: 900, fontSize: '9px', textTransform: 'uppercase', marginBottom: '4px', color: '#000' }}>
                    Condições de Pagamento
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: rows ? '5px' : '0' }}>
                    {sale.paymentMethodName}
                    {n > 1 && (
                      <span style={{ marginLeft: '6px', fontWeight: 900, color: '#000' }}>
                        — {n}x de R$ {fmtR(baseValue)}
                      </span>
                    )}
                    {n === 1 && (
                      <span style={{ marginLeft: '6px', fontWeight: 900, color: '#000' }}>— à vista</span>
                    )}
                  </div>
                  {rows && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <th style={{ padding: '2px 4px', textAlign: 'left', fontWeight: 700 }}>Parcela</th>
                          {rows[0].due && <th style={{ padding: '2px 4px', textAlign: 'left', fontWeight: 700 }}>Vencimento</th>}
                          <th style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 700 }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.num} style={{ borderTop: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '2px 4px', fontWeight: 600 }}>{r.num}ª</td>
                            {r.due && <td style={{ padding: '2px 4px' }}>{r.due}</td>}
                            <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 700 }}>R$ {fmtR(r.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Prazo de Entrega — abaixo das condições */}
              <div style={{ border: '1px solid #000', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 900, fontSize: '9px', textTransform: 'uppercase', color: '#000' }}>Prazo de Entrega:</span>
                <span style={{ fontWeight: 700, fontSize: '10px' }}>
                  {deliveryDays && deliveryDays > 0 ? `${deliveryDays} dias úteis` : <span style={{ fontStyle: 'italic', color: '#000' }}>A combinar</span>}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ASSINATURAS ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '36px', pageBreakInside: 'avoid' }}>
        {/* Vendedor */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '11px', color: '#000' }}>{sale.seller || companyInfo.name}</div>
            <div style={{ fontSize: '9px', color: '#000' }}>
              {sellerUser?.role ? (
                sellerUser.role === 'admin' ? 'Administrador' :
                sellerUser.role === 'manager' ? 'Gerente' :
                sellerUser.role === 'seller' ? 'Vendedor' :
                'Departamento Comercial'
              ) : 'Departamento Comercial'}
            </div>
            {(sellerUser?.email || companyInfo.email) && <div style={{ fontSize: '9px', color: '#000' }}>{sellerUser?.email || companyInfo.email}</div>}
            {companyInfo.phone && <div style={{ fontSize: '9px', color: '#000' }}>{companyInfo.phone}</div>}
          </div>
        </div>
        {/* Cliente */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '11px', color: '#000' }}>
              {client?.tradingName || client?.legalName || sale.clientName}
            </div>
            {client?.document && (
              <div style={{ fontSize: '9px', color: '#000' }}>
                {client.type === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}: {client.document}
              </div>
            )}
            {/* Rótulo "Cliente" removido a pedido do usuário */}
          </div>
        </div>
      </div>

      {/* ── RODAPÉ ───────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #000', marginTop: '16px', paddingTop: '6px', textAlign: 'center', fontSize: '8px', color: '#000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {companyInfo.name}
        {companyInfo.address ? ` — ${companyInfo.address}` : ''}
        {companyInfo.phone ? ` — Tel: ${companyInfo.phone}` : ''}
        {companyInfo.email ? ` — ${companyInfo.email}` : ''}
      </div>

    </div>
  );

  const handlePrint = () => {
    window.print();
    setTimeout(onClose, 300);
  };

  return createPortal(
    <>
      {/* Preview modal — hidden when printing */}
      <div className="no-print fixed inset-0 z-[9999] flex flex-col bg-black/70 backdrop-blur-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <Printer size={18} className="text-slate-400" />
            <span className="font-bold text-sm">
              Pré-visualização — {sale.status === 'Pedido' ? 'Pedido de Compra' : 'Orçamento'} #{sale.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] hover:opacity-90 text-white rounded-lg font-bold text-sm transition-all shadow"
            >
              <Printer size={15} /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition-all"
            >
              <X size={15} /> Fechar
            </button>
          </div>
        </div>

        {/* Scrollable paper area */}
        <div className="flex-1 overflow-y-auto bg-slate-600 py-8 px-4 flex flex-col items-center">
          <div
            style={{
              width: '210mm',
              fontFamily: '"Calibri", "Arial", sans-serif',
              fontSize: '11px',
              lineHeight: '1.35',
              color: 'black',
              /* @page margins: 5mm top, 0mm bottom → 292mm content per page */
              backgroundImage: [
                'linear-gradient(to bottom,',
                '  white 0,',
                '  white 292mm,',
                '  #475569 292mm,',
                '  #475569 297mm,',
                '  white 297mm',
                ')',
              ].join(' '),
              backgroundSize: '100% 297mm',
              backgroundRepeat: 'repeat-y',
              padding: '5mm 15mm 0mm 15mm',
              boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
            }}
          >
            {content}
          </div>
        </div>
      </div>

      {/* Print-only content — for window.print() */}
      <div className="print-only">{content}</div>
    </>,
    document.body
  );
};
