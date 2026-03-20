---
trigger: always_on
---

MOTIVO: 
Garantir que as interações com o banco de dados (Supabase) e as estruturas de dados sejam previsíveis e consistentes.

GATILHO: 
Ativado ao criar funções na pasta `lib`, `hooks` ou ao manipular tabelas do Supabase.

CONVENÇÕES DE NOMENCLATURA:
No frontend/Supabase, devemos seguir o padrão de recursos:

| Ação       | Nome da Função          | Objetivo                          |
|------------|-------------------------|-----------------------------------|
| Listar     | `fetch[Resources]`      | Retorna array de objetos          |
| Detalhe    | `get[Resource]ById`     | Retorna um único objeto           |
| Criar      | `create[Resource]`      | Insere novo registro              |
| Atualizar  | `update[Resource]`      | Atualiza campos específicos       |
| Deletar    | `delete[Resource]`      | Remove ou inativa um registro     |

PADRÃO DE RESPOSTA (SERVIÇOS):
Todas as funções de serviço/lib devem retornar um padrão consistente ou lançar erros claros.

```typescript
// Exemplo de padrão esperado para funções na pasta lib/
async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*');
  if (error) throw new Error(error.message);
  return data;
}
```

EXEMPLO ERRADO:
```typescript
// nomes misturados e sem padrão
const PegarDados = () => { ... }
const save_user = (u) => { ... }
const deletar = (id) => { ... }
```

EXEMPLO CORRETO:
```typescript
// Nomes em inglês (ou português consistente), seguindo o recurso
export const fetchOrders = async () => { ... }
export const createOrder = async (order: NewOrder) => { ... }
export const updateOrder = async (id: string, updates: Partial<Order>) => { ... }
export const deleteOrder = async (id: string) => { ... }
```