import { useMemo } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { dialogStore$, answerDialog } from '../../lib/app-alert';
import { PixelFrame } from './pixel-frame';
import { PixelButton } from './pixel-button';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../theme/tokens';
import { useTheme } from '../theme/theme-context';

/** Renders the queued Alert.alert calls as pixel dialogs (mounted once at the root). */
export function PixelDialogHost() {
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const queue = use$(dialogStore$.queue);
  const dialog = queue[0];
  if (!dialog) return null;

  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => answerDialog(dialog.id, cancel)}>
      <View style={styles.backdrop}>
        <PixelFrame style={styles.box} backgroundColor={colors.surface} contentStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">{dialog.title}</Text>
          {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          <View style={[styles.buttons, dialog.buttons.length > 2 && styles.buttonsColumn]}>
            {dialog.buttons.map((b, i) => (
              <PixelButton
                key={`${b.text}-${i}`}
                title={b.text ?? 'OK'}
                onPress={() => answerDialog(dialog.id, b)}
                variant={b.style === 'cancel' ? 'secondary' : 'primary'}
                style={dialog.buttons.length > 2 ? undefined : styles.button}
              />
            ))}
          </View>
        </PixelFrame>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    box: { width: '100%', maxWidth: 360 },
    content: { padding: spacing.md, gap: spacing.md },
    title: {
      color: colors.text,
      fontSize: pixelSize(fontSizes.lg),
      fontFamily: fonts.bold,
      letterSpacing: 0.5,
    },
    message: { color: colors.textSecondary, fontSize: fontSizes.md, lineHeight: 20 },
    buttons: { flexDirection: 'row', gap: spacing.sm },
    buttonsColumn: { flexDirection: 'column' },
    button: { flex: 1 },
  });
}
