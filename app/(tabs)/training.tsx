import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useT } from '../../src/lib/i18n';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import {
  sessionsStore$,
  loadSessions,
  importSession,
  deleteSession,
} from '../../src/features/training/stores/sessions-store';
import {
  decksStore$,
  loadDecks,
  importDeck,
  deleteDeck,
  getDueCards,
} from '../../src/features/training/stores/decks-store';
import { isValidSessionFile } from '../../src/features/training/types/session';
import { isValidDeckFile } from '../../src/features/training/types/flashcard';
import { colors, spacing, fontSizes, borderRadius } from '../../src/ui/theme/tokens';
import type { StoredSession } from '../../src/features/training/types/session';
import type { StoredDeck } from '../../src/features/training/types/flashcard';
import { useTheme } from '../../src/ui/theme/theme-context';

type TabKey = 'sessions' | 'decks';

const CATEGORY_ICONS: Record<string, string> = {
  fitness: '💪', health: '💚', mindfulness: '🧘',
  learning: '📚', general: '⭐',
};

function formatDate(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Smart import: detects session vs deck ───────────────────────────────────
async function pickAndImport(
  onSession: (s: StoredSession) => void,
  onDeck: (d: StoredDeck) => void,
  errorTitle: string,
  invalidMsg: string,
) {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    let text: string;
    if (Platform.OS === 'web') {
      text = await (await fetch(uri)).text();
    } else {
      const FileSystem = await import('expo-file-system');
      text = await FileSystem.readAsStringAsync(uri);
    }

    const json = JSON.parse(text);

    if (isValidSessionFile(json)) {
      onSession(importSession(json));
    } else if (isValidDeckFile(json)) {
      onDeck(importDeck(json));
    } else {
      Alert.alert(errorTitle, invalidMsg);
    }
  } catch (e: unknown) {
    Alert.alert(errorTitle, e instanceof Error ? e.message : invalidMsg);
  }
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onStart, onDelete }: {
  session: StoredSession; onStart: () => void; onDelete: () => void;
}) {
  const T = useT();
  const styles = createStyles();
  const { data } = session;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{CATEGORY_ICONS[data.category] ?? '⭐'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{data.title}</Text>
          <Text style={styles.cardMeta}>
            {T.training_exercises.replace('{n}', String(data.exercises.length))}
            {data.estimated_duration ? `  ·  ${T.training_duration_min.replace('{n}', String(data.estimated_duration))}` : ''}
            {session.completedCount > 0 ? `  ·  ${T.training_times.replace('{n}', String(session.completedCount))}` : ''}
          </Text>
          {session.lastCompletedAt && (
            <Text style={styles.cardLast}>{T.training_last.replace('{date}', formatDate(session.lastCompletedAt, T.training_never))}</Text>
          )}
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
      {data.description ? <Text style={styles.cardDesc} numberOfLines={1}>{data.description}</Text> : null}
      <View style={styles.chips}>
        {data.exercises.slice(0, 4).map((ex, i) => (
          <Text key={i} style={styles.chip} numberOfLines={1}>{ex.name}</Text>
        ))}
        {data.exercises.length > 4 && <Text style={styles.chipMore}>+{data.exercises.length - 4}</Text>}
      </View>
      <Pressable style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>{T.training_start_btn}</Text>
      </Pressable>
    </View>
  );
}

// ─── Deck card ────────────────────────────────────────────────────────────────
function DeckCard({ deck, onStudy, onDelete }: {
  deck: StoredDeck; onStudy: () => void; onDelete: () => void;
}) {
  const T = useT();
  const styles = createStyles();
  const dueCount = getDueCards(deck).length;
  const totalCards = deck.data.cards.length;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{CATEGORY_ICONS[deck.data.category] ?? '📚'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{deck.data.title}</Text>
          <Text style={styles.cardMeta}>
            {T.training_cards.replace('{n}', String(totalCards))}
            {deck.totalReviews > 0 ? `  ·  ${T.training_reviews.replace('{n}', String(deck.totalReviews))}` : ''}
          </Text>
          <Text style={styles.cardLast}>{T.training_last_studied.replace('{date}', formatDate(deck.lastStudiedAt, T.training_never))}</Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
      {deck.data.description ? <Text style={styles.cardDesc} numberOfLines={1}>{deck.data.description}</Text> : null}
      <View style={styles.dueRow}>
        <View style={[styles.dueBadge, dueCount === 0 && styles.dueBadgeDone]}>
          <Text style={[styles.dueBadgeText, dueCount === 0 && styles.dueBadgeTextDone]}>
            {dueCount === 0 ? T.training_up_to_date : T.training_due_today.replace('{n}', String(dueCount))}
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.startButton, styles.studyButton, dueCount === 0 && styles.studyButtonDisabled]}
        onPress={onStudy}
        disabled={dueCount === 0}
      >
        <Text style={styles.startButtonText}>
          {dueCount === 0 ? T.training_nothing_due : T.training_study_btn.replace('{n}', String(dueCount))}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ tab, onImport }: { tab: TabKey; onImport: () => void }) {
  const T = useT();
  const styles = createStyles();
  const isSession = tab === 'sessions';
  return (
    <ScrollView contentContainerStyle={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{isSession ? '🏋️' : '🃏'}</Text>
      <Text style={styles.emptyTitle}>
        {isSession ? T.training_empty_sessions_title : T.training_empty_decks_title}
      </Text>
      <Text style={styles.emptyText}>
        {isSession ? T.training_empty_sessions_text : T.training_empty_decks_text}
      </Text>
      <View style={styles.exampleBox}>
        <Text style={styles.exampleTitle}>
          {isSession ? T.training_empty_sessions_format : T.training_empty_decks_format}
        </Text>
        <Text style={styles.exampleCode}>
          {isSession
            ? `{\n  "version": 1,\n  "title": "Push Day",\n  "category": "fitness",\n  "exercises": [\n    { "name": "Bench", "type": "reps",\n      "sets": 4, "reps": 8, "rest": 90 },\n    { "name": "Plank", "type": "timer",\n      "duration": 60, "sets": 3, "rest": 30 }\n  ]\n}`
            : `{\n  "version": 1,\n  "title": "Spanish B1",\n  "category": "learning",\n  "cards": [\n    { "front": "el agua",\n      "back": "water",\n      "hint": "feminine" },\n    { "front": "correr",\n      "back": "to run" }\n  ]\n}`}
        </Text>
      </View>
      <Pressable style={styles.importButtonLarge} onPress={onImport}>
        <Text style={styles.importButtonLargeText}>{T.training_import_btn}</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TrainingScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sessions = use$(sessionsStore$.sessions);
  const decks = use$(decksStore$.decks);
  const [tab, setTab] = useState<TabKey>('sessions');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadSessions();
    loadDecks();
  }, []);

  const handleImport = async () => {
    setImporting(true);
    await pickAndImport(
      (s) => {
        setTab('sessions');
        Alert.alert(T.training_session_imported, T.training_session_imported_msg.replace('{title}', s.data.title));
      },
      (d) => {
        setTab('decks');
        Alert.alert(T.training_deck_imported, T.training_deck_imported_msg.replace('{title}', d.data.title).replace('{n}', String(d.data.cards.length)));
      },
      T.training_import_failed,
      T.training_import_invalid,
    );
    setImporting(false);
  };

  const confirmDelete = (title: string, onConfirm: () => void) => {
    Alert.alert(T.training_delete_title, T.training_delete_msg.replace('{title}', title), [
      { text: T.training_delete_cancel, style: 'cancel' },
      { text: T.training_delete_confirm, style: 'destructive', onPress: onConfirm },
    ]);
  };

  const totalItems = sessions.length + decks.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{T.training_title}</Text>
          <Text style={styles.subtitle}>
            {totalItems === 0 ? T.training_subtitle_empty :
              T.training_subtitle
                .replace('{sessions}', String(sessions.length))
                .replace('{ss}', sessions.length !== 1 ? 's' : '')
                .replace('{decks}', String(decks.length))
                .replace('{ds}', decks.length !== 1 ? 's' : '')}
          </Text>
        </View>
        <Pressable
          style={[styles.importButton, importing && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>{importing ? T.training_importing : T.training_import_btn}</Text>
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        {(['sessions', 'decks'] as TabKey[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'sessions' ? T.training_tab_sessions.replace('{n}', String(sessions.length)) : T.training_tab_decks.replace('{n}', String(decks.length))}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {tab === 'sessions' && (
        sessions.length === 0
          ? <EmptyState tab="sessions" onImport={handleImport} />
          : <ScrollView contentContainerStyle={styles.list}>
              {sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onStart={() => router.push(`/training/${s.id}`)}
                  onDelete={() => confirmDelete(s.data.title, () => deleteSession(s.id))}
                />
              ))}
            </ScrollView>
      )}

      {tab === 'decks' && (
        decks.length === 0
          ? <EmptyState tab="decks" onImport={handleImport} />
          : <ScrollView contentContainerStyle={styles.list}>
              {decks.map((d) => (
                <DeckCard
                  key={d.id}
                  deck={d}
                  onStudy={() => router.push(`/training/deck/${d.id}`)}
                  onDelete={() => confirmDelete(d.data.title, () => deleteDeck(d.id))}
                />
              ))}
            </ScrollView>
      )}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.text, letterSpacing: 2 },
  subtitle: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  importButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  importButtonDisabled: { opacity: 0.5 },
  importButtonText: { color: colors.primary, fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: colors.border },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -2,
  },
  tabItemActive: { borderBottomColor: colors.primary },
  tabLabel: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1 },
  tabLabelActive: { color: colors.primary },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardIcon: { fontSize: 26, lineHeight: 30 },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: fontSizes.md, fontWeight: 'bold' },
  cardMeta: { color: colors.textMuted, fontSize: fontSizes.xs },
  cardLast: { color: colors.textMuted, fontSize: fontSizes.xs, fontStyle: 'italic' },
  cardDesc: { color: colors.textSecondary, fontSize: fontSizes.xs },
  deleteBtnText: { color: colors.textMuted, fontSize: fontSizes.md, padding: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  chipMore: { color: colors.textMuted, fontSize: fontSizes.xs, alignSelf: 'center' },
  dueRow: { flexDirection: 'row' },
  dueBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.xp + '33',
    borderWidth: 1,
    borderColor: colors.xp,
  },
  dueBadgeDone: { backgroundColor: colors.success + '22', borderColor: colors.success },
  dueBadgeText: { color: colors.xp, fontSize: fontSizes.xs, fontWeight: 'bold' },
  dueBadgeTextDone: { color: colors.success },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  studyButton: { backgroundColor: colors.xp, borderColor: '#5a4ec4' },
  studyButtonDisabled: { backgroundColor: colors.surface, borderColor: colors.border, borderBottomWidth: 2, opacity: 0.5 },
  startButtonText: { color: colors.text, fontSize: fontSizes.sm, fontWeight: 'bold', letterSpacing: 2 },
  // Empty
  emptyContainer: { padding: spacing.lg, alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: fontSizes.lg, fontWeight: 'bold' },
  emptyText: { color: colors.textSecondary, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 },
  exampleBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
  },
  exampleTitle: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1, marginBottom: spacing.xs },
  exampleCode: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  importButtonLarge: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
  },
  importButtonLargeText: { color: colors.text, fontWeight: 'bold', fontSize: fontSizes.sm, letterSpacing: 1 },
});
}
