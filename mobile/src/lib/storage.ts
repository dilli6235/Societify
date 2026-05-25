import * as SecureStore from 'expo-secure-store';

/** Thin wrapper over expo-secure-store (encrypted on-device storage). */
export const storage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  del: (key: string) => SecureStore.deleteItemAsync(key),
};
