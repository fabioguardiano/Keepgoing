---
trigger: always_on
---

MOTIVO: 
Garantir que a interface do usuário (UI) nunca trave por operações pesadas ou chamadas de API bloqueantes.

GATILHO: 
Ativado ao criar ou modificar componentes, hooks ou funções em `App.tsx`, `components/` ou `lib/`.

DIRETRIZES TÉCNICAS:
- Async Supabase: Todas as chamadas ao Supabase DEVEM ser assinadas como `async/await` e tratadas sem bloquear o render principal.
- Feedback Visual: Sempre use estados de `loading` (ex: `setLoading(true)`) ao realizar operações assíncronas para informar o usuário.
- Geração de Documentos: Operações pesadas como geração de PDF ou Excel devem ser assíncronas para não travar o clique do botão.
- Evitar Bloqueio do Event Loop: Não use loops infinitos ou processamento pesado síncrono no `render` do React.

EXEMPLO ERRADO:
```typescript
// Fazendo carga pesada síncrona no handler (travando o clique)
const handleExport = () => {
    const data = heavyProcessing(items); // Síncrono e lento!
    generatePDF(data); // Travando a UI até terminar
};
```

EXEMPLO CORRETO:
```typescript
// Usando async e feedback visual
const handleExport = async () => {
    setIsProcessing(true); // Feedback de carregamento
    try {
        await new Promise(resolve => setTimeout(resolve, 0)); // Deixa o loop respirar se necessário
        const data = await heavyProcessingAsync(items);
        await generatePDFAsync(data);
    } finally {
        setIsProcessing(false);
    }
};
```