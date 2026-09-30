import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { decksStore$, recordReview, getDueCards } from '../../../src/features/training/stores/decks-store';
import { completeHabit, habitsStore$ } from '../../../src/features/habits/stores/habits-store';
import { colors, spacing, fontSizes, borderRadius, fonts, pixelSize } from '../../../src/ui/theme/tokens';
import { useTheme } from '../../../src/ui/theme/theme-context';
import { useT } from '../../../src/lib/i18n';

type Quality = 0 | 1 | 2 | 3;

type QualityKey = 'blackout' | 'hard' | 'good' | 'easy';

const QUALITY_BUTTONS: { key: QualityKey; quality: Quality; color: string }[] = [
  { key: 'blackout', quality: 0, color: '#c0392b' },
  { key: 'hard',     quality: 1, color: '#e67e22' },
  { key: 'good',     quality: 2, color: '#27ae60' },
  { key: 'easy',     quality: 3, color: '#2980b9' },
];

export default function DeckReviewScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorText: { color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  backText: { color: colors.textMuted, fontSize: fontSizes.xl, width: 32, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  deckTitle: { color: colors.text, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, letterSpacing: 1 },
  deckProgress: { color: colors.textMuted, fontSize: fontSizes.xs },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.xp,
    borderRadius: 0,
  },
  cardContainer: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    minHeight: 240,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cardFlipped: {
    borderColor: colors.xp,
  },
  cardContent: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  cardSide: {
    color: colors.textMuted,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  cardText: {
    color: colors.text,
    fontSize: pixelSize(fontSizes.xl + 4),
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: pixelSize(36),
  },
  cardHint: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  cardFrontSmall: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  cardAnswer: {
    color: colors.xp,
    fontSize: pixelSize(fontSizes.xl + 4),
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: pixelSize(36),
  },
  ratingSection: { gap: spacing.sm },
  ratingLabel: {
    color: colors.textMuted,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 2,
    textAlign: 'center',
  },
  ratingGrid: { flexDirection: 'row', gap: spacing.xs },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    backgroundColor: colors.surface,
    gap: 2,
  },
  ratingBtnLabel: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  ratingBtnSub: { color: colors.textMuted, fontSize: 9 },
  // Finish
  finishContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  finishEmoji: { fontSize: 64 },
  finishTitle: { color: colors.xp, fontSize: pixelSize(fontSizes.xxl), fontFamily: fonts.bold, letterSpacing: 4 },
  finishDeck: { color: colors.text, fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold },
  finishStats: { color: colors.textSecondary, fontSize: fontSizes.sm },
  habitLink: { width: '100%', gap: spacing.sm },
  habitLinkLabel: {
    color: colors.textMuted,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  habitLinkRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' },
  habitChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  habitChipSelected: { borderColor: colors.xp, backgroundColor: colors.xp + '22' },
  habitChipText: { color: colors.text, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, maxWidth: 120 },
  finishButton: {
    backgroundColor: colors.xp,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: '#5a4ec4',
    borderBottomWidth: 4,
    marginTop: spacing.md,
  },
  finishButtonText: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md), letterSpacing: 2 },
  // Up to date
  upToDate: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  upToDateEmoji: { fontSize: 64 },
  upToDateTitle: { color: colors.success, fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold },
  upToDateSub: { color: colors.textSecondary, fontSize: fontSizes.sm, textAlign: 'center' },
  upToDateNext: { color: colors.textMuted, fontSize: fontSizes.xs, fontStyle: 'italic' },
}), [themeKey]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const decks = use$(decksStore$.decks);
  const habits = use$(habitsStore$.habits);

  const deck = decks.find((d) => d.id === id);

  const [queue, ] = useState<number[]>(() => {
    if (!deck) return [];
    const due = getDueCards(deck);
    // Shuffle due cards
    return [...due].sort(() => Math.random() - 0.5);
  });

  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [linkedHabitId, setLinkedHabitId] = useState<string | null>(null);

  const currentCardIndex = queue[pos];
  const currentCard = deck?.data.cards[currentCardIndex];

  const handleRate = useCallback((quality: Quality) => {
    if (!deck || currentCardIndex === undefined) return;
    recordReview(deck.id, currentCardIndex, quality);
    const next = pos + 1;
    setReviewed((r) => r + 1);
    if (next >= queue.length) {
      setFinished(true);
    } else {
      setPos(next);
      setFlipped(false);
    }
  }, [deck, currentCardIndex, pos, queue.length]);

  const handleFinish = async () => {
    if (linkedHabitId) {
      await completeHabit(linkedHabitId).catch(() => {});
    }
    router.back();
  };

  if (!deck) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{T.deck_not_found}</Text>
      </View>
    );
  }

  if (queue.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{T.deck_back}</Text>
        </Pressable>
        <View style={styles.upToDate}>
          <Text style={styles.upToDateEmoji}>✅</Text>
          <Text style={styles.upToDateTitle}>{T.deck_caught_up}</Text>
          <Text style={styles.upToDateSub}>
            {T.deck_no_cards_due.replace('{title}', deck.data.title)}
          </Text>
          <Text style={styles.upToDateNext}>
            {T.deck_next_review} {deck.srsStates.length > 0
              ? deck.srsStates
                  .map((s) => s.dueDate)
                  .sort()[0]
              : '—'}
          </Text>
        </View>
      </View>
    );
  }

  if (finished) {
    const learnHabits = habits.filter(
      (h) => h.category === 'learning' || h.category === deck.data.category,
    );
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.finishContainer}>
          <Text style={styles.finishEmoji}>🎓</Text>
          <Text style={styles.finishTitle}>{T.deck_session_done}</Text>
          <Text style={styles.finishDeck}>{deck.data.title}</Text>
          <Text style={styles.finishStats}>
            {(reviewed === 1 ? T.deck_reviewed_one : T.deck_reviewed_many).replace('{n}', String(reviewed))}
          </Text>

          {learnHabits.length > 0 && (
            <View style={styles.habitLink}>
              <Text style={styles.habitLinkLabel}>{T.deck_award_xp}</Text>
              <View style={styles.habitLinkRow}>
                {learnHabits.slice(0, 3).map((h) => (
                  <Pressable
                    key={h.id}
                    style={[
                      styles.habitChip,
                      linkedHabitId === h.id && styles.habitChipSelected,
                    ]}
                    onPress={() => setLinkedHabitId(linkedHabitId === h.id ? null : h.id)}
                  >
                    <Text style={styles.habitChipText} numberOfLines={1}>{h.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>
              {linkedHabitId ? T.deck_finish_xp : T.deck_finish}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (!currentCard) return null;

  const progress = pos / queue.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => Alert.alert(T.deck_quit_title, T.deck_quit_msg, [
          { text: T.deck_cancel, style: 'cancel' },
          { text: T.deck_quit, onPress: () => router.back() },
        ])}>
          <Text style={styles.backText}>✕</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.deckTitle} numberOfLines={1}>{deck.data.title}</Text>
          <Text style={styles.deckProgress}>{pos + 1} / {queue.length}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.cardContainer} bounces={false}>
        {/* Card */}
        <Pressable
          style={[styles.card, flipped && styles.cardFlipped]}
          onPress={() => setFlipped(true)}
        >
          {!flipped ? (
            <View style={styles.cardContent}>
              <Text style={styles.cardSide}>{T.deck_question}</Text>
              <Text style={styles.cardText}>{currentCard.front}</Text>
              {currentCard.hint && (
                <Text style={styles.cardHint}>💡 {currentCard.hint}</Text>
              )}
              <Text style={styles.tapHint}>{T.deck_tap_reveal}</Text>
            </View>
          ) : (
            <View style={styles.cardContent}>
              <Text style={styles.cardSide}>{T.deck_answer}</Text>
              <Text style={styles.cardFrontSmall}>{currentCard.front}</Text>
              <Text style={styles.cardAnswer}>{currentCard.back}</Text>
            </View>
          )}
        </Pressable>

        {/* Rating buttons (only after flip) */}
        {flipped && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>{T.deck_how_did_it_go}</Text>
            <View style={styles.ratingGrid}>
              {QUALITY_BUTTONS.map((btn) => (
                <Pressable
                  key={btn.quality}
                  style={[styles.ratingBtn, { borderColor: btn.color }]}
                  onPress={() => handleRate(btn.quality)}
                >
                  <Text style={[styles.ratingBtnLabel, { color: btn.color }]}>
                    {T[`deck_q_${btn.key}`]}
                  </Text>
                  <Text style={styles.ratingBtnSub}>{T[`deck_q_${btn.key}_sub`]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


