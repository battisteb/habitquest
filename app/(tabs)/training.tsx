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
import { colors, spacing, fontSizes, borderRadius } from '../../src/ui/theme/tokens';
import type { StoredSession } from '../../src/features/training/types/session';

const CATEGORY_ICONS: Record<string, string> = {
  fitness: '💪',
  health: '💚',
  mindfulness: '🧘',
  learning: '📚',
  general: '⭐',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SessionCard({
  session,
  onStart,
  onDelete,
}: {
  session: StoredSession;
  onStart: () => void;
  onDelete: () => void;
}) {
  const { data } = session;
  const icon = CATEGORY_ICONS[data.category] ?? '⭐';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
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
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
      {data.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{data.description}</Text>
      ) : null}
      <View style={styles.exercisePreview}>
        {data.exercises.slice(0, 4).map((ex, i) => (
          <Text key={i} style={styles.exerciseChip} numberOfLines={1}>
            {ex.name}
          </Text>
        ))}
        {data.exercises.length > 4 && (
          <Text style={styles.exerciseMore}>+{data.exercises.length - 4}</Text>
        )}
      </View>
      <Pressable style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>▶  START SESSION</Text>
      </Pressable>
    </View>
  );
}

async function pickAndImport(onSuccess: (session: StoredSession) => void) {
  try {
    // expo-document-picker
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;

    // Read file content
    let text: string;
    if (Platform.OS === 'web') {
      // On web, fetch the blob URL
      const response = await fetch(uri);
      text = await response.text();
    } else {
      const FileSystem = await import('expo-file-system');
      text = await FileSystem.readAsStringAsync(uri);
    }

    const json = JSON.parse(text);
    const session = importSession(json);
    onSuccess(session);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not import file';
    Alert.alert('Import failed', msg);
  }
}

export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sessions = use$(sessionsStore$.sessions);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const handleImport = async () => {
    setImporting(true);
    await pickAndImport((session) => {
      Alert.alert('Imported!', `"${session.data.title}" added to your training library.`);
    });
    setImporting(false);
  };

  const handleDelete = (session: StoredSession) => {
    Alert.alert(
      'Delete session?',
      `Remove "${session.data.title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(session.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TRAINING</Text>
          <Text style={styles.subtitle}>
            {sessions.length === 0
              ? 'No sessions yet'
              : `${sessions.length} session${sessions.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable
          style={[styles.importButton, importing && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>
            {importing ? 'IMPORTING…' : '+ IMPORT'}
          </Text>
        </Pressable>
      </View>

      {sessions.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No sessions imported</Text>
          <Text style={styles.emptyText}>
            Create a JSON session file on your computer and import it here.
          </Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>SESSION FORMAT (JSON)</Text>
            <Text style={styles.exampleCode}>{`{
  "version": 1,
  "title": "Push Day",
  "category": "fitness",
  "estimated_duration": 45,
  "exercises": [
    {
      "name": "Bench Press",
      "type": "reps",
      "sets": 4,
      "reps": 8,
      "rest": 90
    },
    {
      "name": "Plank",
      "type": "timer",
      "duration": 60,
      "sets": 3,
      "rest": 30
    }
  ]
}`}</Text>
          </View>
          <Pressable style={styles.importButtonLarge} onPress={handleImport}>
            <Text style={styles.importButtonLargeText}>+ IMPORT YOUR FIRST SESSION</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onStart={() => router.push(`/training/${session.id}`)}
              onDelete={() => handleDelete(session)}
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
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  importButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  importButtonDisabled: { opacity: 0.5 },
  importButtonText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  // Card
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
  cardIcon: { fontSize: 28, lineHeight: 32 },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: fontSizes.md, fontWeight: 'bold' },
  cardMeta: { color: colors.textMuted, fontSize: fontSizes.xs },
  cardLast: { color: colors.textMuted, fontSize: fontSizes.xs, fontStyle: 'italic' },
  cardDescription: { color: colors.textSecondary, fontSize: fontSizes.sm },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: colors.textMuted, fontSize: fontSizes.md },
  exercisePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  exerciseChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  exerciseMore: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    alignSelf: 'center',
    marginLeft: 2,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  startButtonText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  // Empty state
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: fontSizes.lg, fontWeight: 'bold' },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  exampleBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exampleTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
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
    marginTop: spacing.sm,
  },
  importButtonLargeText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.sm,
    letterSpacing: 1,
  },
});
