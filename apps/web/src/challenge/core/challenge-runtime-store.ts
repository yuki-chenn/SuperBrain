import { create } from 'zustand';
import { initialChallengeState, type ChallengeRuntimeState } from './challenge-types';

interface ChallengeRuntimeStore extends ChallengeRuntimeState {
  set: (patch: Partial<ChallengeRuntimeState>) => void;
  reset: () => void;
}

export const useChallengeRuntimeStore = create<ChallengeRuntimeStore>((set) => ({
  ...initialChallengeState,
  set: (patch) => set(patch),
  reset: () => set({ ...initialChallengeState }),
}));
