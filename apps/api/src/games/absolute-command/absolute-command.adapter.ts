import { Injectable } from '@nestjs/common';
import type {
  GameAdapter,
  StartAttemptInput,
  StartAttemptResult,
  FinishAttemptInput,
  FinishAttemptResult,
} from '../game-adapter.interface';

@Injectable()
export class AbsoluteCommandAdapter implements GameAdapter {
  slug = 'absolute-command';

  async startAttempt(_input: StartAttemptInput): Promise<StartAttemptResult> {
    // Absolute command uses its own service for starting attempts.
    // The generic AttemptsController should not be used for this game.
    throw new Error('Use the absolute-command specific endpoint to start an attempt');
  }

  async finishAttempt(_input: FinishAttemptInput): Promise<FinishAttemptResult> {
    return {
      valid: false,
      invalidReason: 'USE_COMMAND_SUBMISSION',
    };
  }
}
