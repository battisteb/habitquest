import { Platform } from 'react-native';

interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

function createStorage(id: string): StorageAdapter {
  if (Platform.OS === 'web') {
    return {
      getString: (key: string) => localStorage.getItem(`${id}:${key}`) ?? undefined,
      set: (key: string, value: string) => localStorage.setItem(`${id}:${key}`, value),
      delete: (key: string) => localStorage.removeItem(`${id}:${key}`),
    };
  }
  const { MMKV } = require('react-native-mmkv');
  return new MMKV({ id });
}

export const storage = createStorage('habitquest-storage');
