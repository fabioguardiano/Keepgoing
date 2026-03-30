import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'Parâmetros insuficientes' });
  }

  // Busca do Vercel envs
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({ 
      error: 'Para alterar senhas, a chave SUPABASE_SERVICE_ROLE_KEY precisa ser adicionada nas Environment Variables no painel do Vercel.' 
    });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
      user_metadata: { password_reset_date: new Date().toISOString() } // trigger metadata update if needed
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Senha atualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no servidor Vercel' });
  }
}
