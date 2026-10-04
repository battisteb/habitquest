/**
 * Quest templates and one-tap ideas: every name exists in each app language
 * (Japanese was missing and fell back to English).
 */
import { HABIT_TEMPLATES, templateName } from '../habit-templates';

describe('quest templates', () => {
  it('have a name in French, English and Japanese', () => {
    for (const t of HABIT_TEMPLATES) {
      expect([t.id, !!t.name_fr, !!t.name_en, !!t.name_ja]).toEqual([t.id, true, true, true]);
      expect(t.name_ja).not.toBe(t.name_en);
    }
  });

  it('show the name in the player language', () => {
    const read = HABIT_TEMPLATES.find((t) => t.id === 'read')!;
    expect(templateName(read, 'fr')).toBe('Lire 20 min');
    expect(templateName(read, 'en')).toBe('Read 20 min');
    expect(templateName(read, 'ja')).toBe('20分読書');
  });
});
