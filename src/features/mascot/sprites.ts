/**
 * Pip, the HabitQuest mascot: a 16×16 slime whose colour shows its mood
 * (Battiste, 2026-10-02). `.` is transparent, `k` the outline; the other
 * letters come from the mood palette. Expressions only change the face rows.
 */
export const PIP_GRID = 16;

export type PipExpression = 'happy' | 'joy' | 'proud' | 'worried' | 'sad' | 'sleepy';
export type PipMood = 'calm' | 'fire' | 'party' | 'worried' | 'rest' | 'love';

const BODY = [
  '................',
  '................',
  '................',
  '.......kk.......',
  '......kgwk......',
  '.....kgggkk.....',
  '....kgggggwk....',
  '...kgggggggwk...',
  '..kggggggggggk..',
  '..kggggggggggk..',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '.kGgggggggggggk.',
  '..kGGGGGGGGGGk..',
  '...kkkkkkkkkk...',
];

/** Rows that differ from the body, by row index. */
const FACES: Record<PipExpression, Record<number, string>> = {
  happy: { 9: '..kggwkggwkggk..', 10: '.kgggkkggkkgggk.', 11: '.kgppggggggppgk.', 12: '.kgggggmmgggggk.' },
  joy: {
    9: '..kggkggggkggk..', 10: '.kggkgkggkgkggk.', 11: '.kgppggggggppgk.',
    12: '.kggggkrrkggggk.', 13: '.kGggggkkgggggk.',
  },
  proud: {
    9: '..kggwkggggggk..', 10: '.kgggkkgkkkgggk.', 11: '.kgppggggggppgk.',
    12: '.kggggkggkggggk.', 13: '.kGggggkkgggggk.',
  },
  worried: {
    8: '..kgggkggkgggk..', 9: '..kggwkggwkggk..', 10: '.kgggkkggkkgggk.',
    11: '.kgggggggggggsk.', 12: '.kgggggkkgggggk.',
  },
  sad: {
    9: '..kggwkggwkggk..', 10: '.kgggkkggkkgggk.', 11: '.kgggsggggsgggk.',
    12: '.kgggggkkgggggk.', 13: '.kGgggkggkggggk.',
  },
  sleepy: {
    0: '...........zzzz.', 1: '.............z..', 2: '............z...', 3: '.......kk..zzzz.',
    10: '.kgggkkggkkgggk.', 11: '.kgppggggggppgk.', 12: '.kgggggkkgggggk.',
  },
};

export function pipSprite(expression: PipExpression): string[] {
  const face = FACES[expression];
  return BODY.map((row, i) => face[i] ?? row);
}

const SHARED = { k: '#14142A', m: '#14142A', r: '#E8505B', s: '#9FE3FF', z: '#E8E8FF' };

/** g body, G shade, w shine, p cheeks. */
export const PIP_MOODS: Record<PipMood, Record<string, string>> = {
  calm: { ...SHARED, g: '#5BE38C', G: '#2FA35E', w: '#E8FFF0', p: '#FF8FB0' },
  fire: { ...SHARED, g: '#FF9A3C', G: '#D9611A', w: '#FFE9D1', p: '#FF5A5A' },
  party: { ...SHARED, g: '#FFD84A', G: '#D19A10', w: '#FFF8D6', p: '#FF9F7A' },
  worried: { ...SHARED, g: '#6FB7FF', G: '#3A72C9', w: '#E6F3FF', p: '#B9A0FF' },
  rest: { ...SHARED, g: '#A58BFF', G: '#6C4FD9', w: '#F0EBFF', p: '#FF8FC8' },
  love: { ...SHARED, g: '#FF8FC8', G: '#D65A97', w: '#FFE6F3', p: '#FF5A8A' },
};

/** The colour that goes with each expression when none is given. */
export const PIP_DEFAULT_MOOD: Record<PipExpression, PipMood> = {
  happy: 'calm', joy: 'party', proud: 'fire', worried: 'worried', sad: 'worried', sleepy: 'rest',
};
