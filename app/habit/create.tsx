import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelInput } from '../../src/ui/components/pixel-input';
import { PixelFrame } from '../../src/ui/components/pixel-frame';
import { ContentPicker } from '../../src/features/habits/components/content-picker';
import { EmojiPicker } from '../../src/features/habits/components/emoji-picker';
import { createHabit } from '../../src/features/habits/stores/habits-store';
import { HABIT_CATEGORIES, CATEGORY_CONFIG, type HabitCategory } from '../../src/lib/constants/categories';

// The default category first: on one scrolling line, the selected chip must be visible.
const CATEGORY_ORDER: HabitCategory[] = ['general', ...HABIT_CATEGORIES.filter((c) => c !== 'general')];
import type { HabitContent } from '../../src/features/habits/types/habit-content';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT, lang$ } from '../../src/lib/i18n';
import { use$ } from '@legendapp/state/react';
import { HABIT_TEMPLATES, type HabitTemplate } from '../../src/lib/constants/habit-templates';
import { categoryLabel } from '../../src/lib/i18n/labels';

/** One-tap ideas shown under the name (full list: templates screen). */
const IDEA_IDS = ['read', 'run', 'meditate', 'no_phone_am', 'planning', 'call_family'];
const MIN_PER_WEEK = 2;
const MAX_PER_WEEK = 5;

/** '3x_week' → 3; 'daily' → null. */
function timesPerWeek(frequency: string): number | null {
  const m = /^(\d)x_week$/.exec(frequency);
  return m ? Number(m[1]) : null;
}

/**
 * Quest creation, reduced to what matters: a name (or a one-tap idea), a
 * category, how often. Icon and content (timer, checklist, link) are folded
 * under "more options".
 */
export default function CreateHabitScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: { color: colors.primary, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, letterSpacing: 1 },
  title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
  section: { gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.primary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 0.5 },
  // One line that scrolls sideways instead of several wrapped lines.
  scrollRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.md },
  chip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  chipText: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
  dot: { width: 8, height: 8 },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1 },
  segmentFace: { paddingVertical: spacing.sm, alignItems: 'center' },
  segmentText: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, letterSpacing: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  stepBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.text, fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold },
  stepValue: { color: colors.text, fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, minWidth: 150, textAlign: 'center' },
  moreToggle: { paddingVertical: spacing.xs },
  moreText: { color: colors.primary, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
}), [themeKey]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lang = use$(lang$);
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();

  const prefilledTemplate = templateId ? HABIT_TEMPLATES.find((t) => t.id === templateId) : null;
  const templateName = (t: HabitTemplate) => (lang === 'fr' ? t.name_fr : t.name_en);
  const ideas = useMemo(
    () => IDEA_IDS.map((id) => HABIT_TEMPLATES.find((t) => t.id === id)).filter((t): t is HabitTemplate => !!t),
    [],
  );

  const [name, setName] = useState(prefilledTemplate ? templateName(prefilledTemplate) : '');
  const [category, setCategory] = useState<HabitCategory>((prefilledTemplate?.category as HabitCategory) ?? 'general');
  const [content, setContent] = useState<HabitContent | null>(null);
  const [frequency, setFrequency] = useState<string>(prefilledTemplate?.frequency ?? 'daily');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const perWeek = timesPerWeek(frequency);

  const applyIdea = (t: HabitTemplate) => {
    setName(templateName(t));
    setCategory(t.category as HabitCategory);
    setFrequency(t.frequency);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createHabit(name.trim(), category, content, frequency, emoji);
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : T.habit_create_error;
      Alert.alert(T.common_error, message);
    } finally {
      setLoading(false);
    }
  };

  const segment = (active: boolean, label: string, onPress: () => void, testID: string) => (
    <Pressable style={styles.segment} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} testID={testID}>
      {({ pressed }) => (
        <PixelFrame
          pressed={pressed}
          borderColor={active ? colors.primary : colors.border}
          backgroundColor={active ? colors.primary + '22' : colors.surface}
          contentStyle={styles.segmentFace}
        >
          <Text style={[styles.segmentText, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
        </PixelFrame>
      )}
    </Pressable>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backButton}>{T.habit_create_back}</Text>
        </Pressable>
        <Text style={styles.title}>{T.habit_create_title}</Text>
      </View>

      {/* 1. Name, or a one-tap idea */}
      <View style={styles.section}>
        <PixelInput
          label={T.habit_create_name_label}
          placeholder={T.habit_create_name_placeholder}
          value={name}
          onChangeText={setName}
        />
        <View style={styles.labelRow}>
          <Text style={styles.label}>{T.habit_create_ideas}</Text>
          <Pressable onPress={() => router.push('/habit/templates')} hitSlop={8}>
            <Text style={styles.link}>{T.habit_create_all_templates}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
          {ideas.map((t) => (
            <Pressable key={t.id} style={styles.chip} onPress={() => applyIdea(t)} accessibilityRole="button">
              <Text style={styles.chipText}>{templateName(t)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 2. Category: color code instead of emojis */}
      <View style={styles.section}>
        <Text style={styles.label}>{T.habit_create_category}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
          {CATEGORY_ORDER.map((cat) => {
            const color = CATEGORY_CONFIG[cat].color;
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.chip, active && { borderColor: color, backgroundColor: color + '22' }]}
                onPress={() => setCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.chipText, active && { color }]}>{categoryLabel(T, cat)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Frequency: every day, or N times a week */}
      <View style={styles.section}>
        <Text style={styles.label}>{T.habit_create_frequency}</Text>
        <View style={styles.segmented}>
          {segment(perWeek === null, T.habit_create_every_day, () => setFrequency('daily'), 'freq-daily')}
          {segment(perWeek !== null, T.habit_create_some_days, () => perWeek === null && setFrequency('3x_week'), 'freq-weekly')}
        </View>
        {perWeek !== null && (
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setFrequency(`${Math.max(MIN_PER_WEEK, perWeek - 1)}x_week`)}
              accessibilityLabel={T.habit_create_fewer}
              disabled={perWeek <= MIN_PER_WEEK}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue} testID="freq-value">
              {T.habit_create_times_per_week.replace('{n}', String(perWeek))}
            </Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setFrequency(`${Math.min(MAX_PER_WEEK, perWeek + 1)}x_week`)}
              accessibilityLabel={T.habit_create_more}
              disabled={perWeek >= MAX_PER_WEEK}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 4. Everything else, folded */}
      <Pressable style={styles.moreToggle} onPress={() => setShowMore((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showMore }}>
        <Text style={styles.moreText}>{showMore ? T.habit_create_less_options : T.habit_create_more_options}</Text>
      </Pressable>
      {showMore && (
        <>
          <EmojiPicker value={emoji} onChange={setEmoji} label={T.habit_create_emoji} />
          <ContentPicker value={content} onChange={setContent} />
        </>
      )}

      <PixelButton title={T.habit_create_submit} onPress={handleCreate} disabled={loading || !name.trim()} />
    </ScrollView>
  );
}
