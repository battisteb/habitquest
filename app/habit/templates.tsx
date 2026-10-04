import { goBack } from '../../src/lib/navigation';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, borderRadius, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT, lang$ } from '../../src/lib/i18n';
import { HABIT_TEMPLATES, templateName } from '../../src/lib/constants/habit-templates';
import { CATEGORY_CONFIG } from '../../src/lib/constants/categories';
import { categoryLabel } from '../../src/lib/i18n/labels';
import { use$ } from '@legendapp/state/react';

const CATEGORY_FILTERS = ['all', 'health', 'fitness', 'mindfulness', 'learning', 'productivity', 'nutrition', 'sleep', 'social', 'creativity', 'finance'] as const;

export default function HabitTemplatesScreen() {
  const T = useT();
  const lang = use$(lang$);
  const { themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backBtn: {
      color: colors.primary,
      fontSize: pixelSize(fontSizes.sm),
      fontFamily: fonts.bold,
      letterSpacing: 1,
    },
    title: {
      flex: 1,
      fontSize: pixelSize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
      letterSpacing: 2,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      fontSize: fontSizes.sm,
    },
    filterScroll: { flexGrow: 0, flexShrink: 0 },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    chip: {
      alignSelf: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '22',
    },
    chipText: {
      fontSize: pixelSize(fontSizes.xs),
      fontFamily: fonts.bold,
      color: colors.textMuted,
    },
    chipTextActive: { color: colors.primary },
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    itemPressed: { opacity: 0.7 },
    itemEmoji: { fontSize: 28 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.text },
    itemCategory: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1, marginTop: 2 },
    itemFreq: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.sm,
      borderWidth: 2,
      borderColor: colors.primaryDark,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    addBtnText: { color: colors.text, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
  }), [themeKey]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HABIT_TEMPLATES.filter((t) => {
      const name = templateName(t, lang);
      const matchSearch = !q || name.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [search, selectedCategory, lang]);

  function handleSelect(templateId: string) {
    router.push({ pathname: '/habit/create', params: { templateId } });
  }

  function freqLabel(freq: string): string {
    if (freq === 'daily') return T.habit_create_every_day;
    const n = /^(\d)x_week$/.exec(freq)?.[1];
    return n ? T.habit_freq_per_week.replace('{n}', n) : freq;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Pressable onPress={() => goBack(router)}>
            <Text style={styles.backBtn}>{T.common_back}</Text>
          </Pressable>
          <Text style={styles.title}>{T.templates_title}</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={T.templates_search}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category filters. A horizontal list must not grow: as a FlatList it took
          half the screen and blew the chips up. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = selectedCategory === cat;
          const cfg = cat !== 'all' ? CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG] : null;
          const label = cat === 'all'
            ? T.templates_all
            : categoryLabel(T, cat).toUpperCase();
          return (
            <Pressable
              key={cat}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[styles.chip, isActive && styles.chipActive, isActive && cfg ? { borderColor: cfg.color, backgroundColor: cfg.color + '22' } : {}]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive, isActive && cfg ? { color: cfg.color } : {}]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Template list */}
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const name = templateName(item, lang);
          const catCfg = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG];
          return (
            <Pressable
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => handleSelect(item.id)}
            >
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{name}</Text>
                <Text style={[styles.itemCategory, { color: catCfg?.color ?? colors.textMuted }]}>
                  {categoryLabel(T, item.category).toUpperCase()}
                </Text>
                <Text style={styles.itemFreq}>{freqLabel(item.frequency)}</Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => handleSelect(item.id)}>
                <Text style={styles.addBtnText}>{T.templates_add}</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
