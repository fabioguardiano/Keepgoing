import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://keepgoing.vercel.app',
  'https://keepgoing-git-main-fabios-projects-289e67c2.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function setCORSHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Simple in-memory rate limiter: max 20 requests per user per 60s
const rateLimitMap = new Map(); // userId -> { count, resetAt }
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  setCORSHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── Verificar variáveis de ambiente ─────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!anthropicKey) {
    return res.status(500).json({ error: 'Serviço de IA não configurado.' });
  }

  // ── Autenticar sessão do chamador ────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  // ── Rate limiting por usuário ────────────────────────────────────────────────
  if (!checkRateLimit(user.id)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde um momento.' });
  }

  // ── Validar body ─────────────────────────────────────────────────────────────
  const { messages, system, max_tokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Parâmetro messages inválido.' });
  }
  if (messages.length > 40) {
    return res.status(400).json({ error: 'Histórico de mensagens muito longo.' });
  }

  // Sanitizar mensagens — aceitar apenas role+content string
  const sanitizedMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, 4000),
  }));

  const sanitizedSystem = system ? String(system).slice(0, 2000) : undefined;
  const safeMaxTokens = Math.min(Math.max(parseInt(max_tokens) || 1024, 1), 2048);

  // ── Chamar API Anthropic (server-side) ───────────────────────────────────────
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: safeMaxTokens,
        system: sanitizedSystem,
        messages: sanitizedMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Erro ${anthropicRes.status}`;
      // Não expor detalhes internos da Anthropic ao cliente
      const clientMsg = anthropicRes.status === 429
        ? 'Serviço temporariamente sobrecarregado. Tente novamente.'
        : 'Erro ao processar resposta da IA.';
      console.error('[/api/chat] Anthropic error:', msg);
      return res.status(502).json({ error: clientMsg });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text || '';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[/api/chat] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar requisição.' });
  }
}
