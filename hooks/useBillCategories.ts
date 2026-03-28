import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BillCategory } from '../types';
import { up } from '../lib/uppercase';

const DEFAULT_CATEGORIES: Omit<BillCategory, 'companyId' | 'createdAt'>[] = [
  { id: 'dc-fornecedor', name: 'Fornecedor',   color: '#6366F1', nature: 'Variável' },
  { id: 'dc-material',   name: 'Material',     color: '#F59E0B', nature: 'Variável' },
  { id: 'dc-servico',    name: 'Serviço',      color: '#10B981', nature: 'Variável' },
  { id: 'dc-aluguel',    name: 'Aluguel',      color: '#3B82F6', nature: 'Fixa' },
  { id: 'dc-impostos',   name: 'Impostos',     color: '#EF4444', nature: 'Fixa' },
  { id: 'dc-salario',    name: 'Salário',      color: '#8B5CF6', nature: 'Fixa' },
  { id: 'dc-utilities',  name: 'Contas Fixas', color: '#14B8A6', nature: 'Fixa' },
  { id: 'dc-software',   name: 'Software/TI',  color: '#0EA5E9', nature: 'Fixa' },
  { id: 'dc-marketing',  name: 'Marketing',    color: '#F97316', nature: 'Variável' },
  { id: 'dc-outros',     name: 'Outros',       color: '#6B7280', nature: 'Variável' },
];

const mapRow = (r: any): BillCategory => ({
  id: r.id,
  name: r.name,
  color: r.color,
  nature: r.nature,
  companyId: r.company_id,
  createdAt: r.created_at,
});

export const useBillCategories = (companyId?: string) => {
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [useDefaults, setUseDefaults] = useState(false);

  const fetchCategories = async () => {
    if (!companyId) { setLoadingCats(false); return; }
    setLoadingCats(true);
    try {
      const { data, error } = await supabase
        .from('bill_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      if (data && data.length > 0) {
        setCategories(data.map(mapRow));
        setUseDefaults(false);
      } else {
        // Seed defaults into Supabase on first load
        const toInsert = DEFAULT_CATEGORIES.map(c => ({
          company_id: companyId, name: c.name, color: c.color, nature: c.nature,
        }));
        const { data: inserted } = await supabase.from('bill_categories').insert(toInsert).select();
        if (inserted) setCategories(inserted.map(mapRow));
        else {
          setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, companyId, createdAt: '' })));
          setUseDefaults(true);
        }
      }
    } catch {
      setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, companyId, createdAt: '' })));
      setUseDefaults(true);
    } finally {
      setLoadingCats(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [companyId]);

  const saveCategory = async (cat: { id?: string; name: string; color: string; nature: 'Fixa' | 'Variável' }) => {
    if (!companyId || useDefaults) return;
    if (cat.id && !cat.id.startsWith('dc-')) {
      await supabase.from('bill_categories')
        .update({ name: up(cat.name), color: cat.color, nature: cat.nature })
        .eq('id', cat.id).eq('company_id', companyId);
    } else {
      await supabase.from('bill_categories')
        .insert({ company_id: companyId, name: up(cat.name), color: cat.color, nature: cat.nature });
    }
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!companyId || useDefaults || id.startsWith('dc-')) return;
    await supabase.from('bill_categories').delete().eq('id', id).eq('company_id', companyId);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return { categories, loadingCats, saveCategory, deleteCategory, refreshCategories: fetchCategories };
};
