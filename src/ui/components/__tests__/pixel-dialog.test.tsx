import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PixelDialogHost } from '../pixel-dialog';
import { dialogStore$, installAppAlert } from '../../../lib/app-alert';

describe('PixelDialogHost', () => {
  beforeAll(() => installAppAlert());
  beforeEach(() => dialogStore$.queue.set([]));

  it('shows Alert.alert in the app and runs the chosen button', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const utils = render(<PixelDialogHost />);
    act(() => {
      Alert.alert('Activer le repos ?', 'Ta série est protégée aujourd’hui.', [
        { text: 'Annuler', style: 'cancel', onPress: onCancel },
        { text: 'Activer', onPress: onConfirm },
      ]);
    });
    expect(utils.getByText('Activer le repos ?')).toBeTruthy();
    fireEvent.press(utils.getByText('ACTIVER'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(utils.queryByText('Activer le repos ?')).toBeNull();
  });

  it('adds an OK button when none is given and shows dialogs one after another', () => {
    const utils = render(<PixelDialogHost />);
    act(() => {
      Alert.alert('Premier');
      Alert.alert('Second');
    });
    expect(utils.getByText('Premier')).toBeTruthy();
    expect(utils.queryByText('Second')).toBeNull();
    fireEvent.press(utils.getByText('OK'));
    expect(utils.getByText('Second')).toBeTruthy();
  });
});
