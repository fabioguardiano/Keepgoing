import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalesOrder, CompanyInfo, Client, Material } from '../types';
import { fmt } from './formatting';

interface GeneratePDFProps {
  sale: SalesOrder;
  companyInfo: CompanyInfo;
  client?: Client;
  materials: Material[];
  hidePrices?: boolean;
}

export const generateSalePDF = async ({
  sale,
  companyInfo,
  client,
  materials,
  hidePrices = false
}: GeneratePDFProps) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isPedido = sale.status === 'Pedido';
  const docTitle = isPedido ? 'PEDIDO DE COMPRA' : 'ORÇAMENTO';

  // Helper para formatação de dimensões
  const fmtDim = (v?: number) => (v && v > 0 ? Number(v).toFixed(3) : '—');

  // --- CABEÇALHO ---
  // Tentar carregar a logo se existir
  let logoY = 10;
  if (companyInfo.printLogoUrl || companyInfo.logoUrl) {
    try {
      const imgUrl = companyInfo.printLogoUrl || companyInfo.logoUrl || '';
      // Nota: Em ambiente web, a imagem precisa estar acessível e sem CORS
      doc.addImage(imgUrl, 'PNG', 14, 10, 60, 25);
      logoY = 40;
    } catch (e) {
      console.warn('Erro ao carregar logo no PDF:', e);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo.name, 14, 20);
      logoY = 30;
    }
  } else {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name, 14, 20);
    logoY = 30;
  }

  // Bloco de Informações do Documento (Canto Superior Direito)
  doc.setDrawColor(0);
  doc.setFillColor(248, 250, 252);
  doc.rect(130, 10, 66, 30, 'FD');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(docTitle, 163, 18, { align: 'center' });
  doc.line(130, 21, 196, 21);

  doc.setFontSize(8);
  doc.text('Número:', 134, 26);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${sale.orderNumber}`, 150, 26);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Data:', 170, 26);
  doc.setFont('helvetica', 'normal');
  const saleDate = sale.createdAt ? sale.createdAt.split('T')[0].split('-').reverse().join('/') : today;
  doc.text(saleDate, 180, 26);

  doc.setFont('helvetica', 'bold');
  doc.text('Vendedor:', 134, 31);
  doc.setFont('helvetica', 'normal');
  doc.text((sale.seller || '-').toUpperCase(), 150, 31);

  doc.setFont('helvetica', 'bold');
  doc.text('Impressão:', 134, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`${today} ${currentTime}`, 150, 36);

  // --- DADOS DO CLIENTE ---
  let currentY = Math.max(logoY, 45);
  
  doc.setFillColor(0);
  doc.rect(14, currentY, 182, 5, 'F');
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 18, currentY + 3.5);
  doc.setTextColor(0);
  
  currentY += 5;
  doc.rect(14, currentY, 182, 22); // Moldura
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Nome / Razão Social:', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text((client?.tradingName || client?.legalName || sale.clientName || '-').toUpperCase(), 48, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('CPF / CNPJ:', 130, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.document || '-', 150, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Telefone:', 18, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.phone || '-', 35, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Celular:', 80, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.cellphone || '-', 95, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('E-mail:', 130, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text((client?.email || '-').toLowerCase(), 145, currentY + 11);

  const addr = client?.deliveryAddress || client?.address;
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', 18, currentY + 16);
  doc.setFont('helvetica', 'normal');
  if (addr) {
    const fullAddr = `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''} - ${addr.neighborhood} - ${addr.city}/${addr.state}`;
    doc.text(fullAddr.toUpperCase(), 35, currentY + 16, { maxWidth: 155 });
  } else {
    doc.text('-', 35, currentY + 16);
  }

  currentY += 28;

  // --- ITENS POR AMBIENTE ---
  const environments = Array.from(
    new Set((sale.items || []).map(i => i.environment || 'Sem Ambiente'))
  ).sort((a, b) => a.localeCompare(b));

  for (const env of environments) {
    const envItems = (sale.items || []).filter(i => (i.environment || 'Sem Ambiente') === env);
    
    // Título do Ambiente
    doc.setFillColor(50);
    doc.rect(14, currentY, 182, 6, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(env.toUpperCase(), 18, currentY + 4.5);
    doc.setTextColor(0);
    currentY += 6;

    const tableData = envItems.map(item => [
      Number(item.quantity || 0).toFixed(2),
      item.description.toUpperCase(),
      (materials.find(m => m.id === item.materialId)?.name || item.materialName || '-').toUpperCase(),
      fmtDim(item.length),
      fmtDim(item.width),
      hidePrices ? '' : fmt(item.totalPrice || 0)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Qtde', 'Descrição', 'Matéria Prima / Material', 'Comp.(m)', 'Larg.(m)', hidePrices ? '' : 'Total (R$)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: 0, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        currentY = data.cursor?.y || currentY;
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
    
    // Verificar se precisa de nova página
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  }

  // --- TOTAIS E OBSERVAÇÕES ---
  if (currentY > 200) {
    doc.addPage();
    currentY = 20;
  }

  const subtotal = sale.totals?.vendas || (sale.items || []).reduce((a, i) => a + (i.totalPrice || 0), 0);
  const frete = sale.totals?.frete || sale.deliveryFee || 0;
  const discount = sale.totals?.desconto || 0;
  const total = sale.totals?.geral || (subtotal + frete - discount);

  // Box de Observações
  doc.setDrawColor(0);
  doc.rect(14, currentY, 110, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVAÇÕES', 18, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(sale.paymentConditions || '', 18, currentY + 10, { maxWidth: 102 });

  // Box de Totais
  if (!hidePrices) {
    doc.rect(130, currentY, 66, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Sub-Total:', 134, currentY + 6);
    doc.text(`R$ ${fmt(subtotal)}`, 192, currentY + 6, { align: 'right' });
    
    if (frete > 0) {
      doc.text('Frete:', 134, currentY + 12);
      doc.text(`+ R$ ${fmt(frete)}`, 192, currentY + 12, { align: 'right' });
    }
    
    if (discount > 0) {
      doc.setTextColor(185, 28, 28);
      doc.text('Desconto:', 134, currentY + 18);
      doc.text(`- R$ ${fmt(discount)}`, 192, currentY + 18, { align: 'right' });
      doc.setTextColor(0);
    }

    doc.setFillColor(0);
    doc.rect(130, currentY + 23, 66, 7, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.text('TOTAL:', 134, currentY + 28);
    doc.text(`R$ ${fmt(total)}`, 192, currentY + 28, { align: 'right' });
    doc.setTextColor(0);
  }

  currentY += 45;

  // --- PRAZO E PAGAMENTO ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES DE PAGAMENTO:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.paymentMethodName || 'A combinar', 60, currentY);
  
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('PRAZO DE ENTREGA:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  const deliveryDays = sale.deliveryDeadline ? `${sale.deliveryDeadline} dias úteis` : 'A combinar';
  doc.text(deliveryDays, 60, currentY);

  currentY += 25;

  // --- ASSINATURAS ---
  doc.line(14, currentY, 90, currentY);
  doc.line(110, currentY, 186, currentY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text((sale.seller || companyInfo.name).toUpperCase(), 52, currentY + 5, { align: 'center' });
  doc.text('EMPRESA', 52, currentY + 9, { align: 'center' });

  doc.text((client?.tradingName || client?.legalName || sale.clientName || 'CLIENTE').toUpperCase(), 148, currentY + 5, { align: 'center' });
  doc.text('CLIENTE', 148, currentY + 9, { align: 'center' });

  // --- RODAPÉ ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const footerText = `${companyInfo.name} ${companyInfo.address ? ` - ${companyInfo.address}` : ''}${companyInfo.phone ? ` - Tel: ${companyInfo.phone}` : ''}`;
  doc.text(footerText.toUpperCase(), 105, pageHeight - 10, { align: 'center' });

  // Salvar
  const fileName = `${docTitle}_${sale.orderNumber}.pdf`;
  doc.save(fileName);
};
