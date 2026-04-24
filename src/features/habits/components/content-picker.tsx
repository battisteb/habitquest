import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import type { HabitContent, HabitContentType, ChecklistItem } from '../types/habit-content';
import { CONTENT_TYPE_CONFIG } from '../types/habit-content';
import { useTheme } from '../../../ui/theme/theme-context';

interface ContentPickerProps {
  value: HabitContent | null;
  onChange: (content: HabitContent | null) => void;
}

const DURATION_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 },
  { label: '45 min', seconds: 2700 },
  { label: '1 h', seconds: 3600 },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0 && s > 0) return `${m}min ${s}s`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
}

export function ContentPicker({ value, onChange }: ContentPickerProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  typeChipIcon: {
    fontSize: 20,
  },
  typeChipLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  typeChipLabelSelected: {
    color: colors.primary,
  },
  configBox: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  subLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  presetChipSelected: {
    borderColor: colors.xp,
    backgroundColor: colors.xp + '22',
  },
  presetChipText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  presetChipTextSelected: {
    color: colors.xp,
  },
  durationPreview: {
    color: colors.xp,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  checklistBullet: {
    color: colors.primary,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl,
    width: 12,
  },
  checklistItemLabel: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  removeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    lineHeight: fontSizes.lg,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  addInput: {
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginTop: -2,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
}), [themeKey]);
  const [selectedType, setSelectedType] = useState<HabitContentType | null>(
    value?.type ?? null,
  );

  // Timer state
  const [timerLabel, setTimerLabel] = useState(
    value?.type === 'timer' ? value.label : '',
  );
  const [timerDuration, setTimerDuration] = useState(
    value?.type === 'timer' ? value.duration : 60,
  );

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    value?.type === 'checklist' ? value.items : [],
  );
  const [newItemLabel, setNewItemLabel] = useState('');

  // Link state
  const [linkUrl, setLinkUrl] = useState(
    value?.type === 'link' ? value.url : '',
  );
  const [linkLabel, setLinkLabel] = useState(
    value?.type === 'link' ? value.label : '',
  );

  function selectType(type: HabitContentType) {
    setSelectedType(type);
    // Sync to parent with current state for this type
    applyChange(type);
  }

  function clearContent() {
    setSelectedType(null);
    onChange(null);
  }

  function applyChange(type: HabitContentType) {
    if (type === 'timer') {
      onChange({ type: 'timer', duration: timerDuration, label: timerLabel || 'Timer' });
    } else if (type === 'checklist') {
      if (checklistItems.length > 0) {
        onChange({ type: 'checklist', items: checklistItems });
      }
    } else if (type === 'link') {
      if (linkUrl.trim()) {
        onChange({ type: 'link', url: linkUrl.trim(), label: linkLabel || linkUrl.trim() });
      }
    }
  }

  function onTimerDurationChange(seconds: number) {
    setTimerDuration(seconds);
    if (selectedType === 'timer') {
      onChange({ type: 'timer', duration: seconds, label: timerLabel || 'Timer' });
    }
  }

  function onTimerLabelChange(label: string) {
    setTimerLabel(label);
    if (selectedType === 'timer') {
      onChange({ type: 'timer', duration: timerDuration, label: label || 'Timer' });
    }
  }

  function addChecklistItem() {
    if (!newItemLabel.trim()) return;
    const item: ChecklistItem = {
      id: Date.now().toString(),
      label: newItemLabel.trim(),
    };
    const updated = [...checklistItems, item];
    setChecklistItems(updated);
    setNewItemLabel('');
    if (selectedType === 'checklist') {
      onChange({ type: 'checklist', items: updated });
    }
  }

  function removeChecklistItem(id: string) {
    const updated = checklistItems.filter((i) => i.id !== id);
    setChecklistItems(updated);
    if (selectedType === 'checklist') {
      onChange(updated.length > 0 ? { type: 'checklist', items: updated } : null);
    }
  }

  function onLinkChange(url: string, label: string) {
    if (selectedType === 'link' && url.trim()) {
      onChange({ type: 'link', url: url.trim(), label: label || url.trim() });
    } else if (selectedType === 'link') {
      onChange(null);
    }
  }

  return (
    <View style={styles.container}>
      {/* Type selector */}
      <Text style={styles.sectionLabel}>CONTENT (OPTIONAL)</Text>
      <View style={styles.typeRow}>
        {(Object.keys(CONTENT_TYPE_CONFIG) as HabitContentType[]).map((type) => {
          const cfg = CONTENT_TYPE_CONFIG[type];
          const isSelected = selectedType === type;
          return (
            <Pressable
              key={type}
              style={[styles.typeChip, isSelected && styles.typeChipSelected]}
              onPress={() => (isSelected ? clearContent() : selectType(type))}
            >
              <Text style={styles.typeChipIcon}>{cfg.icon}</Text>
              <Text style={[styles.typeChipLabel, isSelected && styles.typeChipLabelSelected]}>
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Timer config */}
      {selectedType === 'timer' && (
        <View style={styles.configBox}>
          <TextInput
            style={styles.input}
            value={timerLabel}
            onChangeText={onTimerLabelChange}
            placeholder="Label (e.g. Plank, Cardio…)"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.subLabel}>DURATION</Text>
          <View style={styles.presetGrid}>
            {DURATION_PRESETS.map((p) => (
              <Pressable
                key={p.seconds}
                style={[
                  styles.presetChip,
                  timerDuration === p.seconds && styles.presetChipSelected,
                ]}
                onPress={() => onTimerDurationChange(p.seconds)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    timerDuration === p.seconds && styles.presetChipTextSelected,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.durationPreview}>{formatDuration(timerDuration)}</Text>
        </View>
      )}

      {/* Checklist config */}
      {selectedType === 'checklist' && (
        <View style={styles.configBox}>
          <Text style={styles.subLabel}>STEPS</Text>
          {checklistItems.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checklistBullet}>·</Text>
              <Text style={styles.checklistItemLabel} numberOfLines={1}>{item.label}</Text>
              <Pressable onPress={() => removeChecklistItem(item.id)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>×</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={newItemLabel}
              onChangeText={setNewItemLabel}
              placeholder="Add a step…"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={addChecklistItem}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addBtn, !newItemLabel.trim() && styles.addBtnDisabled]}
              onPress={addChecklistItem}
              disabled={!newItemLabel.trim()}
            >
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
          {checklistItems.length === 0 && (
            <Text style={styles.emptyHint}>Add at least one step</Text>
          )}
        </View>
      )}

      {/* Link config */}
      {selectedType === 'link' && (
        <View style={styles.configBox}>
          <TextInput
            style={styles.input}
            value={linkUrl}
            onChangeText={(url) => {
              setLinkUrl(url);
              onLinkChange(url, linkLabel);
            }}
            placeholder="https://…"
            placeholderTextColor={colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, { marginTop: spacing.xs }]}
            value={linkLabel}
            onChangeText={(label) => {
              setLinkLabel(label);
              onLinkChange(linkUrl, label);
            }}
            placeholder="Label (e.g. Watch tutorial)"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      )}
    </View>
  );
}


