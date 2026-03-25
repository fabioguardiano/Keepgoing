import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DiscountAuthorization } from '../types';

const map = (r: any): DiscountAuthorization => ({
  id: r.id,
  companyId: r.company_id,
  saleId: r.sale_id,
  saleOrderNumber: r.sale_order_number,
  clientName: r.client_name,
  sellerId: r.seller_id,
  sellerName: r.seller_name,
  requestedDiscountPct: Number(r.requested_discount_pct),
  maxDiscountPct: Number(r.max_discount_pct),
  adminId: r.admin_id,
  adminName: r.admin_name,
  status: r.status,
  adminMessage: r.admin_message,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

export const useDiscountAuthorizations = (companyId?: string) => {
  const [authorizations, setAuthorizations] = useState<DiscountAuthorization[]>([]);

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

  useEffect(() => { fetch(); }, [companyId]);

  const requestAuthorization = async (params: {
    saleId?: string;
    saleOrderNumber?: number;
    clientName?: string;
    sellerId: string;
    sellerName: string;
    requestedDiscountPct: number;
    maxDiscountPct: number;
    adminId: string;
    adminName: string;
  }): Promise<DiscountAuthorization | null> => {
    if (!companyId) return null;
    const { data, error } = await supabase
      .from('discount_authorizations')
      .insert({
        company_id: companyId,
        sale_id: params.saleId || null,
        sale_order_number: params.saleOrderNumber || null,
        client_name: params.clientName || null,
        seller_id: params.sellerId,
        seller_name: params.sellerName,
        requested_discount_pct: params.requestedDiscountPct,
        max_discount_pct: params.maxDiscountPct,
        admin_id: params.adminId,
        admin_name: params.adminName,
        status: 'pending',
      })
      .select()
      .single();
    if (error) { console.error(error); return null; }
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
