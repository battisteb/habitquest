import { render, screen } from '@testing-library/react-native';
import { CohortTable, Funnel, SegmentTable, segmentLabel, type SegmentRow } from '../components/segments';

const row = (over: Partial<SegmentRow>): SegmentRow => ({
  key: 'ja',
  users: 10,
  new_7d: 3,
  activated: 6,
  activation_rate: 60,
  active_7d: 4,
  active_rate: 40,
  d7_cohort: 5,
  d7_rate: 20,
  premium: 1,
  ...over,
});

describe('segmentLabel', () => {
  it('names languages, platforms, plans and regions in French', () => {
    expect(segmentLabel('by_language', 'ja')).toBe('Japonais');
    expect(segmentLabel('by_platform', 'android')).toBe('Android');
    expect(segmentLabel('by_platform', 'unknown')).toBe('Inconnue');
    expect(segmentLabel('by_plan', 'premium')).toBe('Premium');
    expect(segmentLabel('by_region', 'Asia/Tokyo')).toBe('Tokyo');
    expect(segmentLabel('by_region', 'America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });
});

describe('SegmentTable', () => {
  it('shows one row per segment with its rates', () => {
    render(<SegmentTable dim="by_language" rows={[row({}), row({ key: 'fr', users: 2, activation_rate: 50 })]} />);
    expect(screen.getByText('Japonais')).toBeTruthy();
    expect(screen.getByText('Français')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('says when there is nobody', () => {
    render(<SegmentTable dim="by_platform" rows={[]} />);
    expect(screen.getByText('Aucun joueur')).toBeTruthy();
  });
});

describe('Funnel', () => {
  it('shows each step with its share of signups and the drop from the previous step', () => {
    render(
      <Funnel
        steps={[
          { step: 'signed_up', n: 10 },
          { step: 'created_habit', n: 8 },
          { step: 'first_quest', n: 4 },
        ]}
      />,
    );
    expect(screen.getByText('Inscrits')).toBeTruthy();
    expect(screen.getByText(/4 · 40%/)).toBeTruthy();
    expect(screen.getByText(/−50%/)).toBeTruthy();
  });
});

describe('CohortTable', () => {
  it('shows unfinished weeks as pending', () => {
    render(<CohortTable cohorts={[{ week: '2026-10-05', size: 6, w1: null, w2: null, w3: null, w4: null }]} />);
    expect(screen.getByText('05/10')).toBeTruthy();
    expect(screen.getAllByText('…')).toHaveLength(4);
  });
});
