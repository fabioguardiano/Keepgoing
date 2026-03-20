import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductService } from '../types';

export const useProducts = (companyId?: string, logActivity?: any) => {
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      let query = supabase.from('products').select('*');
      
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query.order('name');
      
      if (error) throw error;
      if (data) {
        const mapped = data.map(p => ({
          ...p,
          description: p.name,
          type: p.category,
          sellingPrice: p.base_price,
          imageUrl: p.image_url
        }));
        setProducts(mapped as ProductService[]);
        localStorage.setItem(`marmo_products_${companyId || 'legacy'}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar produtos do Supabase:', err);
      const saved = localStorage.getItem(`marmo_products_${companyId || 'legacy'}`);
      if (saved) setProducts(JSON.parse(saved));
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [companyId]);

  const handleSaveProduct = async (p: ProductService) => {
    const finalCompanyId = companyId || '123';
    try {
      const payload = {
        id: (p.id && p.id.length > 20) ? p.id : undefined,
        company_id: finalCompanyId,
        name: p.description,
        category: p.type,
        status: p.status,
        base_price: p.sellingPrice,
        description: p.description,
        image_url: p.imageUrl
      };

      const { data, error } = await supabase
        .from('products')
        .upsert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      const saved = { 
        ...data, 
        description: data.name, 
        type: data.category, 
        sellingPrice: data.base_price, 
        imageUrl: data.image_url 
      } as ProductService;
      
      setProducts(prev => {
        const next = prev.find(x => x.id === p.id || x.id === saved.id)
          ? prev.map(x => (x.id === p.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        localStorage.setItem(`marmo_products_${finalCompanyId}`, JSON.stringify(next));
        return next;
      });

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      alert(`Erro ao salvar no banco de dados: ${err.message || 'Verifique sua conexão e permissões RLS.'}`);
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar produto:', error);
      alert('Erro ao deletar produto no banco de dados.');
      throw error;
    }
    setProducts(prev => prev.filter(x => x.id !== id));
  };

  return { 
    products, 
    loadingProducts, 
    handleSaveProduct, 
    deleteProduct,
    setProducts,
    refreshProducts: fetchProducts 
  };
};
