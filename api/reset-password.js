import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Variáveis de ambiente não configuradas.' });
  }

  // ── Verificar sessão do chamador ──────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Não autorizado: token de sessão ausente.' });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !callerUser) {
    return res.status(401).json({ error: 'Não autorizado: sessão inválida ou expirada.' });
  }

  const callerRole = callerUser.user_metadata?.role;
  const isAdmin = callerRole === 'admin';
  const isManager = callerRole === 'manager';

  // ── Validar body ──────────────────────────────────────────────────────────
  const { userId, newPassword, action, email, newEmail, userData } = req.body;

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

  // Criação e troca de email: apenas admin ou manager
  if ((action === 'create' || action === 'update_email') && !isAdmin && !isManager) {
    return res.status(403).json({ error: 'Sem permissão para esta operação.' });
  }

  // Reset de senha: admin/manager podem resetar qualquer um; usuário comum só o próprio
  if (action !== 'create' && action !== 'update_email') {
    const isSelf = callerUser.id === userId;
    if (!isAdmin && !isManager && !isSelf) {
      return res.status(403).json({ error: 'Sem permissão para alterar a senha deste usuário.' });
    }
  }

  // ── Executar operação com service role ────────────────────────────────────
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (action === 'create') {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: userData || {}
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          return res.status(409).json({ error: 'Este e-mail já possui uma conta cadastrada.' });
        }
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true, user: data.user });

    } else if (action === 'update_email') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: newEmail.toLowerCase().trim(),
        email_confirm: true,
      });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true, message: 'Email atualizado' });

    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true, message: 'Senha atualizada' });
    }

  } catch (err) {
    return res.status(500).json({ error: `Erro interno: ${err.message}` });
  }
}
