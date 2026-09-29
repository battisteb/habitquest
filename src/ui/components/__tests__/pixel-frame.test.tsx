import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PixelFrame, shade } from '../pixel-frame';
import { litSegments } from '../pixel-progress';

describe('shade', () => {
  it('darkens a hex color', () => {
    expect(shade('#ffffff', 0.5)).toBe('#808080');
    expect(shade('#3a4080', 0.5)).toBe('#1d2040');
  });

  it('returns other formats unchanged', () => {
    expect(shade('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
  });
});

describe('PixelFrame', () => {
  const flatStyle = (el: { props: { style: unknown } }) =>
    Object.assign({}, ...([el.props.style].flat(3).filter(Boolean) as object[]));

  it('keeps the same height when pressed (the ledge becomes the drop)', () => {
    const { getByTestId, rerender } = render(
      <PixelFrame testID="f"><Text>ok</Text></PixelFrame>,
    );
    const up = flatStyle(getByTestId('f'));
    rerender(<PixelFrame testID="f" pressed><Text>ok</Text></PixelFrame>);
    const down = flatStyle(getByTestId('f'));
    expect(up.paddingTop + up.paddingBottom).toBe(down.paddingTop + down.paddingBottom);
    expect(down.paddingTop).toBeGreaterThan(up.paddingTop);
  });

  it('renders its children', () => {
    const { getByText } = render(<PixelFrame><Text>inside</Text></PixelFrame>);
    expect(getByText('inside')).toBeTruthy();
  });
});

describe('litSegments', () => {
  it('lights nothing at 0 and everything only at 100%', () => {
    expect(litSegments(0, 20)).toBe(0);
    expect(litSegments(1, 20)).toBe(20);
    expect(litSegments(0.999, 20)).toBe(19);
  });

  it('shows any progress with at least one segment', () => {
    expect(litSegments(0.001, 20)).toBe(1);
    expect(litSegments(0.5, 20)).toBe(10);
  });
});
