import React from 'react';
import { Lock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { SalesOrder, Material, ProductService, CompanyInfo } from '../types';

interface SaleAnalysisPanelProps {
  sale: SalesOrder;
  materials: Material[];
  products: ProductService[];
  companyInfo: CompanyInfo;
}

interface SaleAnalysis {
  // Resumo da Venda
  valorMaterialPrima: number;
  valorProdutosRevenda: number;
  valorServicos: number;
  subTotal: number;
  desconto: number;
  valorVenda: number;
  comissaoVendedor: number;
  comissaoArquiteto: number;

  // Apuração de Custo
  materiaPrimaComPerdas: number;
  frete: number;
  reservaTecnica: number;
  comissaoVendedorCusto: number;
  custoProdRevenda: number;
  servicosCusto: number;
  impostosMaterial: number;
  impostosProdRevenda: number;
  impostosServicos: number;
  valorApurado: number;

  // Apuração de Resultado
  custosTotal: number;
  impostosTotais: number;
  despesasAdmin: number;
  resultado: number;
  gainPct: number;
  sellerPct: number; // % efetivo calculado item a item

  // Métricas de área
  totalM2: number;
  totalM2ComPerda: number;

  // Parcelamento
  parcelas: { mes: number; valor: number }[];
}

function calcSaleAnalysis(
  sale: SalesOrder,
  materials: Material[],
  products: ProductService[],
  companyInfo: CompanyInfo
): SaleAnalysis {
  const items = sale.items || [];

  // Classifica cada item
  const materialItems = items.filter(i => {
    if ((i.servicePercentage ?? 0) > 0) return false;
    if (!i.materialId) return false;
    const isMat = materials.some(m => m.id === i.materialId);
    if (isMat) return true;
    // Se está em products mas com dimensões (m²), trata como matéria prima
    const prod = products.find(p => p.id === i.materialId);
    return prod ? (i.m2 && i.m2 > 0) : false;
  });

  const productItems = items.filter(i => {
    if ((i.servicePercentage ?? 0) > 0) return false;
    if (!i.materialId) return false;
    const prod = products.find(p => p.id === i.materialId);
    return prod ? (!i.m2 || i.m2 === 0) && prod.type === 'Produtos de Revenda' : false;
  });

  const serviceItems = items.filter(i => {
    if ((i.servicePercentage ?? 0) > 0 || !i.materialId) return true;
    const prod = products.find(p => p.id === i.materialId);
    return prod ? (!i.m2 || i.m2 === 0) && prod.type === 'Acabamentos' : false;
  });

  // Valores de venda por tipo
  const valorMaterialPrima = materialItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const valorProdutosRevenda = productItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const valorServicos = serviceItems.reduce((s, i) => s + (i.totalPrice || 0), 0);

  const subTotal = sale.totals?.vendas ?? (valorMaterialPrima + valorProdutosRevenda + valorServicos);
  const frete = sale.totals?.frete || sale.deliveryFee || 0;
  const desconto = sale.totals?.desconto ?? 0;
  const valorVenda = sale.totals?.geral ?? (subTotal + frete - desconto);

  const comissaoArquiteto = sale.totals?.comissaoArquiteto ?? 0;

  // Métricas de área
  const totalM2 = materialItems.reduce((s, i) => s + (i.m2 || 0), 0);

  // Custo real de cada material (com perdas e frete unitário)
  let materiaPrimaComPerdas = 0;
  let impostosMaterial = 0;
  let comissaoVendedorMaterial = 0;
  materialItems.forEach(i => {
    const mat = materials.find(m => m.id === i.materialId);
    const qty = i.m2 && i.m2 > 0 ? i.m2 : i.quantity;
    if (mat) {
      const custoBase = (mat.unitCost + (mat.freightCost || 0)) * qty;
      const custoComPerda = custoBase * (1 + (mat.lossPercentage || 0) / 100);
      materiaPrimaComPerdas += custoComPerda;
      impostosMaterial += custoBase * ((mat.taxPercentage || 0) / 100);
      // Comissão sempre calculada sobre o valor de venda do item
      comissaoVendedorMaterial += (i.totalPrice || 0) * ((mat.commissionPercentage || 0) / 100);
    } else {
      materiaPrimaComPerdas += (i.totalPrice || 0) * 0.6;
    }
  });

  // m² com perda
  const totalM2ComPerda = materialItems.reduce((s, i) => {
    const mat = materials.find(m => m.id === i.materialId);
    return s + (i.m2 || 0) * (1 + (mat?.lossPercentage || 0) / 100);
  }, 0);

  // Custo produtos de revenda + comissão
  let custoProdRevenda = 0;
  let impostosProdRevenda = 0;
  let comissaoVendedorProd = 0;
  productItems.forEach(i => {
    const prod = products.find(p => p.id === i.materialId);
    if (prod) {
      const custo = prod.unitCost * i.quantity;
      custoProdRevenda += custo;
      impostosProdRevenda += custo * ((prod.taxPercentage || 0) / 100);
      comissaoVendedorProd += (i.totalPrice || 0) * ((prod.commissionPercentage || 0) / 100);
    } else {
      custoProdRevenda += (i.totalPrice || 0) * 0.6;
    }
  });

  // Comissão de Acabamentos (serviceItems que vêm do cadastro de produtos)
  let comissaoVendedorAcabamentos = 0;
  serviceItems.forEach(i => {
    if (i.materialId) {
      const prod = products.find(p => p.id === i.materialId);
      if (prod) {
        comissaoVendedorAcabamentos += (i.totalPrice || 0) * ((prod.commissionPercentage || 0) / 100);
      }
    }
  });

  // Comissão total do vendedor (matéria prima + produtos de revenda + acabamentos)
  const comissaoVendedor = comissaoVendedorMaterial + comissaoVendedorProd + comissaoVendedorAcabamentos;
  const sellerPct = valorVenda > 0 ? (comissaoVendedor / valorVenda) * 100 : 0;

  // Custo serviços (custo = servicePercentage do valor do item mat. prima pai ou unitCost se for serviço puro)
  let servicosCusto = 0;
  let impostosServicos = 0;
  serviceItems.forEach(i => {
    // Para serviços que são % sobre mat. prima: custo direto é o valor pago
    // Estimamos custo de serviço como 40% do valor cobrado
    servicosCusto += (i.totalPrice || 0) * 0.4;
    // Impostos de serviço (ISS típico ~5%)
    impostosServicos += (i.totalPrice || 0) * 0.05;
  });

  // Reserva Técnica = Comissão do Arquiteto (vem diretamente da venda)
  const reservaTecnica = comissaoArquiteto;
  const comissaoVendedorCusto = comissaoVendedor; // já calculado por item
  const despesasAdmin = (companyInfo.adminExpensesPerM2 ?? 0) * totalM2;

  const impostosTotais = impostosMaterial + impostosProdRevenda + impostosServicos;

  const valorApurado =
    materiaPrimaComPerdas +
    reservaTecnica +
    comissaoVendedorCusto +
    comissaoArquiteto +
    custoProdRevenda +
    servicosCusto +
    impostosTotais;

  const custosTotal = valorApurado;
  const resultado = valorVenda - custosTotal - despesasAdmin;
  const gainPct = valorVenda > 0 ? (resultado / valorVenda) * 100 : 0;

  // Parcelamento 1–6 meses sem juros
  const juros = 0;
  const parcelas = [1, 2, 3, 4, 5, 6].map(n => ({
    mes: n,
    valor: valorVenda * (1 + juros * (n - 1)) / n,
  }));

  return {
    valorMaterialPrima,
    valorProdutosRevenda,
    valorServicos,
    subTotal,
    desconto,
    valorVenda,
    comissaoVendedor,
    comissaoArquiteto,
    materiaPrimaComPerdas,
    frete,
    reservaTecnica,
    comissaoVendedorCusto,
    custoProdRevenda,
    servicosCusto,
    impostosMaterial,
    impostosProdRevenda,
    impostosServicos,
    valorApurado,
    custosTotal,
    impostosTotais,
    despesasAdmin,
    resultado,
    gainPct,
    sellerPct,
    totalM2,
    totalM2ComPerda,
    parcelas,
  };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface RowProps { label: string; value: number; sub?: boolean; bold?: boolean; indent?: boolean }
const Row: React.FC<RowProps> = ({ label, value, sub, bold, indent }) => (
  <div className={`flex justify-between items-center py-[3px] ${indent ? 'pl-3' : ''} ${bold ? 'border-t border-slate-200 mt-1 pt-2' : ''}`}>
    <span className={`text-[11px] ${bold ? 'font-black text-slate-800' : 'font-medium text-slate-600'}`}>{label}</span>
    <span className={`text-[11px] tabular-nums ${bold ? 'font-black text-slate-800' : sub ? 'font-semibold text-slate-500' : 'font-semibold text-slate-700'}`}>
      {sub ? `- ${fmt(value)}` : fmt(value)}
    </span>
  </div>
);

export const SaleAnalysisPanel: React.FC<SaleAnalysisPanelProps> = ({
  sale, materials, products, companyInfo,
}) => {
  const a = calcSaleAnalysis(sale, materials, products, companyInfo);
  const isProfit = a.resultado >= 0;

  const hasParams = companyInfo.adminExpensesPerM2 !== undefined;

  return (
    <div className="mt-6 border-t-2 border-dashed border-slate-200 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-slate-800 rounded-lg">
          <Lock size={13} className="text-white" />
        </div>
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em]">Resumo da Venda — Exclusivo Admin</h3>
        {!hasParams && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
            <AlertCircle size={10} />
            Configure os parâmetros financeiros em Configurações
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">

        {/* Coluna 1 — Resumo da Venda */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Resumo da Venda</h4>
          <Row label="Valor Matéria Prima" value={a.valorMaterialPrima} />
          <Row label="Vlr. Prod. Revenda" value={a.valorProdutosRevenda} />
          <Row label="Valor Serviços" value={a.valorServicos} />
          <Row label="Sub Total" value={a.subTotal} bold />
          {a.desconto > 0 && <Row label="- Valor Desconto" value={a.desconto} sub />}
          {a.frete > 0 && <Row label="+ Frete" value={a.frete} />}
          <Row label="Valor da Venda" value={a.valorVenda} bold />

          <div className="mt-3 pt-3 border-t border-slate-200 space-y-[3px]">
            <Row label={`C. Financeiro`} value={0} />
            <Row label={`Total c/ Financeiro`} value={a.valorVenda} />
            <Row label={`C. Vendedor (${fmtPct(a.sellerPct)}%)`} value={a.comissaoVendedor} />
            {a.comissaoArquiteto > 0 && (
              <Row label={`Res. Tec. / Arq.`} value={a.comissaoArquiteto} />
            )}
          </div>
        </div>

        {/* Coluna 2 — Apuração de Custo */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Apuração de Custo</h4>
          <Row label="Custo Mercadoria Vendida (CMV)" value={a.materiaPrimaComPerdas} />
          <Row label="Reserva Técnica (Arq.)" value={a.reservaTecnica} />
          <Row label="Comissão do Vendedor" value={a.comissaoVendedorCusto} />
          <Row label="Valor Mão de Obra" value={0} />
          <Row label="Custo Prod. Revenda" value={a.custoProdRevenda} />
          <Row label="Serviços" value={a.servicosCusto} />
          <div className="mt-1.5 pt-1.5 border-t border-slate-200">
            <Row label="Impostos — Mat. Prima" value={a.impostosMaterial} indent />
            <Row label="Impostos — Prod. Revenda" value={a.impostosProdRevenda} indent />
            <Row label="Impostos — Serviços" value={a.impostosServicos} indent />
          </div>
          <Row label="Valor Apurado" value={a.valorApurado} bold />
        </div>

        {/* Coluna 3 — Apuração de Resultados */}
        <div className={`border rounded-2xl p-4 ${isProfit ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Apuração de Resultados</h4>
          <Row label="Vlr. Venda" value={a.valorVenda} />
          <Row label="- Custo Apurado" value={a.custosTotal} sub />
          <Row label="- Impostos" value={a.impostosTotais} sub />
          <Row label={`- Desp. Admin. (R$${fmt(companyInfo.adminExpensesPerM2 ?? 0)}/m²)`} value={a.despesasAdmin} sub />

          <div className={`flex justify-between items-center mt-3 pt-3 border-t ${isProfit ? 'border-emerald-200' : 'border-red-200'}`}>
            <span className="text-sm font-black text-slate-800">Resultado:</span>
            <span className={`text-sm font-black ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
              {isProfit ? '' : '- '}R$ {fmt(Math.abs(a.resultado))}
            </span>
          </div>

          <div className="mt-4 space-y-[3px]">
            <div className="flex justify-between items-center py-[3px]">
              <span className="text-[11px] font-medium text-slate-600">Matéria Prima (m²)</span>
              <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{a.totalM2.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
            </div>
            <div className="flex justify-between items-center py-[3px]">
              <span className="text-[11px] font-medium text-slate-600">Mat. Prima + Perda (m²)</span>
              <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{a.totalM2ComPerda.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t ${isProfit ? 'border-emerald-200' : 'border-red-200'} flex items-center justify-between`}>
            {isProfit
              ? <TrendingUp size={18} className="text-emerald-600" />
              : <TrendingDown size={18} className="text-red-500" />
            }
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Apuração do Ganho</p>
              <p className={`text-2xl font-black ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmtPct(Math.abs(a.gainPct))}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé — Parcelamento */}
      <div className="mt-3 grid grid-cols-6 gap-2">
        {a.parcelas.map(p => (
          <div key={p.mes} className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{p.mes}x Mes</p>
            <p className="text-[11px] font-black text-slate-700 tabular-nums">{fmt(p.valor)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
