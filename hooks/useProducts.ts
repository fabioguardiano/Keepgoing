import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductService } from '../types';

export const useProducts = () => {
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
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
        localStorage.setItem('keepgoing_products', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar produtos do Supabase:', err);
      const saved = localStorage.getItem('keepgoing_products');
      if (saved) setProducts(JSON.parse(saved));
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSaveProduct = async (p: ProductService) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .upsert({
          id: p.id.length > 20 ? p.id : undefined,
          name: p.description,
          category: p.type,
          status: p.status,
          base_price: p.sellingPrice,
          description: p.description,
          image_url: p.imageUrl
        })
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
        const exists = prev.find(x => x.id === p.id || x.id === saved.id);
        if (exists) return prev.map(x => (x.id === p.id || x.id === saved.id) ? saved : x);
        return [saved, ...prev];
      });

      return saved;
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto no banco de dados.');
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
