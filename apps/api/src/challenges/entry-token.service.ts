import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class EntryTokenService {
  generate(): { rawToken: string; hash: string } {
    const rawToken = randomBytes(32).toString('base64url');
    return { rawToken, hash: this.hash(rawToken) };
  }
  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
