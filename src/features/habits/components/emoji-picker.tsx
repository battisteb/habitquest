import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

const EMOJI_GROUPS = [
  { label: 'BODY', emojis: ['💪', '🏋️', '🤸', '🧘', '🏃', '🚴', '🤾', '⛹️', '🤼', '🥊'] },
  { label: 'MIND', emojis: ['📚', '📖', '✏️', '🧠', '💡', '🎯', '🔬', '🎓', '📝', '🧩'] },
  { label: 'HEALTH', emojis: ['💚', '🥗', '🥦', '💊', '🍎', '💧', '🌿', '🫁', '😴', '🛁'] },
  { label: 'MOOD', emojis: ['⭐', '✨', '🌟', '🔥', '🎉', '🏆', '💎', '🌈', '❤️', '😊'] },
  { label: 'WORK', emojis: ['⚡', '💼', '📊', '🖥️', '📅', '⏰', '📌', '🗂️', '✅', '💰'] },
  { label: 'LIFE', emojis: ['🏠', '🌿', '☀️', '🌙', '🎨', '🎵', '🤝', '📱', '🚀', '🌍'] },
];

interface EmojiPickerProps {
  value: string | null;
  onChange: (emoji: string | null) => void;
  label?: string;
}

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    wrapper: { gap: spacing.sm },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      color: colors.textSecondary,
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    clearBtn: {
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    groupLabel: {
      fontSize: 9,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 1,
      marginTop: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    emojiBtn: {
      width: 38,
      height: 38,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiBtnSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '22',
    },
    emojiText: {
      fontSize: 20,
    },
  }), [themeKey]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label ?? 'EMOJI'}</Text>
        {value && (
          <Pressable onPress={() => onChange(null)}>
            <Text style={styles.clearBtn}>CLEAR</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ gap: 2 }}>
          {EMOJI_GROUPS.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.row}>
                {group.emojis.map((e) => (
                  <Pressable
                    key={e}
                    style={[styles.emojiBtn, value === e && styles.emojiBtnSelected]}
                    onPress={() => onChange(value === e ? null : e)}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
