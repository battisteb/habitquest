import { render } from '@testing-library/react-native';
import { EvolvedAvatar } from '../components/evolved-avatar';

describe('EvolvedAvatar', () => {
  it.each([1, 3, 5, 7, 9, 11, 30])('renders without crashing at level %i', (level) => {
    const { getByTestId } = render(<EvolvedAvatar level={level} size={64} idleFrame={0} />);
    expect(getByTestId('evolved-avatar-root')).toBeTruthy();
  });

  it('has no round aura any more, whatever the rank', () => {
    const { queryByTestId } = render(<EvolvedAvatar level={30} size={64} idleFrame={0} />);
    expect(queryByTestId('evolved-avatar-aura')).toBeNull();
    expect(queryByTestId('evolved-avatar-particle-0')).toBeNull();
  });
});
