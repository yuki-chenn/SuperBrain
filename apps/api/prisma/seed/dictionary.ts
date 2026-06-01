import type { PrismaClient } from '@prisma/client';
import { COMBO_DATA, RADICAL_DATA, ROOT_DATA } from './pcb-data';

export async function seedDictionary(prisma: PrismaClient): Promise<void> {
  for (const r of RADICAL_DATA) {
    await prisma.characterRadical.upsert({
      where: { key: r.key },
      update: { glyph: r.glyph, label: r.label, category: r.category, enabled: true },
      create: r,
    });
  }
  console.log(`   ${RADICAL_DATA.length} radicals`);

  for (const r of ROOT_DATA) {
    await prisma.characterRoot.upsert({
      where: { key: r.key },
      update: { glyph: r.glyph, complexityLevel: r.complexityLevel, enabled: true },
      create: r,
    });
  }
  console.log(`   ${ROOT_DATA.length} roots`);

  const radicalByKey = new Map(
    (await prisma.characterRadical.findMany()).map((r) => [r.key, r]),
  );
  const rootByKey = new Map(
    (await prisma.characterRoot.findMany()).map((r) => [r.key, r]),
  );

  let comboCount = 0;
  const allowedTriples = new Set<string>();
  for (const c of COMBO_DATA) {
    const radical = radicalByKey.get(c.radicalKey);
    const root = rootByKey.get(c.rootKey);
    if (!radical || !root) continue;

    const tripleKey = `${radical.id}|${root.id}|${c.resultChar}`;
    allowedTriples.add(tripleKey);

    await prisma.characterCombination.upsert({
      where: {
        radicalId_rootId_resultChar: {
          radicalId: radical.id,
          rootId: root.id,
          resultChar: c.resultChar,
        },
      },
      update: {
        pinyin: c.pinyin,
        structure: c.structure,
        difficulty: c.difficulty,
        frequencyLevel: c.frequencyLevel,
        enabled: true,
      },
      create: {
        radicalId: radical.id,
        rootId: root.id,
        resultChar: c.resultChar,
        pinyin: c.pinyin,
        structure: c.structure,
        difficulty: c.difficulty,
        frequencyLevel: c.frequencyLevel,
      },
    });
    comboCount++;
  }

  // Disable stale combinations (keep row for historical references).
  const all = await prisma.characterCombination.findMany({ where: { enabled: true } });
  let disabled = 0;
  for (const row of all) {
    const tripleKey = `${row.radicalId}|${row.rootId}|${row.resultChar}`;
    if (!allowedTriples.has(tripleKey)) {
      await prisma.characterCombination.update({ where: { id: row.id }, data: { enabled: false } });
      disabled++;
    }
  }
  console.log(`   ${comboCount} combinations active, ${disabled} disabled`);
}
