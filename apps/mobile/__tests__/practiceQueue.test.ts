import {
  addMeaningWord,
  buildPracticePromptSection,
  createPracticeEntry,
  MAX_PRACTICE_WORDS,
  HARD_MAX_DUE_WORDS_PER_GENERATION,
  migrateDictionaryEntry,
  recordPracticeUsageAfterAiGeneration,
  selectDueWordsForAi,
  wordAppearsInGeneratedText,
} from '../src/dictionary/practiceQueue';
import type { DictionaryEntry } from '../src/dictionary/dictionaryTypes';

function seedWord(word: string, index: number): DictionaryEntry {
  return createPracticeEntry(word, {
    practiceLanguage: 'en-US',
    meaning: `meaning-${word}`,
    savedAt: index,
    lookupCount: 1,
  });
}

describe('practiceQueue', () => {
  it('Test 1 — add first word', () => {
    const next = addMeaningWord([], {
      displayWord: 'run',
      meaning: 'to move fast',
      practiceLanguage: 'en-US',
    });
    expect(next).toHaveLength(1);
    const w = migrateDictionaryEntry(next[0]);
    expect(w.word).toBe('run');
    expect(w.targetUses).toBe(3);
    expect(w.usedCount).toBe(0);
    expect(w.difficultyStarred).toBe(false);
  });

  it('Test 2 — add 200 words', () => {
    let queue: DictionaryEntry[] = [];
    for (let i = 0; i < 200; i += 1) {
      queue = addMeaningWord(queue, {
        displayWord: `word${i}`,
        meaning: `m${i}`,
        practiceLanguage: 'en-US',
      });
    }
    expect(queue).toHaveLength(200);
    expect(new Set(queue.map((e) => e.word)).size).toBe(200);
  });

  it('Test 3 — adding 201st word evicts safely', () => {
    let queue: DictionaryEntry[] = [];
    for (let i = 0; i < 200; i += 1) {
      queue = addMeaningWord(queue, {
        displayWord: `word${i}`,
        meaning: `m${i}`,
        practiceLanguage: 'en-US',
      });
    }
    queue = addMeaningWord(queue, {
      displayWord: 'word201',
      meaning: 'new',
      practiceLanguage: 'en-US',
    });
    expect(queue).toHaveLength(200);
    expect(queue.some((e) => e.word === 'word201')).toBe(true);
    expect(queue.length).toBeLessThanOrEqual(MAX_PRACTICE_WORDS);
  });

  it('Test 4 — no duplicate on normalized word', () => {
    let queue = addMeaningWord([], {
      displayWord: 'run',
      meaning: 'a',
      practiceLanguage: 'en-US',
    });
    queue = addMeaningWord(
      queue,
      { displayWord: 'Run', meaning: 'b', practiceLanguage: 'en-US' },
      { meaningAskedAgain: false }
    );
    queue = addMeaningWord(
      queue,
      { displayWord: 'run ', meaning: 'c', practiceLanguage: 'en-US' },
      { meaningAskedAgain: false }
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].word).toBe('run');
    expect(queue[0].meaning).toBe('c');
  });

  it('Test 5 — repeated meaning changes 3 to 5', () => {
    let queue = addMeaningWord([], {
      displayWord: 'run',
      meaning: 'move',
      practiceLanguage: 'en-US',
    });
    queue = recordPracticeUsageAfterAiGeneration(queue, 'I run daily.', [
      {
        word: 'run',
        displayWord: 'run',
        usedCount: 0,
        targetUses: 3,
        difficultyStarred: false,
      },
    ]);
    expect(migrateDictionaryEntry(queue[0]).usedCount).toBe(1);

    queue = addMeaningWord(
      queue,
      { displayWord: 'run', meaning: 'move', practiceLanguage: 'en-US' },
      { meaningAskedAgain: true }
    );
    const w = migrateDictionaryEntry(queue[0]);
    expect(w.targetUses).toBe(5);
    expect(w.difficultyStarred).toBe(true);
    expect(w.usedCount).toBe(1);
  });

  it('Test 6 — repeated meaning on 5-use word resets cycle', () => {
    let queue = [
      createPracticeEntry('run', {
        practiceLanguage: 'en-US',
        meaning: 'move',
        targetUses: 5,
        usedCount: 5,
        difficultyStarred: true,
        lookupCount: 2,
        lastMeaningAskedAt: 1,
      }),
    ];
    queue = addMeaningWord(
      queue,
      { displayWord: 'run', meaning: 'move', practiceLanguage: 'en-US' },
      { meaningAskedAgain: true }
    );
    const w = migrateDictionaryEntry(queue[0]);
    expect(w.targetUses).toBe(5);
    expect(w.difficultyStarred).toBe(true);
    expect(w.usedCount).toBe(0);
  });

  it('Test 7 — usage count increments once per generated text', () => {
    const queue = [
      createPracticeEntry('run', {
        practiceLanguage: 'en-US',
        meaning: 'move',
        targetUses: 3,
        usedCount: 0,
      }),
    ];
    const text = 'I run every day. I run because running helps me.';
    expect(wordAppearsInGeneratedText('run', text)).toBe(true);
    const next = recordPracticeUsageAfterAiGeneration(queue, text, [
      {
        word: 'run',
        displayWord: 'run',
        usedCount: 0,
        targetUses: 3,
        difficultyStarred: false,
      },
    ]);
    expect(migrateDictionaryEntry(next[0]).usedCount).toBe(1);
  });

  it('Test 8 — word completes after 3 separate generated texts', () => {
    let queue = [
      createPracticeEntry('run', {
        practiceLanguage: 'en-US',
        meaning: 'move',
        targetUses: 3,
        usedCount: 0,
      }),
    ];
    const batch = [
      {
        word: 'run',
        displayWord: 'run',
        usedCount: 0,
        targetUses: 3 as const,
        difficultyStarred: false,
      },
    ];
    queue = recordPracticeUsageAfterAiGeneration(queue, 'I run today.', batch);
    queue = recordPracticeUsageAfterAiGeneration(queue, 'They run fast.', batch);
    queue = recordPracticeUsageAfterAiGeneration(queue, 'We run often.', batch);
    expect(queue.find((e) => e.word === 'run')).toBeUndefined();
  });

  it('Test 9 — starred word completes after 5 separate generated texts', () => {
    let queue = [
      createPracticeEntry('run', {
        practiceLanguage: 'en-US',
        meaning: 'move',
        targetUses: 5,
        usedCount: 0,
        difficultyStarred: true,
      }),
    ];
    const batch = [
      {
        word: 'run',
        displayWord: 'run',
        usedCount: 0,
        targetUses: 5 as const,
        difficultyStarred: true,
      },
    ];
    for (let i = 0; i < 4; i += 1) {
      queue = recordPracticeUsageAfterAiGeneration(queue, 'I run today.', batch);
      expect(queue).toHaveLength(1);
      expect(migrateDictionaryEntry(queue[0]).usedCount).toBe(i + 1);
    }
    queue = recordPracticeUsageAfterAiGeneration(queue, 'I run again.', batch);
    expect(queue.find((e) => e.word === 'run')).toBeUndefined();
  });

  it('Test 10 — failed AI generation does not increment count', () => {
    const queue = [
      createPracticeEntry('run', {
        practiceLanguage: 'en-US',
        meaning: 'move',
        targetUses: 3,
        usedCount: 1,
      }),
    ];
    const unchanged = recordPracticeUsageAfterAiGeneration(queue, '', [
      {
        word: 'run',
        displayWord: 'run',
        usedCount: 1,
        targetUses: 3,
        difficultyStarred: false,
      },
    ]);
    expect(unchanged).toBe(queue);
    expect(migrateDictionaryEntry(unchanged[0]).usedCount).toBe(1);
  });

  it('Test 11 — AI prompt does not include all 200 words', () => {
    const entries = Array.from({ length: 200 }, (_, i) => seedWord(`due${i}`, i));
    const selected = selectDueWordsForAi(entries);
    expect(selected.length).toBeLessThanOrEqual(HARD_MAX_DUE_WORDS_PER_GENERATION);
    const prompt = buildPracticePromptSection(selected);
    expect(prompt.length).toBeLessThan(12_000);
    expect(prompt).toContain('Practice words for this text');
  });

  it('Test 12 — grammar metadata is preserved in AI prompt', () => {
    const queue = [
      createPracticeEntry('run', {
        practiceLanguage: 'en-US',
        meaning: 'move',
        partOfSpeech: 'verb',
        grammarHints: { verbForms: ['run', 'ran', 'running'] },
        targetUses: 3,
        usedCount: 0,
      }),
    ];
    const selected = selectDueWordsForAi(queue);
    const prompt = buildPracticePromptSection(selected);
    expect(prompt).toContain('verb');
    expect(prompt).toContain('run');
    expect(prompt).toContain('ran');
  });

  it('Test 13 — only due words for selected practice language are picked', () => {
    const entries = [
      createPracticeEntry('run', { practiceLanguage: 'tr-TR', meaning: 'a' }),
      createPracticeEntry('jump', { practiceLanguage: 'en-US', meaning: 'b' }),
      createPracticeEntry('walk', { practiceLanguage: 'en-US', meaning: 'c' }),
    ];
    const trOnly = selectDueWordsForAi(entries, 8, 'tr-TR');
    const enOnly = selectDueWordsForAi(entries, 8, 'en-US');
    expect(trOnly.map((w) => w.word)).toEqual(['run']);
    expect(enOnly.map((w) => w.word).sort()).toEqual(['jump', 'walk']);
  });

  it('Test 14 — word removed only when usage target is reached, not on language change', () => {
    let queue = [
      createPracticeEntry('run', { practiceLanguage: 'tr-TR', meaning: 'm', targetUses: 3, usedCount: 2 }),
      createPracticeEntry('jump', { practiceLanguage: 'en-US', meaning: 'm', targetUses: 3, usedCount: 0 }),
    ];
    queue = recordPracticeUsageAfterAiGeneration(queue, 'I run today.', [
      {
        word: 'run',
        displayWord: 'run',
        usedCount: 2,
        targetUses: 3,
        difficultyStarred: false,
      },
    ]);
    expect(queue.find((e) => e.word === 'run')).toBeUndefined();
    expect(queue.find((e) => e.word === 'jump')).toBeTruthy();
    expect(queue).toHaveLength(1);
  });
});

describe('practiceQueue integration flow', () => {
  it('full meaning → AI → re-ask → complete flow', () => {
    let queue = addMeaningWord([], {
      displayWord: 'run',
      meaning: 'move fast',
      practiceLanguage: 'en-US',
    });
    const due1 = selectDueWordsForAi(queue);
    expect(due1.map((w) => w.word)).toContain('run');

    queue = recordPracticeUsageAfterAiGeneration(queue, 'I like to run in the park.', due1);
    expect(migrateDictionaryEntry(queue[0]).usedCount).toBe(1);

    queue = addMeaningWord(
      queue,
      { displayWord: 'run', meaning: 'move fast', practiceLanguage: 'en-US' },
      { meaningAskedAgain: true }
    );
    expect(migrateDictionaryEntry(queue[0]).targetUses).toBe(5);

    const dueBatch = selectDueWordsForAi(queue);
    for (let i = 0; i < 4; i += 1) {
      queue = recordPracticeUsageAfterAiGeneration(queue, 'We run together.', dueBatch);
    }
    expect(queue.find((e) => e.word === 'run')).toBeUndefined();
  });

  it('200 words — repeated AI batches stay small', () => {
    let queue: DictionaryEntry[] = [];
    for (let i = 0; i < 200; i += 1) {
      queue = addMeaningWord(queue, {
        displayWord: `w${i}`,
        meaning: 'm',
        practiceLanguage: 'en-US',
      });
    }
    for (let gen = 0; gen < 10; gen += 1) {
      const batch = selectDueWordsForAi(queue);
      expect(batch.length).toBeLessThanOrEqual(HARD_MAX_DUE_WORDS_PER_GENERATION);
      const text = batch.map((w) => `Text with ${w.displayWord}.`).join(' ');
      queue = recordPracticeUsageAfterAiGeneration(queue, text, batch);
    }
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.length).toBeLessThanOrEqual(200);
  });
});
