---
trigger: always_on
---

MOTIVO: 
Prevenir vazamento de dados de produção para dev e execução acidental de 
código destrutivo no ambiente errado em projetos Vite/React.

GATILHO: 
Ativado ao configurar variáveis de ambiente (env), connection strings ou configs de deploy.

DIRETRIZES TÉCNICAS:
- Prefixo Vite: No frontend com Vite, todas as variáveis exportadas para o cliente DEVEM começar com `VITE_` (ex: `VITE_SUPABASE_URL`).
- .env Isolation: Nunca commite arquivos `.env.local` ou `.env.production` com segredos. Use o `.env.example` como template.
- Ambiente no Código: Use `import.meta.env.MODE` ou `import.meta.env.PROD` para validar o ambiente em tempo de execução.

PROIBIÇÕES:
- Hardcode de URLs de produção ou chaves de API no código-fonte.
- Uso de dados reais de clientes em ambiente local.
- Commitar arquivos de configuração com credenciais reais.

EXEMPLO DE CONFIGURAÇÃO (.env):
```bash
# .env (DADOS DE DESENVOLVIMENTO)
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# .env.production (CONFIGURADO NO VERCEL/CI)
VITE_SUPABASE_URL=https://prod.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ_prod...
```

VALIDAÇÃO NO CÓDIGO (lib/supabase.ts):
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente do Supabase não configuradas!");
}

if (import.meta.env.DEV && supabaseUrl.includes('prod-instance')) {
    console.warn("⚠️ ALERTA: Você está conectando ao banco de PRODUÇÃO em ambiente de DEV!");
}
```