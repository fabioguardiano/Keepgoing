import { useState, useEffect } from 'react';
import { ExchangeRates } from '../types';

export const useExchangeRates = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 0, eur: 0, lastUpdate: '--:--' });

  useEffect(() => {
    const controller = new AbortController();

    const fetchRates = async () => {
      const urls = [
        'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL',
        'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL'
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            // Suporta formatos diferentes (alguns endpoints retornam chaves com hífen ou sem)
            const usd = data.USDBRL || data['USD-BRL'] || data.USD;
            const eur = data.EURBRL || data['EUR-BRL'] || data.EUR;

            if (usd?.bid && eur?.bid) {
              setExchangeRates({
                usd: Number(usd.bid),
                eur: Number(eur.bid),
                lastUpdate: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              });
              return; // Sucesso, encerra tentativas
            }
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') return;
          console.warn(`[CurrencyAPI] Falha ao buscar cotação de ${url}:`, error.message);
        }
      }

      // Se todas as tentativas falharem, exibe os novos defaults realistas
      setExchangeRates(prev => prev.usd > 0 ? prev : { 
        usd: 5.15, 
        eur: 5.95, 
        lastUpdate: 'Offline' 
      });
    };

    fetchRates();
    const interval = setInterval(fetchRates, 300_000); // 5 minutos

    return () => { clearInterval(interval); controller.abort(); };
  }, []);

  return exchangeRates;
};
