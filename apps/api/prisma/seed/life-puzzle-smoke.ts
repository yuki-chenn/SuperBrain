/* eslint-disable */
// Dry-run smoke test for life-puzzle-generator. Run with:
//   cd apps/api && npx tsx prisma/seed/life-puzzle-smoke.ts
// Verifies each difficulty bucket can produce 5 puzzles within budget.
import { generateValidLifePuzzle } from './life-puzzle-generator';

const targetsByDifficulty: Record<string, number> = { easy: 1, normal: 2, hard: 3 };

async function main() {
  for (const diff of ['easy', 'normal', 'hard']) {
    const t0 = Date.now();
    const gens: number[] = [];
    let failures = 0;
    for (let i = 0; i < 5; i++) {
      const p = generateValidLifePuzzle(`smoke-${diff}-${i}`, diff, targetsByDifficulty[diff]);
      if (p) {
        gens.push(p.stableGeneration);
      } else {
        failures += 1;
      }
    }
    const dt = Date.now() - t0;
    console.log(`${diff.padEnd(7)} (${dt}ms): ${gens.length}/${gens.length + failures} ok, gens=[${gens.join(', ')}]`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
