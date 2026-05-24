import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

type AlignmentChunk = {
  graphemes: string;
  phonemes_arpabet: string[];
  phonemes_ipa: string[];
};

type AlignmentRecord = {
  word: string;
  variant: number;
  alignment: AlignmentChunk[];
  confidence: 'high' | 'medium' | 'low';
};

type SubtlexRecord = {
  word: string;
  freq_count: number;
};

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'phonogram');

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8')) as T;
}

function finalSoundChunks(alignment: AlignmentChunk[]) {
  const pronounced = alignment.filter((chunk) => chunk.phonemes_arpabet.length > 0 && /^[a-z]+$/.test(chunk.graphemes));
  const vowelIndex = [...pronounced].reverse().findIndex((chunk) =>
    chunk.phonemes_arpabet.some((phone) => /[012]$/.test(phone)),
  );
  if (vowelIndex < 0) return null;
  const start = pronounced.length - 1 - vowelIndex;
  return pronounced.slice(start);
}

function syllableTypeFor(chunks: AlignmentChunk[]) {
  const spelling = chunks.map((chunk) => chunk.graphemes).join('');
  if (/r[bcdfghjklmnpqrstvwxyz]*e?$/.test(spelling)) return 'r-controlled';
  if (/[aeiou][a-z]*e$/.test(spelling)) return 'vowel-consonant-e';
  if (/(ai|ay|ee|ea|oa|ow|igh|oi|oy|ou|oo)/.test(spelling)) return 'vowel-team';
  if (/[aeiou][bcdfghjklmnpqrstvwxyz]+$/.test(spelling)) return 'closed';
  return 'other';
}

async function main() {
  const alignments = readJson<AlignmentRecord[]>('alignment.json');
  const subtlex = readJson<SubtlexRecord[]>('subtlex.json');
  const frequency = new Map(subtlex.map((record) => [record.word, record.freq_count]));
  const groups = new Map<string, { words: string[]; syllableType: string; score: number }>();

  for (const record of alignments) {
    if (record.variant !== 0 || record.confidence !== 'high') continue;
    const chunks = finalSoundChunks(record.alignment);
    if (!chunks) continue;
    const spelling = chunks.map((chunk) => chunk.graphemes).join('');
    if (spelling.length < 2 || spelling.length > 6) continue;
    const code = spelling;
    const existing = groups.get(code) ?? {
      words: [],
      syllableType: syllableTypeFor(chunks),
      score: 0,
    };
    existing.words.push(record.word);
    existing.score += frequency.get(record.word) ?? 0;
    groups.set(code, existing);
  }

  const ranked = [...groups.entries()]
    .filter(([, group]) => group.words.length >= 5)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 240);

  let introductionOrder = 1;
  for (const [code, group] of ranked) {
    const exampleWords = [...new Set(group.words)]
      .sort((a, b) => (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0))
      .slice(0, 12);
    await prisma.phonogramFamily.upsert({
      where: { code },
      update: {
        category: 'phonogram',
        syllableType: group.syllableType,
        exampleWords,
        introductionOrder,
      },
      create: {
        code,
        category: 'phonogram',
        syllableType: group.syllableType,
        exampleWords,
        introductionOrder,
      },
    });
    introductionOrder += 1;
  }

  console.log(`Seeded ${ranked.length} phonogram families from data/phonogram.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
