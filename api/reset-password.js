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
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'VITE_SUPABASE_URL não configurada no Vercel.' });
  }

  if (!serviceRoleKey) {
    return res.status(500).json({ 
      error: 'A chave SUPABASE_SERVICE_ROLE_KEY não foi encontrada. Verifique se o nome está correto e se o Redeploy foi concluído.' 
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
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Senha atualizada' });
  } catch (err) {
    return res.status(500).json({ error: `Erro interno: ${err.message}` });
  }
}
