import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../screens/onboarding-screen';
import { createHabit } from '../../habits/stores/habits-store';
import { saveAvatarConfig } from '../../avatar/stores/avatar-config-store';
import { markOnboardingComplete } from '../onboarding-state';
import { requestPermissions } from '../../notifications/utils/notification-service';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Strings resolve to their own key so assertions stay language-independent.
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_target, key) => String(key) });
  const { observable } = jest.requireActual('@legendapp/state');
  return { useT: () => T, lang$: observable('en'), setLang: jest.fn() };
});

jest.mock('../../../ui/theme/theme-context', () => ({
  useTheme: () => ({ themeKey: 'default' }),
}));

jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));

jest.mock('../../avatar/renderer/pixel-avatar', () => ({
  PixelAvatar: () => null,
}));

jest.mock('../../habits/stores/habits-store', () => ({
  createHabit: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../avatar/stores/avatar-config-store', () => ({
  saveAvatarConfig: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../auth/stores/auth-store', () => ({
  authStore$: { user: { get: () => ({ id: 'user-1' }) } },
}));

jest.mock('../onboarding-state', () => ({
  markOnboardingComplete: jest.fn(),
}));

jest.mock('../../notifications/utils/notification-service', () => ({
  requestPermissions: jest.fn(() => Promise.resolve(false)),
  applyNotificationPrefs: jest.fn(),
}));

function goToHabitStep(utils: ReturnType<typeof render>) {
  fireEvent.press(utils.getByText('ONB_NEXT'));
  fireEvent.press(utils.getByText('ONB_NEXT'));
  fireEvent.press(utils.getByText('ONB_MEET_HERO'));
  fireEvent.press(utils.getByText('ONB_FIRST_QUEST'));
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('walks through the three intro slides', () => {
    const utils = render(<OnboardingScreen />);

    expect(utils.getByText('onb_slide1_title')).toBeTruthy();
    fireEvent.press(utils.getByText('ONB_NEXT'));
    expect(utils.getByText('onb_slide2_title')).toBeTruthy();
    fireEvent.press(utils.getByText('ONB_NEXT'));
    expect(utils.getByText('onb_slide3_title')).toBeTruthy();
    fireEvent.press(utils.getByText('ONB_BACK'));
    expect(utils.getByText('onb_slide2_title')).toBeTruthy();
  });

  it('shows the avatar step after the intro', () => {
    const utils = render(<OnboardingScreen />);
    fireEvent.press(utils.getByText('ONB_NEXT'));
    fireEvent.press(utils.getByText('ONB_NEXT'));
    fireEvent.press(utils.getByText('ONB_MEET_HERO'));

    expect(utils.getByText('onb_avatar_title')).toBeTruthy();
    expect(utils.getByText('onb_skin_label')).toBeTruthy();
  });

  it('skipping the intro completes onboarding without creating a habit', () => {
    const utils = render(<OnboardingScreen />);
    fireEvent.press(utils.getByText('onb_skip_intro'));

    expect(markOnboardingComplete).toHaveBeenCalled();
    expect(createHabit).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('does not finish until a habit is chosen', () => {
    const utils = render(<OnboardingScreen />);
    goToHabitStep(utils);

    fireEvent.press(utils.getByText('ONB_START_QUEST'));
    expect(markOnboardingComplete).not.toHaveBeenCalled();
  });

  it('creates the selected quick habit and saves the avatar', async () => {
    const utils = render(<OnboardingScreen />);
    goToHabitStep(utils);

    fireEvent.press(utils.getByText('onb_quick_read'));
    fireEvent.press(utils.getByText('ONB_START_QUEST'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today'));
    expect(saveAvatarConfig).toHaveBeenCalledWith('#f4c98a', '#4a3728', '#1a1a2e', 'user-1');
    expect(createHabit).toHaveBeenCalledWith('onb_quick_read', 'learning');
    expect(markOnboardingComplete).toHaveBeenCalled();
    // Notifications are asked later, at the end of the Today tour.
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('creates up to three quick-pick habits', async () => {
    const utils = render(<OnboardingScreen />);
    goToHabitStep(utils);

    fireEvent.press(utils.getByText('onb_quick_bedtime'));
    fireEvent.press(utils.getByText('onb_quick_read'));
    fireEvent.press(utils.getByText('onb_quick_exercise'));
    fireEvent.press(utils.getByText('onb_quick_meditate')); // 4th pick is ignored
    fireEvent.press(utils.getByText('onb_quick_read')); // unselect
    fireEvent.press(utils.getByText('ONB_START_QUEST'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today'));
    expect(createHabit).toHaveBeenCalledTimes(2);
    expect(createHabit).toHaveBeenCalledWith('onb_quick_bedtime', 'sleep');
    expect(createHabit).toHaveBeenCalledWith('onb_quick_exercise', 'fitness');
  });

  it('creates a custom habit from the text input', async () => {
    const utils = render(<OnboardingScreen />);
    goToHabitStep(utils);

    fireEvent.changeText(utils.getByPlaceholderText('onb_habit_placeholder'), '  Journal  ');
    fireEvent.press(utils.getByText('ONB_START_QUEST'));

    await waitFor(() => expect(createHabit).toHaveBeenCalledWith('Journal', 'general'));
  });

  it('still completes onboarding when saving fails', async () => {
    (saveAvatarConfig as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const utils = render(<OnboardingScreen />);
    goToHabitStep(utils);

    fireEvent.press(utils.getByText('onb_quick_bedtime'));
    fireEvent.press(utils.getByText('ONB_START_QUEST'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today'));
    expect(markOnboardingComplete).toHaveBeenCalled();
  });
});
