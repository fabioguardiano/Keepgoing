---
trigger: always_on
---

MOTIVO: 
Garantir que o codigo gerado atenda aos requisitos definidos e nao apenas 
"pareca funcionar".

GATILHO: 
Ativado quando o usuario pedir nova feature, endpoint ou funcao de negocio.

WORKFLOW OBRIGATORIO:
1. Red: Escreva testes que definem o comportamento esperado. 
   Eles DEVEM falhar inicialmente.
2. Green: Implemente o codigo minimo necessario para os testes passarem.
3. Refactor: Melhore a estrutura mantendo os testes verdes.

COBERTURA MINIMA:
- Funcoes de negocio (lib/utils): 80% de cobertura
- Edge cases: null/undefined, array vazio, strings vazias, limites numericos
- Casos de erro: pelo menos 1 teste de excecao por funcao crítica

EXEMPLO COM VITEST/JEST:
```typescript
// 1. PRIMEIRO: Escreva os testes
// utils/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './pricing';

describe('calculateDiscount', () => {
    it('applies valid discount correctly', () => {
        expect(calculateDiscount(100, 10)).toBe(90);
    });
    
    it('throws error for negative inputs', () => {
        expect(() => calculateDiscount(-100, 10)).toThrow();
    });
});

// 2. DEPOIS: Implemente
export const calculateDiscount = (price: number, discount: number) => {
    if (price < 0) throw new Error("Price cannot be negative");
    return price * (1 - discount / 100);
}
```