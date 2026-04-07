/**
 * GET /api/exchange-rates
 *
 * Proxy server-side para buscar cotações USD/EUR -> BRL.
 * Evita bloqueios de CSP no cliente ao centralizar a chamada no servidor.
 * Cache de 5 minutos via header Cache-Control para reduzir chamadas externas.
 */

const ALLOWED_ORIGINS = [
  'https://keepgoing.vercel.app',
  'https://keepgoing-git-main-fabios-projects-289e67c2.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL';

/** Cache em memória — válido por 5 minutos (mesmo intervalo do hook) */
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

export default async function handler(req, res) {
  setCORSHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Servir do cache se ainda válido
  if (cachedData && Date.now() < cacheExpiresAt) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  try {
    const response = await fetch(AWESOME_API_URL, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`AwesomeAPI retornou ${response.status}`);
    }

    const data = await response.json();

    const usd = data.USDBRL || data['USD-BRL'];
    const eur = data.EURBRL || data['EUR-BRL'];

    if (!usd?.bid || !eur?.bid) {
      throw new Error('Formato de resposta inesperado da AwesomeAPI');
    }

    const result = {
      usd: Number(usd.bid),
      eur: Number(eur.bid),
    };

    // Atualiza cache por 5 minutos
    cachedData = result;
    cacheExpiresAt = Date.now() + 5 * 60 * 1000;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(result);

  } catch (err) {
    console.error('[/api/exchange-rates] Falha ao buscar cotações:', err.message);

    // Retorna cache expirado se disponível, melhor que nada
    if (cachedData) {
      res.setHeader('X-Cache', 'STALE');
      return res.status(200).json(cachedData);
    }

    return res.status(502).json({ error: 'Não foi possível obter cotações no momento.' });
  }
}
