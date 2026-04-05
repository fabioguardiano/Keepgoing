import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductService } from '../types';
import { up } from '../lib/uppercase';

export const useProducts = (companyId?: string, logActivity?: any) => {
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchProducts = async () => {
    if (!companyId) { setLoadingProducts(false); return; }
    setLoadingProducts(true);
    try {
      let query = supabase.from('products').select('*');
      query = query.eq('company_id', companyId);

      const { data, error } = await query.order('name');

      if (error) throw error;
      if (data) {
        const mapped = data.map(p => {
          const normalizedCode = /^\d+$/.test(p.code || '') ? p.code.padStart(4, '0') : p.code;
          return {
            ...p,
            code: normalizedCode || '',
            description: p.name || '',
            type: p.category,
            group: p.product_group || '',
            unit: p.unit || 'UN',
            stockBalance: p.stock_balance ?? 0,
            minStock: p.min_stock ?? 0,
            unitCost: p.unit_cost ?? 0,
            freight: p.freight ?? 0,
            lossPercentage: p.loss_percentage ?? 0,
            taxPercentage: p.tax_percentage ?? 0,
            profitMargin: p.profit_margin ?? 0,
            commissionPercentage: p.commission_percentage ?? 0,
            discountPercentage: p.discount_percentage ?? 0,
            suggestedPrice: p.suggested_price ?? 0,
            sellingPrice: p.base_price ?? 0,
            brand: p.brand || '',
            manufacturerNumber: p.manufacturer_number || '',
            nfeData: p.nfe_data || null,
            imageUrl: p.image_url || '',
          };
        });
        setProducts(mapped as ProductService[]);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos do Supabase:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [companyId]);

  const handleSaveProduct = async (p: ProductService) => {
    const finalCompanyId = companyId || '00000000-0000-0000-0000-000000000000';
    try {
      const payload = {
        id: (p.id && p.id.length > 20) ? p.id : undefined,
        company_id: finalCompanyId,
        name: up(p.description),
        category: p.type,
        status: p.status,
        code: /^\d+$/.test(p.code || '') ? p.code.padStart(4, '0') : p.code,
        product_group: p.group,
        unit: p.unit,
        stock_balance: p.stockBalance,
        min_stock: p.minStock,
        unit_cost: p.unitCost,
        freight: p.freight,
        loss_percentage: p.lossPercentage,
        tax_percentage: p.taxPercentage,
        profit_margin: p.profitMargin,
        commission_percentage: p.commissionPercentage,
        discount_percentage: p.discountPercentage,
        suggested_price: p.suggestedPrice,
        base_price: p.sellingPrice,
        brand: up(p.brand),
        manufacturer_number: up(p.manufacturerNumber),
        nfe_data: p.nfeData,
        description: up(p.description),
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
        description: data.name || '',
        type: data.category,
        code: data.code || '',
        group: data.product_group || '',
        unit: data.unit || 'UN',
        stockBalance: data.stock_balance ?? 0,
        minStock: data.min_stock ?? 0,
        unitCost: data.unit_cost ?? 0,
        freight: data.freight ?? 0,
        lossPercentage: data.loss_percentage ?? 0,
        taxPercentage: data.tax_percentage ?? 0,
        profitMargin: data.profit_margin ?? 0,
        commissionPercentage: data.commission_percentage ?? 0,
        discountPercentage: data.discount_percentage ?? 0,
        suggestedPrice: data.suggested_price ?? 0,
        sellingPrice: data.base_price ?? 0,
        brand: data.brand || '',
        manufacturerNumber: data.manufacturer_number || '',
        nfeData: data.nfe_data || null,
        imageUrl: data.image_url || '',
      } as ProductService;
      
      setProducts(prev => {
        const next = prev.find(x => x.id === p.id || x.id === saved.id)
          ? prev.map(x => (x.id === p.id || x.id === saved.id) ? saved : x)
          : [saved, ...prev];
        return next;
      });

      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto. Verifique sua conexão e tente novamente.');
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
