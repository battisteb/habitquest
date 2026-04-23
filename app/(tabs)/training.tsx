import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
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

type TabKey = 'sessions' | 'decks';

const CATEGORY_ICONS: Record<string, string> = {
  fitness: '💪', health: '💚', mindfulness: '🧘',
  learning: '📚', general: '⭐',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Smart import: detects session vs deck ───────────────────────────────────
async function pickAndImport(
  onSession: (s: StoredSession) => void,
  onDeck: (d: StoredDeck) => void,
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
      Alert.alert('Import failed', 'File is not a valid session or flashcard deck.');
    }
  } catch (e: unknown) {
    Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not import file');
  }
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onStart, onDelete }: {
  session: StoredSession; onStart: () => void; onDelete: () => void;
}) {
  const { data } = session;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{CATEGORY_ICONS[data.category] ?? '⭐'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{data.title}</Text>
          <Text style={styles.cardMeta}>
            {data.exercises.length} exercises
            {data.estimated_duration ? `  ·  ~${data.estimated_duration} min` : ''}
            {session.completedCount > 0 ? `  ·  ×${session.completedCount}` : ''}
          </Text>
          {session.lastCompletedAt && (
            <Text style={styles.cardLast}>Last: {formatDate(session.lastCompletedAt)}</Text>
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
        <Text style={styles.startButtonText}>▶  START</Text>
      </Pressable>
    </View>
  );
}

// ─── Deck card ────────────────────────────────────────────────────────────────
function DeckCard({ deck, onStudy, onDelete }: {
  deck: StoredDeck; onStudy: () => void; onDelete: () => void;
}) {
  const dueCount = getDueCards(deck).length;
  const totalCards = deck.data.cards.length;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{CATEGORY_ICONS[deck.data.category] ?? '📚'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{deck.data.title}</Text>
          <Text style={styles.cardMeta}>
            {totalCards} cards
            {deck.totalReviews > 0 ? `  ·  ${deck.totalReviews} reviews` : ''}
          </Text>
          <Text style={styles.cardLast}>Last studied: {formatDate(deck.lastStudiedAt)}</Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
      {deck.data.description ? <Text style={styles.cardDesc} numberOfLines={1}>{deck.data.description}</Text> : null}
      <View style={styles.dueRow}>
        <View style={[styles.dueBadge, dueCount === 0 && styles.dueBadgeDone]}>
          <Text style={[styles.dueBadgeText, dueCount === 0 && styles.dueBadgeTextDone]}>
            {dueCount === 0 ? '✓ Up to date' : `${dueCount} due today`}
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.startButton, styles.studyButton, dueCount === 0 && styles.studyButtonDisabled]}
        onPress={onStudy}
        disabled={dueCount === 0}
      >
        <Text style={styles.startButtonText}>
          {dueCount === 0 ? 'NOTHING DUE' : `▶  STUDY (${dueCount})`}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ tab, onImport }: { tab: TabKey; onImport: () => void }) {
  const isSession = tab === 'sessions';
  return (
    <ScrollView contentContainerStyle={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{isSession ? '🏋️' : '🃏'}</Text>
      <Text style={styles.emptyTitle}>
        {isSession ? 'No sessions yet' : 'No decks yet'}
      </Text>
      <Text style={styles.emptyText}>
        {isSession
          ? 'Create a JSON file with your workout and import it here.'
          : 'Create a JSON flashcard deck on your PC and import it here.'}
      </Text>
      <View style={styles.exampleBox}>
        <Text style={styles.exampleTitle}>
          {isSession ? 'SESSION FORMAT' : 'DECK FORMAT'}
        </Text>
        <Text style={styles.exampleCode}>
          {isSession
            ? `{\n  "version": 1,\n  "title": "Push Day",\n  "category": "fitness",\n  "exercises": [\n    { "name": "Bench", "type": "reps",\n      "sets": 4, "reps": 8, "rest": 90 },\n    { "name": "Plank", "type": "timer",\n      "duration": 60, "sets": 3, "rest": 30 }\n  ]\n}`
            : `{\n  "version": 1,\n  "title": "Spanish B1",\n  "category": "learning",\n  "cards": [\n    { "front": "el agua",\n      "back": "water",\n      "hint": "feminine" },\n    { "front": "correr",\n      "back": "to run" }\n  ]\n}`}
        </Text>
      </View>
      <Pressable style={styles.importButtonLarge} onPress={onImport}>
        <Text style={styles.importButtonLargeText}>+ IMPORT</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TrainingScreen() {
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
        Alert.alert('Session imported!', `"${s.data.title}" added.`);
      },
      (d) => {
        setTab('decks');
        Alert.alert('Deck imported!', `"${d.data.title}" — ${d.data.cards.length} cards.`);
      },
    );
    setImporting(false);
  };

  const confirmDelete = (title: string, onConfirm: () => void) => {
    Alert.alert('Delete?', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const totalItems = sessions.length + decks.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TRAINING</Text>
          <Text style={styles.subtitle}>
            {totalItems === 0 ? 'Nothing imported yet' :
              `${sessions.length} session${sessions.length !== 1 ? 's' : ''}  ·  ${decks.length} deck${decks.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable
          style={[styles.importButton, importing && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>{importing ? '…' : '+ IMPORT'}</Text>
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
              {t === 'sessions' ? `💪 SESSIONS (${sessions.length})` : `🃏 DECKS (${decks.length})`}
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

const styles = StyleSheet.create({
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
