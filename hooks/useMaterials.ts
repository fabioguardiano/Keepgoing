import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Material } from '../types';

export const useMaterials = (companyId?: string, logActivity?: (action: any, details: string, referenceId?: string, orderNumber?: string) => Promise<void>) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const fetchMaterials = async () => {
    if (!companyId) return;
    setLoadingMaterials(true);
    try {
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      
      if (materialsError) throw materialsError;
      if (materialsData) {
        const mappedMaterials = materialsData.map(m => ({
          ...m,
          unitCost: m.unit_cost,
          minStock: m.min_stock,
          stockQuantity: m.stock_quantity,
          registrationDate: m.registration_date,
          freightCost: m.freight_cost,
          taxPercentage: m.tax_percentage,
          lossPercentage: m.loss_percentage,
          profitMargin: m.profit_margin,
          commissionPercentage: m.commission_percentage,
          discountPercentage: m.discount_percentage,
          suggestedPrice: m.suggested_price,
          sellingPrice: m.selling_price,
          dolarRate: m.dolar_rate,
          euroRate: m.euro_rate,
          priceHistory: m.price_history,
          imageUrl: m.image_url,
          stockLocation: m.inventory_location,
          m2PerUnit: m.m2_per_unit
        }));
        setMaterials(mappedMaterials as Material[]);
        localStorage.setItem(`marmo_materials_${companyId}`, JSON.stringify(mappedMaterials));
      }
    } catch (err) {
      console.error('Erro ao carregar materiais do Supabase:', err);
      const saved = localStorage.getItem(`marmo_materials_${companyId}`);
      if (saved) setMaterials(JSON.parse(saved));
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [companyId]);

  const handleSaveMaterial = async (m: Material) => {
    if (!companyId) return;
    try {
      const payload = {
        id: m.id.length > 20 ? m.id : undefined,
        company_id: companyId,
        code: m.code,
        name: m.name,
        type: m.type,
        status: m.status,
        unit_cost: m.unitCost,
        unit: m.unit,
        min_stock: m.minStock,
        stock_quantity: m.stockQuantity,
        registration_date: m.registrationDate,
        brand: m.brand,
        supplier: m.supplier,
        difal: m.difal,
        freight_cost: m.freightCost,
        tax_percentage: m.taxPercentage,
        loss_percentage: m.lossPercentage,
        profit_margin: m.profitMargin,
        commission_percentage: m.commissionPercentage,
        discount_percentage: m.discountPercentage,
        suggested_price: m.suggestedPrice,
        selling_price: m.sellingPrice,
        currency: m.currency,
        dolar_rate: m.dolarRate,
        euro_rate: m.euroRate,
        bcfp: m.bcfp,
        thickness: m.thickness,
        weight: m.weight,
        m2_per_unit: m.m2PerUnit,
        inventory_location: m.stockLocation,
        price_history: m.priceHistory,
        image_url: m.imageUrl
      };

      const { data, error } = await supabase
        .from('materials')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      
      const savedRow = data as any;
      const savedMaterial = {
        ...savedRow,
        unitCost: savedRow.unit_cost,
        minStock: savedRow.min_stock,
        stockQuantity: savedRow.stock_quantity,
        registrationDate: savedRow.registration_date,
        freightCost: savedRow.freight_cost,
        taxPercentage: savedRow.tax_percentage,
        lossPercentage: savedRow.loss_percentage,
        profitMargin: savedRow.profit_margin,
        commissionPercentage: savedRow.commission_percentage,
        discountPercentage: savedRow.discount_percentage,
        suggestedPrice: savedRow.suggested_price,
        sellingPrice: savedRow.selling_price,
        dolarRate: savedRow.dolar_rate,
        euroRate: savedRow.euro_rate,
        priceHistory: savedRow.price_history,
        imageUrl: savedRow.image_url,
        stockLocation: savedRow.inventory_location,
        m2PerUnit: savedRow.m2_per_unit
      } as Material;

      const isUpdate = materials.some(x => x.id === m.id || x.id === savedMaterial.id);
      
      setMaterials(prev => {
        const next = prev.find(x => x.id === m.id || x.id === savedMaterial.id)
          ? prev.map(x => (x.id === m.id || x.id === savedMaterial.id) ? savedMaterial : x)
          : [savedMaterial, ...prev];
        localStorage.setItem(`marmo_materials_${companyId}`, JSON.stringify(next));
        return next;
      });
      
      if (logActivity) {
        await logActivity(
          isUpdate ? 'update' : 'create',
          `${isUpdate ? 'Atualizou' : 'Cadastrou'} material: ${m.name}`,
          savedMaterial.id,
          m.code
        );
      }

      return savedMaterial;
    } catch (err) {
      console.error('Erro ao salvar material:', err);
      alert('Erro ao salvar no banco de dados. Verifique sua conexão e permissões.');
      throw err;
    }
  };


  const deleteMaterial = async (id: string) => {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar material:', error);
      alert('Erro ao deletar material no banco de dados.');
      throw error;
    }
    setMaterials(prev => prev.filter(x => x.id !== id));
  };

  return { 
    materials, 
    loadingMaterials, 
    handleSaveMaterial, 
    deleteMaterial,
    setMaterials, 
    refreshMaterials: fetchMaterials 
  };
};
