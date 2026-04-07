/**
 * GET /api/exchange-rates
 *
 * Proxy server-side para cotações USD/EUR -> BRL.
 * Tenta múltiplas fontes em cascata para máxima resiliência.
 *
 * Fontes (em ordem de preferência):
 *   1. economia.awesomeapi.com.br  (primária, pode bloquear IPs Vercel)
 *   2. api.frankfurter.app          (ECB - confiável, sem restrição de IP)
 *   3. open.er-api.com              (backup secundário, sem chave necessária)
 */

const ALLOWED_ORIGINS = [
  'https://keepgoing.vercel.app',
  'https://keepgoingtokdeart.vercel.app',
  'https://keepgoing-git-main-fabios-projects-289e67c2.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

/** Cache em memória — válido por 5 minutos */
let cachedData = null;
let cacheExpiresAt = 0;

function setCORSHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Tenta buscar cotação na AwesomeAPI brasileira.
 * @returns {{ usd: number, eur: number }} ou lança erro
 */
async function fetchFromAwesomeApi() {
  const res = await fetch(
    'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL',
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`AwesomeAPI ${res.status}`);
  const data = await res.json();
  const usd = data.USDBRL || data['USD-BRL'];
  const eur = data.EURBRL || data['EUR-BRL'];
  if (!usd?.bid || !eur?.bid) throw new Error('AwesomeAPI: formato inesperado');
  return { usd: Number(usd.bid), eur: Number(eur.bid) };
}

/**
 * Tenta buscar cotação na Frankfurter API (Banco Central Europeu).
 * Endpoint retorna quanto 1 USD/EUR vale em BRL.
 * @returns {{ usd: number, eur: number }} ou lança erro
 */
async function fetchFromFrankfurter() {
  const [resUsd, resEur] = await Promise.all([
    fetch('https://api.frankfurter.app/latest?base=USD&symbols=BRL', { signal: AbortSignal.timeout(5000) }),
    fetch('https://api.frankfurter.app/latest?base=EUR&symbols=BRL', { signal: AbortSignal.timeout(5000) }),
  ]);

  if (!resUsd.ok || !resEur.ok) throw new Error(`Frankfurter ${resUsd.status}/${resEur.status}`);

  const [dataUsd, dataEur] = await Promise.all([resUsd.json(), resEur.json()]);

  const usd = dataUsd?.rates?.BRL;
  const eur = dataEur?.rates?.BRL;
  if (!usd || !eur) throw new Error('Frankfurter: formato inesperado');
  return { usd: Number(usd), eur: Number(eur) };
}

/**
 * Tenta buscar cotação na Open Exchange Rates (sem chave, taxa base USD).
 * @returns {{ usd: number, eur: number }} ou lança erro
 */
async function fetchFromOpenExchangeRates() {
  const res = await fetch(
    'https://open.er-api.com/v6/latest/USD',
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`OpenER ${res.status}`);
  const data = await res.json();
  const usdBrl = data?.rates?.BRL;
  const eurUsd = data?.rates?.EUR;
  if (!usdBrl || !eurUsd) throw new Error('OpenER: formato inesperado');
  // EUR->BRL = (USD->BRL) / (EUR->USD) = usdBrl / eurUsd
  return { usd: Number(usdBrl), eur: Number(usdBrl / eurUsd) };
}

export default async function handler(req, res) {
  setCORSHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  // Servir cache se ainda válido
  if (cachedData && Date.now() < cacheExpiresAt) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  const sources = [
    { name: 'AwesomeAPI', fn: fetchFromAwesomeApi },
    { name: 'Frankfurter', fn: fetchFromFrankfurter },
    { name: 'OpenExchangeRates', fn: fetchFromOpenExchangeRates },
  ];

  for (const source of sources) {
    try {
      const result = await source.fn();

      // Atualiza cache por 5 minutos
      cachedData = result;
      cacheExpiresAt = Date.now() + 5 * 60 * 1000;

      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Source', source.name);
      return res.status(200).json(result);

    } catch (err) {
      console.warn(`[/api/exchange-rates] ${source.name} falhou:`, err.message);
    }
  }

  // Todas as fontes falharam — retorna cache expirado se disponível
  if (cachedData) {
    console.warn('[/api/exchange-rates] Todas as fontes falharam, servindo cache expirado.');
    res.setHeader('X-Cache', 'STALE');
    return res.status(200).json(cachedData);
  }

  return res.status(502).json({ error: 'Não foi possível obter cotações no momento.' });
}
