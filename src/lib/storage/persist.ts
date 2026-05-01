import { Platform } from 'react-native';
import type { ObservablePersistPlugin } from '@legendapp/state/sync';

/**
 * Lazily resolved Legend-State persistence plugin.
 *
 * On native we use MMKV (fast, synchronous). On web we fall back to
 * `localStorage`. The require() is intentionally lazy so the MMKV native
 * module is never loaded in the web bundle (which would crash at runtime).
 */
function createPersistPlugin(): ObservablePersistPlugin {
  if (Platform.OS === 'web') {
    const {
      ObservablePersistLocalStorage,
    } = require('@legendapp/state/persist-plugins/local-storage');
    return new ObservablePersistLocalStorage();
  }

  const {
    ObservablePersistMMKV,
  } = require('@legendapp/state/persist-plugins/mmkv');
  return new ObservablePersistMMKV({ id: 'habitquest-persist' });
}

export const persistPlugin: ObservablePersistPlugin = createPersistPlugin();
