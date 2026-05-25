import { Currency, OrderStatus } from './types';

export const CURRENCIES: Currency[] = ['CUP', 'MLC', 'USD', 'EUR'];

export const ORDER_STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'confirmed', label: 'Confirmado', color: 'bg-blue-500' },
  { value: 'delivered', label: 'Entregado', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-500' },
];

export const DEFAULT_SETTINGS = {
  name: 'PaTí Mercado Local',
  phone: '+53 50000000',
  address: 'Cuba',
  cupPaymentInstructions: 'Transferencia por Transfermóvil o Enzona.',
  mlcPaymentInstructions: 'Transferencia a tarjeta MLC.',
  exchangeRate: 350,
};
