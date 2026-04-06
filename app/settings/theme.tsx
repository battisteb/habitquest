import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/ui/theme/theme-context';
import { THEMES, THEME_META, ThemeKey } from '../../src/ui/theme/themes';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { spacing, fontSizes } from '../../src/ui/theme/tokens';

export default function ThemeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeKey, theme, setTheme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />
      <Text style={{ color: theme.text, fontSize: fontSizes.xl, fontWeight: 'bold', letterSpacing: 2 }}>
        THEMES
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: fontSizes.xs }}>
        Personalise your dungeon aesthetic.
      </Text>

      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const meta = THEME_META[key];
        const t = THEMES[key];
        const isActive = themeKey === key;
        return (
          <Pressable
            key={key}
            onPress={() => setTheme(key)}
            style={{
              backgroundColor: t.surface,
              borderWidth: 2,
              borderColor: isActive ? t.primary : t.border,
              borderRadius: 6,
              borderBottomWidth: isActive ? 4 : 2,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 32 }}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: fontSizes.md, fontWeight: 'bold' }}>
                  {meta.name}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: fontSizes.xs }}>
                  {meta.description}
                </Text>
              </View>
              {isActive && (
                <Text style={{ color: t.primary, fontSize: fontSizes.xs, fontWeight: 'bold' }}>
                  ACTIVE
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[t.background, t.primary, t.accent, t.streak, t.success].map((c, i) => (
                <View
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: c,
                    borderRadius: 3,
                    borderWidth: 1,
                    borderColor: t.border,
                  }}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
