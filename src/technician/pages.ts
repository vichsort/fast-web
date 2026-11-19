// Telas do técnico num pedaço só do build, com a fila, o Dexie e as fotos: as rotas (routes.tsx) carregam daqui sob
// demanda, então o escritório e o login não baixam o código offline. Sem sinal, o pedaço vem do precache do worker.
export { ExecutionPage } from './execution-page';
export { TechnicianLayout } from './layout';
export { OrderDetailPage } from './order-detail-page';
export { OrdersPage } from './orders-page';
export { PendingPage } from './pending-page';
export { ProfilePage } from './profile-page';
export { SupplementPage } from './supplement-page';
