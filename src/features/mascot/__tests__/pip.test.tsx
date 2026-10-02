import { render } from '@testing-library/react-native';
import { Pip } from '../components/pip';
import { PIP_DEFAULT_MOOD, PIP_GRID, PIP_MOODS, pipSprite, type PipExpression } from '../sprites';

const EXPRESSIONS: PipExpression[] = ['happy', 'joy', 'proud', 'worried', 'sad', 'sleepy'];

describe('Pip, the mascot', () => {
  it('has a complete 16×16 sprite for every expression', () => {
    for (const e of EXPRESSIONS) {
      const rows = pipSprite(e);
      expect(rows).toHaveLength(PIP_GRID);
      rows.forEach((r) => expect(r).toHaveLength(PIP_GRID));
    }
  });

  it('has a colour for every pixel in every mood', () => {
    const letters = new Set(EXPRESSIONS.flatMap((e) => pipSprite(e).join('').split('')).filter((c) => c !== '.'));
    for (const palette of Object.values(PIP_MOODS)) {
      letters.forEach((l) => expect(palette[l]).toMatch(/^#[0-9A-F]{6}$/i));
    }
  });

  it('changes colour with its mood', () => {
    expect(PIP_MOODS.calm.g).not.toBe(PIP_MOODS.worried.g);
    expect(PIP_DEFAULT_MOOD.sad).toBe('worried');
    expect(PIP_DEFAULT_MOOD.joy).toBe('party');
  });

  it('renders, with or without its bounce', () => {
    expect(render(<Pip expression="joy" bouncing={false} />).getByTestId('pip')).toBeTruthy();
    expect(render(<Pip mood="love" size={32} />).getByTestId('pip')).toBeTruthy();
  });
});
