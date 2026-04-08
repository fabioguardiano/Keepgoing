export interface UnitOption {
  value: string;
  label: string;
  description: string;
}

export const UNITS: UnitOption[] = [
  { value: 'M2',  label: 'm²',  description: 'Metro quadrado' },
  { value: 'ML',  label: 'ML',  description: 'Metro linear' },
  { value: 'UND', label: 'UND', description: 'Unidade' },
  { value: 'KG',  label: 'kg',  description: 'Quilograma' },
  { value: 'CX',  label: 'cx',  description: 'Caixa' },
  { value: 'PC',  label: 'pç',  description: 'Peça' },
  { value: 'LT',  label: 'lt',  description: 'Litro' },
  { value: 'MT',  label: 'mt',  description: 'Metro' },
];

/** Retorna o label de exibição a partir do value */
export const getUnitLabel = (value: string): string => {
  const found = UNITS.find(u => u.value === value.toUpperCase());
  return found ? found.label : value;
};

/** Valor padrão para matérias-primas */
export const DEFAULT_UNIT_MATERIAL = 'M2';

/** Valor padrão para acabamentos / serviços */
export const DEFAULT_UNIT_FINISHING = 'ML';

/** Valor padrão para produtos de revenda */
export const DEFAULT_UNIT_PRODUCT = 'UND';
