import type { ClientDetail } from '@/lib/views';

/** O cliente como o detalhe recebe: com o número de O.S. em andamento. */
export type ClientWithOpenOrders = ClientDetail & { open_orders: number };
