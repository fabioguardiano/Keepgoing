/**
 * useExchangeRates
 *
 * Busca cotações de USD e EUR em relação ao BRL via proxy server-side
 * (/api/exchange-rates). O proxy evita bloqueios de CSP ao fazer a
 * chamada externa servidor-a-servidor.
 *
 * Atualiza a cada 5 minutos. Em caso de falha, mantém o último valor
 * obtido ou exibe valores padrão realistas.
 */
import { useState, useEffect } from 'react';
import { ExchangeRates } from '../types';

export const useExchangeRates = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 0, eur: 0, lastUpdate: '--:--' });

  useEffect(() => {
    const controller = new AbortController();

    const fetchRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Proxy retornou ${response.status}`);
        }

        const data = await response.json();

        if (data.usd && data.eur) {
          setExchangeRates({
            usd: data.usd,
            eur: data.eur,
            lastUpdate: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.warn('[CurrencyAPI] Falha ao buscar cotação:', error.message);

        // Mantém o último valor carregado; se ainda não há nenhum, usa padrão
        setExchangeRates(prev =>
          prev.usd > 0 ? prev : { usd: 5.15, eur: 5.95, lastUpdate: 'Offline' }
        );
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 300_000); // 5 minutos

    return () => { clearInterval(interval); controller.abort(); };
  }, []);

  return exchangeRates;
};
