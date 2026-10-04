import { goBack } from '../../../lib/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelInput } from '../../../ui/components/pixel-input';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT, lang$, localeTag, type Lang } from '../../../lib/i18n';
import {
  sendSupportMessage,
  fetchMySupportMessages,
  SUPPORT_MAX_LENGTH,
  type SupportCategory,
  type SupportError,
  type SupportMessage,
  type SupportStatus,
} from '../support-service';

const CATEGORIES: SupportCategory[] = ['bug', 'idea', 'other'];

export default function SupportScreen() {
  const T = useT();
  const lang = use$(lang$);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);

  const [category, setCategory] = useState<SupportCategory>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<SupportError | null>(null);
  const [history, setHistory] = useState<SupportMessage[]>([]);

  const categoryLabel: Record<SupportCategory, string> = {
    bug: T.support_cat_bug,
    idea: T.support_cat_idea,
    other: T.support_cat_other,
  };
  const statusLabel: Record<SupportStatus, string> = {
    new: T.support_status_new,
    read: T.support_status_read,
    done: T.support_status_done,
  };
  const errorLabel: Record<SupportError, string> = {
    too_short: T.support_error_short,
    limit: T.support_error_limit,
    network: T.support_error_network,
  };

  const loadHistory = useCallback(() => {
    fetchMySupportMessages().then(setHistory).catch(() => {});
  }, []);
  useEffect(loadHistory, [loadHistory]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    const result = await sendSupportMessage(category, message);
    setSending(false);
    if (result) {
      setError(result);
      return;
    }
    setMessage('');
    setSent(true);
    loadHistory();
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <PixelButton title={T.ctx_back} onPress={() => goBack(router, '/settings')} variant="ghost" />
        <Text style={styles.title}>{T.support_title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.intro}>{T.support_intro}</Text>

      {sent ? (
        <View style={styles.card} testID="support-sent">
          <Text style={styles.sentTitle}>{T.support_sent_title}</Text>
          <Text style={styles.body}>{T.support_sent_body}</Text>
          <PixelButton title={T.support_write_another} onPress={() => setSent(false)} variant="secondary" />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>{T.support_category_label}</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{categoryLabel[c]}</Text>
                </Pressable>
              );
            })}
          </View>

          <PixelInput
            label={T.support_message_label}
            placeholder={category === 'bug' ? T.support_placeholder_bug : T.support_placeholder_other}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={SUPPORT_MAX_LENGTH}
            style={styles.input}
            testID="support-message"
          />
          <Text style={styles.counter}>
            {message.length} / {SUPPORT_MAX_LENGTH}
          </Text>
          {error && <Text style={styles.error}>{errorLabel[error]}</Text>}
          <PixelButton
            title={sending ? T.support_sending : T.support_send}
            onPress={handleSend}
            disabled={sending || message.trim().length === 0}
          />
        </View>
      )}

      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{T.support_history}</Text>
          {history.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.historyHead}>
                <Text style={styles.historyCat}>{categoryLabel[m.category]}</Text>
                <Text style={[styles.status, m.status !== 'new' && styles.statusSeen]}>{statusLabel[m.status]}</Text>
              </View>
              <Text style={styles.body} numberOfLines={3}>
                {m.message}
              </Text>
              <Text style={styles.date}>
                {new Date(m.createdAt).toLocaleDateString(localeTag(lang as Lang), {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
    intro: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.sm), lineHeight: 20 },
    section: { gap: spacing.sm },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    label: {
      color: colors.textSecondary,
      fontSize: pixelSize(fontSizes.xs),
      fontFamily: fonts.bold,
      letterSpacing: 1,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.sm + 2,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
    chipText: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
    chipTextActive: { color: colors.text },
    input: { minHeight: 120, textAlignVertical: 'top' },
    counter: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), textAlign: 'right' },
    error: { color: colors.danger, fontSize: pixelSize(fontSizes.sm) },
    sentTitle: { color: colors.success, fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold },
    body: { color: colors.text, fontSize: pixelSize(fontSizes.sm), lineHeight: 20 },
    historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyCat: { color: colors.text, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
    status: { color: colors.warning, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
    statusSeen: { color: colors.success },
    date: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs) },
  });
}
