---
trigger: always_on
---

MOTIVO: 
Evitar o acúmulo de lógica de negócio dentro de componentes (arquivos .tsx gigantes) e facilitar a manutenção.

GATILHO: 
Ativado ao criar novos componentes ou ao modificar o arquivo `App.tsx`.

ESTRUTURA DE CAMADAS:
- Components (/components): Focados estritamente na UI e exibição de dados. Devem receber dados via props sempre que possível.
- Hooks (/hooks): Extração de lógica de estado complexa ou reuso de lógica de API (ex: `useClients`, `useOrders`).
- Services (/lib): Funções puras de interação com o Supabase ou bibliotecas externas (PDF, XLS).
- Utils (/utils): Funções auxiliares sem efeitos colaterais (formatadores de data, formatadores de moeda).

DIRTY CODE ALERTS:
- Se um componente tem mais de 200 linhas de lógica (TS), ele deve ser refatorado.
- Evite "God Components" (como o `App.tsx` atual de 1700 linhas). Toda lógica de dados deve sair dele.

EXEMPLO ERRADO:
```tsx
// App.tsx ou Componente gigante com tudo misturado
const App = () => {
    const [data, setData] = useState();
    useEffect(() => {
        // Chamada direta de API misturada com lógica de negócio complexa
        supabase.from('...').select('*').then(...)
    }, []);
    
    return <div>{...}</div>;
}
```

EXEMPLO CORRETO:
```tsx
// hooks/useOrders.ts
export const useOrders = () => {
    const [orders, setOrders] = useState([]);
    useEffect(() => {
        fetchOrders().then(setOrders); // Lógica de API isolada no service
    }, []);
    return orders;
}

// components/OrdersView.tsx
const OrdersView = () => {
    const orders = useOrders(); // Consome o hook
    return <OrderList data={orders} />;
}
```