/**
 * useLegacyMigration
 *
 * Hook de uso único: migra dados que ainda estão no localStorage do browser
 * (chaves antigas: marmo_clients_*, marmo_suppliers_*, etc.) para o Supabase.
 *
 * Só roda se:
 *   1. O usuário está autenticado
 *   2. O Supabase retornou 0 registros para a tabela (indica dado perdido)
 *   3. O localStorage do browser ainda tem dados com as chaves antigas
 *
 * Após migrar, salva uma flag no Supabase (companies.legacy_migration_done)
 * para não rodar novamente.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MigrationResult {
  done: boolean;
  migrated: Record<string, number>;
  errors: string[];
}

export const useLegacyMigration = (companyId?: string): MigrationResult => {
  const [result, setResult] = useState<MigrationResult>({ done: false, migrated: {}, errors: [] });

  useEffect(() => {
    if (!companyId) return;

    const run = async () => {
      try {
        // 1. Verifica se a migração já foi feita
        const { data: company } = await supabase
          .from('companies')
          .select('legacy_migration_done')
          .eq('id', companyId)
          .single();

        if (company?.legacy_migration_done) {
          setResult(r => ({ ...r, done: true }));
          return;
        }

        // 2. Verifica se há dados no localStorage (browser)
        const ls = typeof window !== 'undefined' ? window.localStorage : null;
        if (!ls) return;

        const migrated: Record<string, number> = {};
        const errors: string[] = [];

        // ── CLIENTES ──────────────────────────────────────────────────────────
        const rawClients = ls.getItem(`marmo_clients_${companyId}`)
          || ls.getItem('marmo_clients_00000000-0000-0000-0000-000000000000')
          || ls.getItem('marmo_clients_legacy');
        if (rawClients) {
          try {
            const localClients: any[] = JSON.parse(rawClients);
            if (localClients.length > 0) {
              const { count } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

              if ((count ?? 0) === 0) {
                const rows = localClients.map((c: any) => ({
                  id: (c.id && c.id.length > 20) ? c.id : undefined,
                  company_id: companyId,
                  name: c.tradingName || c.name || 'Sem Nome',
                  legal_name: c.legalName || c.name || '',
                  trading_name: c.tradingName || c.name || '',
                  type: c.type || 'Pessoa Física',
                  document: c.document || '',
                  email: c.email || '',
                  phone: c.phone || '',
                  cellphone: c.cellphone || '',
                  birth_date: c.birthDate || null,
                  address: c.address || {},
                  delivery_address: c.deliveryAddress || null,
                  rg_insc: c.rgInsc || '',
                  observations: c.observations || '',
                  client_code: c.code || null,
                  status: c.status || 'ativo',
                  created_at: c.createdAt || new Date().toISOString(),
                }));
                const { error } = await supabase.from('clients').upsert(rows);
                if (error) errors.push(`clients: ${error.message}`);
                else migrated.clients = rows.length;
              }
            }
          } catch (e: any) { errors.push(`clients parse: ${e.message}`); }
        }

        // ── FORNECEDORES ──────────────────────────────────────────────────────
        const rawSuppliers = ls.getItem(`marmo_suppliers_${companyId}`)
          || ls.getItem('marmo_suppliers_00000000-0000-0000-0000-000000000000')
          || ls.getItem('marmo_suppliers_legacy');
        if (rawSuppliers) {
          try {
            const localSuppliers: any[] = JSON.parse(rawSuppliers);
            if (localSuppliers.length > 0) {
              const { count } = await supabase
                .from('suppliers')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

              if ((count ?? 0) === 0) {
                const rows = localSuppliers.map((s: any) => ({
                  id: (s.id && s.id.length > 20) ? s.id : undefined,
                  company_id: companyId,
                  name: s.tradingName || s.name || 'Sem Nome',
                  legal_name: s.legalName || s.name || '',
                  trading_name: s.tradingName || s.name || '',
                  type: s.type || 'Pessoa Jurídica',
                  document: s.document || '',
                  email: s.email || '',
                  phone: s.phone || '',
                  cellphone: s.cellphone || '',
                  address: s.address || {},
                  observations: s.observations || '',
                  supplier_code: s.code || null,
                  status: s.status || 'ativo',
                  created_at: s.createdAt || new Date().toISOString(),
                }));
                const { error } = await supabase.from('suppliers').upsert(rows);
                if (error) errors.push(`suppliers: ${error.message}`);
                else migrated.suppliers = rows.length;
              }
            }
          } catch (e: any) { errors.push(`suppliers parse: ${e.message}`); }
        }

        // ── ARQUITETOS ────────────────────────────────────────────────────────
        const rawArchitects = ls.getItem(`marmo_architects_${companyId}`)
          || ls.getItem('marmo_architects_00000000-0000-0000-0000-000000000000')
          || ls.getItem('marmo_architects_legacy');
        if (rawArchitects) {
          try {
            const localArchitects: any[] = JSON.parse(rawArchitects);
            if (localArchitects.length > 0) {
              const { count } = await supabase
                .from('architects')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

              if ((count ?? 0) === 0) {
                const rows = localArchitects.map((a: any) => ({
                  id: (a.id && a.id.length > 20) ? a.id : undefined,
                  company_id: companyId,
                  name: a.tradingName || a.name || 'Sem Nome',
                  legal_name: a.legalName || a.name || '',
                  trading_name: a.tradingName || a.name || '',
                  type: a.type || 'Pessoa Física',
                  document: a.document || '',
                  contact_name: a.contactName || '',
                  email: a.email || '',
                  phone: a.phone || '',
                  cellphone: a.cellphone || '',
                  address: a.address || {},
                  observations: a.observations || '',
                  architect_code: a.code || null,
                  status: a.status || 'ativo',
                  created_at: a.createdAt || new Date().toISOString(),
                }));
                const { error } = await supabase.from('architects').upsert(rows);
                if (error) errors.push(`architects: ${error.message}`);
                else migrated.architects = rows.length;
              }
            }
          } catch (e: any) { errors.push(`architects parse: ${e.message}`); }
        }

        // ── MATÉRIA-PRIMA (materiais) ─────────────────────────────────────────
        const rawMaterials = ls.getItem(`marmo_materials_${companyId}`)
          || ls.getItem('marmo_materials_00000000-0000-0000-0000-000000000000')
          || ls.getItem('marmo_materials_legacy');
        if (rawMaterials) {
          try {
            const localMaterials: any[] = JSON.parse(rawMaterials);
            if (localMaterials.length > 0) {
              const { count } = await supabase
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

              if ((count ?? 0) === 0) {
                const rows = localMaterials.map((m: any) => ({
                  id: (m.id && m.id.length > 20) ? m.id : undefined,
                  company_id: companyId,
                  code: m.code || '',
                  name: m.name || 'Sem Nome',
                  type: m.type || '',
                  unit: m.unit || 'M²',
                  price: m.price || 0,
                  status: m.status || 'ativo',
                  created_at: m.createdAt || new Date().toISOString(),
                }));
                const { error } = await supabase.from('materials').upsert(rows);
                if (error) errors.push(`materials: ${error.message}`);
                else migrated.materials = rows.length;
              }
            }
          } catch (e: any) { errors.push(`materials parse: ${e.message}`); }
        }

        // ── PRODUTOS ──────────────────────────────────────────────────────────
        const rawProducts = ls.getItem(`marmo_products_${companyId}`)
          || ls.getItem('marmo_products_00000000-0000-0000-0000-000000000000')
          || ls.getItem('marmo_products_legacy');
        if (rawProducts) {
          try {
            const localProducts: any[] = JSON.parse(rawProducts);
            if (localProducts.length > 0) {
              const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

              if ((count ?? 0) === 0) {
                const rows = localProducts.map((p: any) => ({
                  id: (p.id && p.id.length > 20) ? p.id : undefined,
                  company_id: companyId,
                  code: p.code || '',
                  name: p.name || 'Sem Nome',
                  type: p.type || 'Produto',
                  description: p.description || '',
                  unit: p.unit || 'UN',
                  price: p.price || 0,
                  brand_id: p.brandId || null,
                  group_id: p.groupId || null,
                  status: p.status || 'ativo',
                  image_urls: p.imageUrls || [],
                  created_at: p.createdAt || new Date().toISOString(),
                }));
                const { error } = await supabase.from('products').upsert(rows);
                if (error) errors.push(`products: ${error.message}`);
                else migrated.products = rows.length;
              }
            }
          } catch (e: any) { errors.push(`products parse: ${e.message}`); }
        }

        // ── VENDAS ────────────────────────────────────────────────────────────
        const rawSales = ls.getItem(`marmo_sales_${companyId}`)
          || ls.getItem('marmo_sales_00000000-0000-0000-0000-000000000000')
          || ls.getItem('marmo_sales_legacy');
        if (rawSales) {
          try {
            const localSales: any[] = JSON.parse(rawSales);
            if (localSales.length > 0) {
              const { count } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

              if ((count ?? 0) === 0) {
                for (const s of localSales) {
                  const { error } = await supabase.from('sales').upsert({
                    id: (s.id && s.id.length > 20) ? s.id : undefined,
                    company_id: companyId,
                    order_number: s.orderNumber || '',
                    status: s.status || 'Orçamento',
                    client_id: s.clientId || null,
                    client_name: s.clientName || '',
                    seller_id: s.sellerId || null,
                    seller_name: s.sellerName || '',
                    architect_id: s.architectId || null,
                    architect_name: s.architectName || '',
                    sales_channel_id: s.salesChannelId || null,
                    items: s.items || [],
                    totals: s.totals || {},
                    notes: s.notes || '',
                    phase: s.phase || null,
                    down_payment_value: s.downPaymentValue || 0,
                    installments: s.installments || [],
                    payment_method_id: s.paymentMethodId || null,
                    created_at: s.createdAt || new Date().toISOString(),
                    updated_at: s.updatedAt || new Date().toISOString(),
                  });
                  if (error) errors.push(`sale ${s.orderNumber}: ${error.message}`);
                  else migrated.sales = (migrated.sales || 0) + 1;
                }
              }
            }
          } catch (e: any) { errors.push(`sales parse: ${e.message}`); }
        }

        // 3. Marca a migração como concluída no Supabase
        const totalMigrated = Object.values(migrated).reduce((a, b) => a + b, 0);
        if (totalMigrated > 0 || errors.length === 0) {
          try {
            await supabase
              .from('companies')
              .update({ legacy_migration_done: true })
              .eq('id', companyId);
          } catch {
            // Coluna pode não existir — não é crítico
          }
        }

        if (totalMigrated > 0) {
          console.info(
            '[useLegacyMigration] Migração concluída:',
            Object.entries(migrated).map(([k, v]) => `${v} ${k}`).join(', ')
          );
        }
        if (errors.length > 0) {
          console.warn('[useLegacyMigration] Erros:', errors);
        }

        setResult({ done: true, migrated, errors });
      } catch (err: any) {
        console.error('[useLegacyMigration] Falha geral:', err.message);
        setResult(r => ({ ...r, done: true, errors: [err.message] }));
      }
    };

    run();
  }, [companyId]);

  return result;
};
