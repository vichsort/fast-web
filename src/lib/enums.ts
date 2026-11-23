// Enums do banco como tipos e listas na ordem da spec (../fast/docs/spec.md, "Enums"), para selos, filtros e mocks.
import { Constants, type Enums } from '@/lib/database.types';

export type OrderStatus = Enums<'order_status'>;
export type OrderPriority = Enums<'order_priority'>;
export type ServiceType = Enums<'service_type'>;
export type MemberRole = Enums<'member_role'>;
export type ReviewStatus = Enums<'review_status'>;
export type PhotoSource = Enums<'photo_source'>;

export const ORDER_STATUSES = Constants.public.Enums.order_status;
export const ORDER_PRIORITIES = Constants.public.Enums.order_priority;
export const SERVICE_TYPES = Constants.public.Enums.service_type;
export const MEMBER_ROLES = Constants.public.Enums.member_role;
export const REVIEW_STATUSES = Constants.public.Enums.review_status;
export const PHOTO_SOURCES = Constants.public.Enums.photo_source;

/** Status em que a O.S. ainda anda (não `approved` nem `cancelled`). */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = ['open', 'in_progress', 'pending_approval', 'rejected'];

/** Status em que o prazo vencido deixa a O.S. atrasada (03, R6). */
export const OVERDUE_STATUSES: readonly OrderStatus[] = ['open', 'in_progress', 'rejected'];
