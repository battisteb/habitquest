jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    View,
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: (v: any) => v,
    withTiming: (v: any) => v,
    Easing: { inOut: () => undefined, ease: undefined, linear: undefined },
  };
});

import { render } from '@testing-library/react-native';
import { EvolvedAvatar } from '../components/evolved-avatar';
import { getAvatarStage } from '../utils/avatar-evolution';

describe('EvolvedAvatar', () => {
  it.each([0, 3, 5, 7, 9, 11, 30])('renders without crashing at level %i', (level) => {
    const { getByTestId } = render(<EvolvedAvatar level={level} size={64} />);
    expect(getByTestId('evolved-avatar-root')).toBeTruthy();
  });

  it('does NOT render aura for a Novice (levels 0-2)', () => {
    const { queryByTestId } = render(<EvolvedAvatar level={2} size={64} />);
    expect(queryByTestId('evolved-avatar-aura')).toBeNull();
  });

  it('renders aura with stage color from Apprentice (level 3)', () => {
    const stage = getAvatarStage(3);
    expect(stage.title).toBe('Apprentice');
    const { getByTestId } = render(<EvolvedAvatar level={3} size={64} />);
    const aura = getByTestId('evolved-avatar-aura');
    expect(aura.props.accessibilityLabel).toBe(`aura-${stage.aura}`);
  });

  it('follows the rank ladder: Knight at level 7', () => {
    const stage = getAvatarStage(7);
    expect(stage.title).toBe('Knight');
    const { getByTestId } = render(<EvolvedAvatar level={7} size={64} />);
    expect(getByTestId('evolved-avatar-aura').props.accessibilityLabel).toBe(
      `aura-${stage.aura}`,
    );
  });

  it('renders 4 particles at level 9 (Champion)', () => {
    const { getByTestId, queryByTestId } = render(<EvolvedAvatar level={9} size={64} />);
    expect(getByTestId('evolved-avatar-particle-0')).toBeTruthy();
    expect(getByTestId('evolved-avatar-particle-3')).toBeTruthy();
    expect(queryByTestId('evolved-avatar-particle-4')).toBeNull();
  });

  it('renders 6 particles at level 11 (Legend)', () => {
    const { getByTestId } = render(<EvolvedAvatar level={11} size={64} />);
    expect(getByTestId('evolved-avatar-particle-0')).toBeTruthy();
    expect(getByTestId('evolved-avatar-particle-5')).toBeTruthy();
  });

  it('hides aura when showAura is false even at high level', () => {
    const { queryByTestId } = render(
      <EvolvedAvatar level={30} size={64} showAura={false} />,
    );
    expect(queryByTestId('evolved-avatar-aura')).toBeNull();
    expect(queryByTestId('evolved-avatar-particle-0')).toBeNull();
  });
});
