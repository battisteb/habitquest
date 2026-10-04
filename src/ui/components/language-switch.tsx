import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { lang$, setLang, LANGS } from '../../lib/i18n';
import { colors, fonts, pixelSize, fontSizes } from '../theme/tokens';

/**
 * EN / FR / JA / KO switch shown before the player has an account (sign-in, first
 * onboarding slide): the device language is preselected, the player can
 * change it right away. Settings keep the same choice afterwards.
 */
export function LanguageSwitch({ style }: { style?: StyleProp<ViewStyle> }) {
  const lang = use$(lang$);
  return (
    <View style={[styles.row, style]} accessibilityRole="radiogroup">
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={[styles.btn, active && styles.btnActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            testID={`lang-${l}`}
            hitSlop={6}
          >
            <Text style={[styles.text, active && styles.textActive]}>{l.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  btn: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  btnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  text: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), color: colors.textMuted, letterSpacing: 1 },
  textActive: { color: '#fff' },
});
