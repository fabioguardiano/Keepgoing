---
trigger: always_on
---

MOTIVO: 
Evitar o vazamento de dados entre empresas (a falha de expor UID de outra empresa).

GATILHO: 
Ativado ao criar queries de banco de dados, migrations SQL, ou qualquer codigo 
que acesse dados de usuarios/empresas.

VERIFICACOES OBRIGATORIAS:
- Clausula de Empresa: Toda e qualquer query ao banco de dados DEVE incluir 
  explicitamente .eq('company_id', company_id).
- Origem da Identidade: O company_id nunca deve ser aceito como parametro 
  vindo livremente do frontend (JSON body). Ele deve ser extraido 
  obrigatoriamente do objeto de sessao autenticado (usuario logado no Supabase).
- RLS Enforcer: Ao sugerir novas tabelas em migracoes SQL, inclua sempre 
  ENABLE ROW LEVEL SECURITY com politicas baseadas em auth.uid() ou company_id.

EXEMPLO ERRADO:
```typescript
// Query sem filtro de tenant
const { data } = await supabase.from('orders').select('*');
```

EXEMPLO CORRETO:
```typescript
// Sempre filtrar pelo ID da empresa do usuário logado
const { data: userData } = await supabase.auth.getUser();
const companyId = userData.user?.user_metadata.company_id;

const { data } = await supabase.from('orders')
    .select('*')
    .eq('company_id', companyId);
```

EXEMPLO SQL COM RLS:
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    items JSONB
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON orders
    FOR ALL
    USING (company_id = (auth.jwt()->'user_metadata'->>'company_id')::uuid);
```