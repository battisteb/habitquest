import { observable } from '@legendapp/state';
import { storage } from '../../../lib/storage/mmkv';
import { supabase } from '../../../lib/supabase/client';

const STORAGE_KEY = 'avatarConfig';

interface AvatarConfigState {
  skinColor: string;
  hairColor: string;
  eyeColor: string;
}

const DEFAULT_COLORS: AvatarConfigState = {
  skinColor: '#f4c98a',
  hairColor: '#4a3728',
  eyeColor: '#1a1a2e',
};

export const avatarConfigStore$ = observable<AvatarConfigState>({ ...DEFAULT_COLORS });

function loadFromStorage(): AvatarConfigState {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_COLORS };
  try {
    const parsed = JSON.parse(raw) as Partial<AvatarConfigState>;
    return {
      skinColor: parsed.skinColor ?? DEFAULT_COLORS.skinColor,
      hairColor: parsed.hairColor ?? DEFAULT_COLORS.hairColor,
      eyeColor: parsed.eyeColor ?? DEFAULT_COLORS.eyeColor,
    };
  } catch {
    return { ...DEFAULT_COLORS };
  }
}

function saveToStorage(config: AvatarConfigState): void {
  storage.set(STORAGE_KEY, JSON.stringify(config));
}

export async function loadAvatarConfig(userId: string | undefined): Promise<void> {
  if (!userId) return;

  // Load from MMKV first for instant display
  const local = loadFromStorage();
  avatarConfigStore$.set(local);

  // Then try Supabase for the authoritative values
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('skin_color, hair_color, eye_color')
      .eq('id', userId)
      .single();

    if (error || !data) return;

    const remote = data as any;
    const skinColor: string = typeof remote.skin_color === 'string' && remote.skin_color
      ? remote.skin_color
      : local.skinColor;
    const hairColor: string = typeof remote.hair_color === 'string' && remote.hair_color
      ? remote.hair_color
      : local.hairColor;
    const eyeColor: string = typeof remote.eye_color === 'string' && remote.eye_color
      ? remote.eye_color
      : local.eyeColor;

    const resolved: AvatarConfigState = { skinColor, hairColor, eyeColor };
    avatarConfigStore$.set(resolved);
    saveToStorage(resolved);
  } catch {
    // Supabase unavailable — keep MMKV values already applied
  }
}

export async function saveAvatarConfig(
  skinColor: string,
  hairColor: string,
  eyeColor: string,
  userId: string | undefined,
): Promise<void> {
  const config: AvatarConfigState = { skinColor, hairColor, eyeColor };

  // Persist to MMKV immediately
  avatarConfigStore$.set(config);
  saveToStorage(config);

  // Fire-and-forget Supabase update
  if (userId) {
    void Promise.resolve(
      supabase
        .from('profiles')
        .update({ skin_color: skinColor, hair_color: hairColor, eye_color: eyeColor } as any)
        .eq('id', userId),
    ).catch(() => {
      // intentional no-op — offline-first, no throw
    });
  }
}
