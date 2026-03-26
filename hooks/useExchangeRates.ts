import { useState, useEffect } from 'react';
import { ExchangeRates } from '../types';

export const useExchangeRates = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 0, eur: 0, lastUpdate: '--:--' });

  useEffect(() => {
    const controller = new AbortController();

    const fetchRates = async () => {
      try {
        const response = await fetch(
          'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL',
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          setExchangeRates({
            usd: Number(data.USDBRL.bid),
            eur: Number(data.EURBRL.bid),
            lastUpdate: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setExchangeRates(prev => prev.usd > 0 ? prev : { usd: 5.70, eur: 6.10, lastUpdate: 'Offline' });
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 300_000); // 5 minutos

    return () => { clearInterval(interval); controller.abort(); };
  }, []);

  return exchangeRates;
};
