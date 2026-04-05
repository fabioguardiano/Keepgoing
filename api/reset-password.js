import { createClient } from '@supabase/supabase-js';

// ── CORS ─────────────────────────────────────────────────────────────────────
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

// ── Rate limiting (in-memory, por user_id) ────────────────────────────────────
const rateLimitMap = new Map(); // userId -> { count, resetAt }
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora

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

// ── Campos permitidos em userData ─────────────────────────────────────────────
const ALLOWED_USER_DATA_KEYS = ['full_name', 'name', 'role', 'company_id', 'avatar_url'];

function sanitizeUserData(raw, callerCompanyId, isAdmin) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  for (const key of ALLOWED_USER_DATA_KEYS) {
    if (key in raw) clean[key] = String(raw[key]).slice(0, 255);
  }
  // Forçar company_id do chamador — impede injeção de outro company_id
  if (!isAdmin && callerCompanyId) {
    clean.company_id = callerCompanyId;
  }
  return clean;
}

// ── Email validation ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Garante tempo mínimo de resposta para evitar timing attack (enumeração de usuários)
const MIN_RESPONSE_MS = 400;

async function withMinDelay(startMs, fn) {
  const result = await fn();
  const elapsed = Date.now() - startMs;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise(r => setTimeout(r, MIN_RESPONSE_MS - elapsed));
  }
  return result;
}

export default async function handler(req, res) {
  const startMs = Date.now();
  setCORSHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Serviço não configurado.' });
  }

  return await withMinDelay(startMs, async () => {
    // ── Autenticar chamador ─────────────────────────────────────────────────
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !callerUser) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // ── Rate limiting ───────────────────────────────────────────────────────
    if (!checkRateLimit(callerUser.id)) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 hora.' });
    }

    const callerRole = callerUser.user_metadata?.role;
    const callerCompanyId = callerUser.user_metadata?.company_id;
    const isAdmin = callerRole === 'admin';
    const isManager = callerRole === 'manager';

    // ── Validar body ────────────────────────────────────────────────────────
    const { userId, newPassword, action, email, newEmail, userData } = req.body || {};

    if (!['reset', 'create', 'update_email'].includes(action)) {
      return res.status(400).json({ error: 'Ação inválida.' });
    }
    if (action === 'reset' && (!userId || !newPassword)) {
      return res.status(400).json({ error: 'Parâmetros insuficientes para reset.' });
    }
    if (action === 'create' && (!email || !newPassword)) {
      return res.status(400).json({ error: 'Parâmetros insuficientes para criação.' });
    }
    if (action === 'update_email' && (!userId || !newEmail)) {
      return res.status(400).json({ error: 'Parâmetros insuficientes para troca de email.' });
    }
    if (newPassword && newPassword.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    if (newEmail && !EMAIL_RE.test(newEmail)) {
      return res.status(400).json({ error: 'Novo e-mail inválido.' });
    }

    // ── Permissões de ação ──────────────────────────────────────────────────
    if ((action === 'create' || action === 'update_email') && !isAdmin && !isManager) {
      return res.status(403).json({ error: 'Sem permissão para esta operação.' });
    }
    if (action === 'reset') {
      const isSelf = callerUser.id === userId;
      if (!isAdmin && !isManager && !isSelf) {
        return res.status(403).json({ error: 'Sem permissão para alterar a senha deste usuário.' });
      }
    }

    // ── Executar operação ───────────────────────────────────────────────────
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Verificar multi-tenancy: o alvo deve pertencer à mesma empresa do chamador
      if ((action === 'reset' || action === 'update_email') && userId && !isAdmin) {
        const { data: targetProfile } = await supabaseAdmin
          .from('app_users')
          .select('company_id')
          .eq('auth_user_id', userId)
          .single();

        if (targetProfile && callerCompanyId && targetProfile.company_id !== callerCompanyId) {
          return res.status(403).json({ error: 'Sem permissão para operar sobre este usuário.' });
        }
      }

      if (action === 'create') {
        const cleanUserData = sanitizeUserData(userData, callerCompanyId, isAdmin);
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password: newPassword,
          email_confirm: true,
          user_metadata: cleanUserData,
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            return res.status(409).json({ error: 'Este e-mail já possui uma conta cadastrada.' });
          }
          return res.status(400).json({ error: 'Erro ao criar usuário.' });
        }
        return res.status(200).json({ success: true, user: { id: data.user.id, email: data.user.email } });

      } else if (action === 'update_email') {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: newEmail.toLowerCase().trim(),
          email_confirm: true,
        });

        if (error) return res.status(400).json({ error: 'Erro ao atualizar e-mail.' });
        return res.status(200).json({ success: true });

      } else {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

        if (error) return res.status(400).json({ error: 'Erro ao atualizar senha.' });
        return res.status(200).json({ success: true });
      }

    } catch (err) {
      console.error('[reset-password] Internal error:', err.message);
      return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
  });
}
