/**
 * D6: Today's sort and category chips appear from 6 quests; below that they
 * are hidden and no earlier choice keeps hiding quests.
 */
import { listTools, LIST_TOOLS_MIN_QUESTS } from '../utils/list-tools';

describe('quest list tools', () => {
  it('appear from 6 quests', () => {
    expect(LIST_TOOLS_MIN_QUESTS).toBe(6);
    expect(listTools(5, 'all', 'smart', 'all').show).toBe(false);
    expect(listTools(6, 'all', 'smart', 'all').show).toBe(true);
  });

  it('keep the chosen filter and sort when shown', () => {
    expect(listTools(9, 'fitness', 'az', 'all')).toEqual({ show: true, category: 'fitness', sort: 'az' });
  });

  it('drop an earlier filter and sort when hidden', () => {
    expect(listTools(3, 'fitness', 'az', 'all')).toEqual({ show: false, category: 'all', sort: 'smart' });
  });
});
