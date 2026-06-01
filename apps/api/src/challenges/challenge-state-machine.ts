import type { AttemptStatus } from '@prisma/client';

export type TransitionVerb =
  | 'CLAIM' | 'START_PLAYING' | 'PAUSE' | 'RESUME' | 'SUBMIT'
  | 'VERIFY_SUCCESS' | 'VERIFY_INVALID' | 'ABANDON' | 'TIMEOUT'
  | 'INTERRUPT' | 'INVALIDATE' | 'REQUEST_REVIEW' | 'REVOKE'
  | 'ADMIN_CORRECT';

export const LEGAL_TRANSITIONS: Readonly<Record<TransitionVerb, { from: AttemptStatus[]; to: AttemptStatus }>> = {
  CLAIM:           { from: ['CREATED'],                          to: 'CLAIMED' },
  START_PLAYING:   { from: ['CLAIMED'],                          to: 'PLAYING' },
  PAUSE:           { from: ['PLAYING'],                          to: 'PAUSED' },
  RESUME:          { from: ['PAUSED'],                           to: 'PLAYING' },
  SUBMIT:          { from: ['PLAYING'],                          to: 'SUBMITTING' },
  VERIFY_SUCCESS:  { from: ['SUBMITTING'],                       to: 'COMPLETED' },
  VERIFY_INVALID:  { from: ['SUBMITTING'],                       to: 'COMPLETED' },
  ABANDON:         { from: ['CREATED', 'CLAIMED', 'PLAYING', 'PAUSED'], to: 'ABANDONED' },
  TIMEOUT:         { from: ['CREATED', 'CLAIMED', 'PLAYING', 'PAUSED', 'SUBMITTING'], to: 'TIMEOUT' },
  INTERRUPT:       { from: ['CLAIMED', 'PLAYING', 'PAUSED', 'SUBMITTING'], to: 'INTERRUPTED' },
  INVALIDATE:      { from: ['CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING'], to: 'INVALIDATED' },
  REQUEST_REVIEW:  { from: ['SUBMITTING', 'COMPLETED'],          to: 'REVIEW_REQUIRED' },
  REVOKE:          { from: ['COMPLETED', 'REVIEW_REQUIRED'],     to: 'REVOKED' },
  ADMIN_CORRECT:   { from: ['REVIEW_REQUIRED'],                  to: 'ADMIN_CORRECTED' },
};

export const TERMINAL_STATUSES: AttemptStatus[] = [
  'COMPLETED', 'ABANDONED', 'TIMEOUT', 'INTERRUPTED', 'INVALIDATED',
  'REVOKED', 'ADMIN_CORRECTED',
];

export function isTerminal(status: AttemptStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: AttemptStatus, verb: TransitionVerb): boolean {
  return LEGAL_TRANSITIONS[verb].from.includes(from);
}

export function targetStatus(verb: TransitionVerb): AttemptStatus {
  return LEGAL_TRANSITIONS[verb].to;
}
