import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DriverStatus, AppUser } from '../types';

/**
 * Hook para gerenciar o rastreamento em tempo real de motoristas.
 * 
 * Este hook faz duas coisas principais:
 * 1. Inscreve-se em mudanças na tabela 'driver_locations' para exibir motoristas no mapa.
 * 2. Fornece uma função para reportar a localização atual (caso o usuário seja um motorista).
 */
export const useDriverTracking = (companyId: string | undefined, user: AppUser | null) => {
  const [driverLocations, setDriverLocations] = useState<Record<string, DriverStatus>>({});

  // 1. Ouvir atualizações de localização de todos os motoristas em tempo real
  useEffect(() => {
    if (!companyId) return;

    // Busca inicial de quem está online
    const fetchInitialLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_online', true);

        if (data && !error) {
          const locations: Record<string, DriverStatus> = {};
          data.forEach(loc => {
            locations[loc.driver_name] = {
              lat: Number(loc.lat),
              lng: Number(loc.lng),
              lastUpdate: new Date(loc.last_update).toLocaleTimeString('pt-BR'),
              isOnline: true
            };
          });
          setDriverLocations(locations);
        }
      } catch (err) {
        console.error('Erro ao carregar localizações iniciais:', err);
      }
    };

    fetchInitialLocations();

    // Inscrever para mudanças em tempo real (Realtime)
    const channel = supabase
      .channel(`driver-tracking-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newLoc = payload.new as any;
          const oldLoc = payload.old as any;

          if (payload.eventType === 'DELETE') {
             // Se deletado, remove do mapa
             setDriverLocations(prev => {
                const next = { ...prev };
                // Notamos que o payload de DELETE pode não ter o driver_name se não for selecionado,
                // mas aqui assumimos que temos o ID ou limpamos tudo se necessário.
                return next; 
             });
             fetchInitialLocations(); // Recarrega para garantir
             return;
          }

          if (newLoc.is_online) {
            setDriverLocations(prev => ({
              ...prev,
              [newLoc.driver_name]: {
                lat: Number(newLoc.lat),
                lng: Number(newLoc.lng),
                lastUpdate: new Date(newLoc.last_update).toLocaleTimeString('pt-BR'),
                isOnline: true
              }
            }));
          } else {
            setDriverLocations(prev => {
              const next = { ...prev };
              delete next[newLoc.driver_name];
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  /**
   * Reporta a localização do usuário atual para o banco de dados.
   * Usado principalmente por motoristas em dispositivos móveis.
   */
  const reportLocation = useCallback(async (lat: number, lng: number) => {
    if (!companyId || !user) return;
    
    // Verificamos se o cargo (role) é de motorista ou medidor
    const isTracker = user.role === 'driver' || ['motorista', 'medidor'].includes((user as any).position?.toLowerCase());
    if (!isTracker) return;

    try {
      const { error } = await supabase
        .from('driver_locations')
        .upsert({
          company_id: companyId,
          driver_name: user.name,
          lat,
          lng,
          last_update: new Date().toISOString(),
          is_online: true
        }, { onConflict: 'company_id,driver_name' });

      if (error) console.error('Erro ao reportar localização ao Supabase:', error);
    } catch (err) {
      console.error('Falha de rede ao reportar localização:', err);
    }
  }, [companyId, user]);

  /**
   * Marca o motorista como offline (ex: ao fechar o app ou finalizar rota)
   */
  const setOffline = useCallback(async () => {
    if (!companyId || !user) return;

    try {
      await supabase
        .from('driver_locations')
        .update({ is_online: false, last_update: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('driver_name', user.name);
    } catch (err) {
      console.error('Erro ao marcar motorista como offline:', err);
    }
  }, [companyId, user]);

  return { driverLocations, reportLocation, setOffline };
};
