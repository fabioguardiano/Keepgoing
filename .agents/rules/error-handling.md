---
trigger: always_on
---

MOTIVO: 
Evitar debugging às cegas por falta de stack trace ou mensagens genéricas.

GATILHO: 
Ativado ao criar ou modificar blocos try/catch, handlers de erro em hooks ou services.

PRINCÍPIOS OBRIGATÓRIOS:
- Zero Swallow: Nunca capture exceções sem logar ou tratar. `catch(e) {}` vazio é proibido.
- Logs Informativos: Use `console.error` ou um serviço de monitoramento com contexto (ex: o ID do recurso sendo processado).
- Feedback ao Usuário: Em componentes UI, erros devem resultar em um feedback visual (Toast, Alert) e não apenas silêncio.
- Fallback Graceful: Sempre que possível, forneça um estado padrão quando uma operação falhar.

EXEMPLO ERRADO:
```typescript
async function saveData(data: any) {
  try {
    await supabase.from('table').insert(data);
  } catch (e) {
    // Erro silencioso!
  }
}
```

EXEMPLO CORRETO:
```typescript
import { showToast } from './lib/notifications';

async function saveData(data: any) {
  try {
    const { error } = await supabase.from('table').insert(data);
    if (error) throw error;
    showToast('Sucesso!', 'success');
  } catch (e: any) {
    console.error('[SaveDataError]', { data, error: e });
    showToast(`Erro ao salvar: ${e.message}`, 'error');
  }
}
```