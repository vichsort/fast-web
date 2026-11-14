// Tons semânticos: cada valor de enum aponta para um token de src/index.css (--status-*, --priority-*…).
// As classes ficam escritas por extenso para o Tailwind encontrá-las. Trocar a cor de um status é no CSS.

import type { MemberRole, OrderPriority, OrderStatus, ReviewStatus, ServiceType } from '@/lib/enums';
import type { ExecutionAlert, PhotoAlert } from '@/photos/alerts';

/** Tons genéricos (--tone-*). */
export type Tone = 'neutral' | 'muted' | 'brand' | 'info' | 'progress' | 'warning' | 'danger' | 'success';

/** Classe que define --tone; combine com tone-soft, tone-solid, tone-outline, tone-text ou tone-fill. */
export const toneVar: Record<Tone, string> = {
  neutral: '[--tone:var(--tone-neutral)]',
  muted: '[--tone:var(--tone-muted)]',
  brand: '[--tone:var(--tone-brand)]',
  info: '[--tone:var(--tone-info)]',
  progress: '[--tone:var(--tone-progress)]',
  warning: '[--tone:var(--tone-warning)] [--tone-on:var(--tone-contrast-warning)]',
  danger: '[--tone:var(--tone-danger)]',
  success: '[--tone:var(--tone-success)]',
};

export const statusVar: Record<OrderStatus, string> = {
  open: '[--tone:var(--status-open)]',
  in_progress: '[--tone:var(--status-in-progress)]',
  pending_approval: '[--tone:var(--status-pending-approval)] [--tone-on:var(--tone-contrast-warning)]',
  rejected: '[--tone:var(--status-rejected)]',
  approved: '[--tone:var(--status-approved)]',
  cancelled: '[--tone:var(--status-cancelled)]',
};

export const priorityVar: Record<OrderPriority, string> = {
  low: '[--tone:var(--priority-low)]',
  normal: '[--tone:var(--priority-normal)]',
  high: '[--tone:var(--priority-high)] [--tone-on:var(--tone-contrast-warning)]',
  urgent: '[--tone:var(--priority-urgent)]',
};

export const serviceTypeVar: Record<ServiceType, string> = {
  installation: '[--tone:var(--service-installation)]',
  maintenance: '[--tone:var(--service-maintenance)]',
  technical_visit: '[--tone:var(--service-technical-visit)]',
};

export const roleVar: Record<MemberRole, string> = {
  owner: '[--tone:var(--role-owner)]',
  manager: '[--tone:var(--role-manager)]',
  technician: '[--tone:var(--role-technician)]',
};

export const reviewVar: Record<ReviewStatus, string> = {
  pending: '[--tone:var(--review-pending)] [--tone-on:var(--tone-contrast-warning)]',
  approved: '[--tone:var(--review-approved)]',
  rejected: '[--tone:var(--review-rejected)]',
  voided: '[--tone:var(--review-voided)]',
};

export const alertVar: Record<PhotoAlert | ExecutionAlert, string> = {
  gallery_without_exif: '[--tone:var(--alert-gallery-without-exif)] [--tone-on:var(--tone-contrast-warning)]',
  gallery_before_start: '[--tone:var(--alert-gallery-before-start)]',
  submitted_before_rejection:
    '[--tone:var(--alert-submitted-before-rejection)] [--tone-on:var(--tone-contrast-warning)]',
  late_delivery: '[--tone:var(--alert-late-delivery)] [--tone-on:var(--tone-contrast-warning)]',
};

export const flagVar = {
  overdue: '[--tone:var(--overdue)]',
  unassigned: '[--tone:var(--unassigned)] [--tone-on:var(--tone-contrast-warning)]',
  lateSupplement: '[--tone:var(--late-supplement)]',
  new: '[--tone:var(--new-item)]',
} as const;

export const syncVar = {
  ok: '[--tone:var(--sync-ok)]',
  busy: '[--tone:var(--sync-busy)]',
  pending: '[--tone:var(--sync-pending)] [--tone-on:var(--tone-contrast-warning)]',
  offline: '[--tone:var(--sync-offline)]',
  error: '[--tone:var(--sync-error)]',
} as const;
