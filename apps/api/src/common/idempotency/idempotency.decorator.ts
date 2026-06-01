import { SetMetadata } from '@nestjs/common';
export const IDEMPOTENCY_REQUIRED_KEY = 'idempotency:required';
export const RequireIdempotency = () => SetMetadata(IDEMPOTENCY_REQUIRED_KEY, true);
