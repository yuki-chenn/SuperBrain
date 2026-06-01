export const challengeQueryKeys = {
  all: ['challenges'] as const,
  status: (id: string) => ['challenges', id, 'status'] as const,
};
