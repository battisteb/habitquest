import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { observable } from '@legendapp/state';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing } from '../theme/tokens';

const networkState$ = observable({ isConnected: true, initialized: false });

// Subscribe once at module level
let _subscribed = false;
function ensureSubscribed() {
  if (_subscribed) return;
  _subscribed = true;
  NetInfo.addEventListener((state) => {
    networkState$.isConnected.set(state.isConnected !== false);
    networkState$.initialized.set(true);
  });
  // Fetch initial state immediately
  NetInfo.fetch().then((state) => {
    networkState$.isConnected.set(state.isConnected !== false);
    networkState$.initialized.set(true);
  });
}

export function OfflineBanner() {
  ensureSubscribed();

  const isConnected = use$(networkState$.isConnected);
  const initialized = use$(networkState$.initialized);

  const slideY = useRef(new Animated.Value(-40)).current;
  const prevConnected = useRef(true);

  useEffect(() => {
    if (!initialized) return;
    if (isConnected === prevConnected.current) return;
    prevConnected.current = isConnected;

    if (!isConnected) {
      // slide down to show
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      // slide back up after 1.5s
      setTimeout(() => {
        Animated.timing(slideY, {
          toValue: -40,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }, 1500);
    }
  }, [isConnected, initialized]);

  // Don't show banner when connected (after animation out)
  if (isConnected && initialized) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>⚠ NO CONNECTION — changes saved locally</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#b45309',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
