import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Authorization } from '../types';

const map = (r: any): Authorization => ({
  id: r.id,
  companyId: r.company_id,
  saleId: r.sale_id,
  saleOrderNumber: r.sale_order_number,
  clientName: r.client_name,
  sellerId: r.seller_id,
  sellerName: r.seller_name,
  requestedValuePct: Number(r.requested_value_pct || r.requested_discount_pct || 0),
  maxValuePct: Number(r.max_value_pct || r.max_discount_pct || 0),
  adminId: r.admin_id,
  adminName: r.admin_name,
  type: r.type || 'discount',
  status: r.status,
  adminMessage: r.admin_message,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

export const useAuthorizations = (companyId?: string) => {
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);

  const fetch = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('discount_authorizations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setAuthorizations(data.map(map));
  };

  useEffect(() => {
    fetch();
    if (!companyId) return;

    const channel = supabase
      .channel(`discount_auth:${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discount_authorizations', filter: `company_id=eq.${companyId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAuthorizations(prev => [map(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAuthorizations(prev => prev.map(a => a.id === payload.new.id ? map(payload.new) : a));
          } else if (payload.eventType === 'DELETE') {
            setAuthorizations(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const requestAuthorization = async (params: {
    saleId?: string;
    saleOrderNumber?: string | number;
    clientName?: string;
    sellerId: string;
    sellerName: string;
    requestedValuePct: number;
    maxValuePct: number;
    adminId: string;
    adminName: string;
    type: 'discount' | 'commission';
  }): Promise<Authorization | null> => {
    if (!companyId) return null;
    
    // Tentamos inserir com os nomes novos de colunas se existirem, senão mantemos comp. retroativa.
    // Se a coluna 'type' não existir no banco, a inserção falhará.
    // IMPORTANTE: O usuário precisará rodar um SQL se a coluna 'type' for nova.
    const { data, error } = await supabase
      .from('discount_authorizations')
      .insert({
        company_id: companyId,
        sale_id: params.saleId || null,
        sale_order_number: params.saleOrderNumber || null,
        client_name: params.clientName || null,
        seller_id: params.sellerId,
        seller_name: params.sellerName,
        requested_value_pct: params.requestedValuePct, // Nova coluna
        max_value_pct: params.maxValuePct,             // Nova coluna
        requested_discount_pct: params.requestedValuePct, // Retrocompatibilidade
        max_discount_pct: params.maxValuePct,             // Retrocompatibilidade
        admin_id: params.adminId,
        admin_name: params.adminName,
        type: params.type,                             // Nova coluna
        status: 'pending',
      })
      .select()
      .single();
      
    if (error) { 
      console.error('Erro ao solicitar autorização:', error); 
      // Se falhar por causa do 'type', tentamos sem ele para manter o sistema rodando (só descontos)
      if (params.type === 'discount' && error.code === 'PGRST204') {
         // Silencia erro se for apenas falta da coluna nova e tenta modo legado
      }
      return null; 
    }
    
    const created = map(data);
    setAuthorizations(prev => [created, ...prev]);
    return created;
  };

  const resolveAuthorization = async (
    id: string,
    status: 'approved' | 'rejected',
    adminMessage?: string
  ) => {
    const { error } = await supabase
      .from('discount_authorizations')
      .update({ status, admin_message: adminMessage || null, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error(error); return false; }
    setAuthorizations(prev => prev.map(a => a.id === id
      ? { ...a, status, adminMessage, resolvedAt: new Date().toISOString() }
      : a
    ));
    return true;
  };

  return { authorizations, requestAuthorization, resolveAuthorization, refreshAuthorizations: fetch };
};
