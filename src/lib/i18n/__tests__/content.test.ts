import { achievementText, questText, shopItemText } from '../content';

describe('game content translations', () => {
  it('returns the French text for known content', () => {
    expect(questText('fr', { title: 'First Step', description: 'Complete 1 habit today' }).title).toBe('Premier pas');
    expect(achievementText('fr', { key: 'streak_3', name: 'Consistent', description: 'Reach a 3-day streak' })).toEqual({
      title: 'Régulier',
      description: 'Atteins une série de 3 jours',
    });
    expect(shopItemText('fr', { name: 'Wizard Hat', description: 'Pointy and full of mystery' }).title).toBe('Chapeau de mage');
  });

  it('keeps the database text in English and for unknown content', () => {
    expect(questText('en', { title: 'First Step', description: 'Complete 1 habit today' }).title).toBe('First Step');
    expect(shopItemText('fr', { name: 'Brand New Hat', description: 'Shiny' })).toEqual({
      title: 'Brand New Hat',
      description: 'Shiny',
    });
  });
});
