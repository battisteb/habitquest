import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DailyQuestCard } from '../components/daily-quest-card';
import type { DailyQuestWithTemplate } from '../stores/daily-quests-store';

function makeQuest(overrides: Partial<DailyQuestWithTemplate> = {}): DailyQuestWithTemplate {
  return {
    id: 'quest-1',
    user_id: 'user-123',
    template_id: 'tpl-1',
    assigned_date: '2026-04-05',
    current_progress: 1,
    is_completed: false,
    is_claimed: false,
    completed_at: null,
    claimed_at: null,
    template: {
      id: 'tpl-1',
      title: 'Steady Progress',
      description: 'Complete 2 habits today',
      quest_type: 'complete_habits',
      target_value: 2,
      target_category: null,
      xp_reward: 25,
      gold_reward: 5,
      difficulty: 'normal',
      is_active: true,
    },
    ...overrides,
  };
}

describe('DailyQuestCard', () => {
  it('renders quest title and description', () => {
    const quest = makeQuest();
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(getByText('Steady Progress')).toBeTruthy();
    expect(getByText('Complete 2 habits today')).toBeTruthy();
  });

  it('shows difficulty badge', () => {
    const quest = makeQuest();
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(getByText('NORMAL')).toBeTruthy();
  });

  it('shows rewards', () => {
    const quest = makeQuest();
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(getByText('25 XP')).toBeTruthy();
    expect(getByText('5 G')).toBeTruthy();
  });

  it('shows progress text', () => {
    const quest = makeQuest({ current_progress: 1 });
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(getByText('1/2')).toBeTruthy();
  });

  it('does not show CLAIM button when not completed', () => {
    const quest = makeQuest({ is_completed: false });
    const { queryByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(queryByText('CLAIM')).toBeNull();
  });

  it('shows CLAIM button when completed and not claimed', () => {
    const quest = makeQuest({
      current_progress: 2,
      is_completed: true,
    });
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(getByText('CLAIM')).toBeTruthy();
  });

  it('calls onClaim when CLAIM button is pressed', () => {
    const onClaim = jest.fn();
    const quest = makeQuest({
      current_progress: 2,
      is_completed: true,
    });
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={onClaim} />,
    );

    fireEvent.press(getByText('CLAIM'));
    expect(onClaim).toHaveBeenCalledWith('quest-1');
  });

  it('does not show CLAIM button when already claimed', () => {
    const quest = makeQuest({
      current_progress: 2,
      is_completed: true,
      is_claimed: true,
    });
    const { queryByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(queryByText('CLAIM')).toBeNull();
  });

  it('shows checkmark in title when claimed', () => {
    const quest = makeQuest({
      is_completed: true,
      is_claimed: true,
    });
    const { getByText } = render(
      <DailyQuestCard quest={quest} onClaim={jest.fn()} />,
    );

    expect(getByText('\u2713 Steady Progress')).toBeTruthy();
  });
});
