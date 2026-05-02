import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';
import { useT } from '../../../lib/i18n';

interface CompletionNoteModalProps {
  visible: boolean;
  habitName: string;
  onSave: (note: string) => void;
  onSkip: () => void;
}

const MAX_NOTE_LENGTH = 140;

export function CompletionNoteModal({ visible, habitName, onSave, onSkip }: CompletionNoteModalProps) {
  const T = useT();
  const [note, setNote] = useState('');

  function handleSave() {
    const trimmed = note.trim();
    onSave(trimmed);
    setNote('');
  }

  function handleSkip() {
    onSkip();
    setNote('');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleSkip} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>{T.note_modal_title}</Text>
          <Text style={styles.habitName} numberOfLines={1}>{habitName}</Text>

          <TextInput
            style={styles.input}
            placeholder={T.note_modal_placeholder}
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={(t) => setNote(t.slice(0, MAX_NOTE_LENGTH))}
            multiline
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
            returnKeyType="done"
            blurOnSubmit
          />
          <Text style={styles.charCount}>{note.length}/{MAX_NOTE_LENGTH}</Text>

          <View style={styles.buttons}>
            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>{T.note_modal_skip}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !note.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!note.trim()}
            >
              <Text style={styles.saveText}>{T.note_modal_save}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  emoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 1,
  },
  habitName: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSizes.md,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: spacing.xs,
  },
  charCount: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skipBtn: {
    flex: 1,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
  },
  skipText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 2,
    padding: spacing.sm,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
