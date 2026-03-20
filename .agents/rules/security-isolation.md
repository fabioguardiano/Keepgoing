---
trigger: always_on
---

MOTIVO: 
Garantir que segredos e lógica sensível não sejam expostos no cliente.

GATILHO: 
Ativado ao lidar com chaves de API, autenticação ou permissões.

RESTRICOES:
- Proibicao de Service Role: Nunca use `SUPABASE_SERVICE_ROLE_KEY` no frontend. Use apenas a `ANON_KEY`.
- Lógica de Autorização: Regras de permissão devem ser aplicadas no Banco (via Supabase RLS), não apenas no frontend.
- Sanitização de Input: Sempre valide dados antes de enviar para o Supabase para evitar injeção ou dados corrompidos.

EXEMPLO ERRADO:
```typescript
// No frontend (VULNERÁVEL)
if (user.role === 'admin') {
   await supabase.from('secret_data').select('*');
}
```

EXEMPLO CORRETO:
```sql
-- No Banco de Dados (Supabase RLS)
CREATE POLICY "admin_only" ON secret_data
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );
```