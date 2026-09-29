import { useCallback, useRef } from 'react';
import type { View } from 'react-native';
import { observable } from '@legendapp/state';

export type TourTargetKey = 'hero' | 'first-check' | 'missions' | 'add';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Window positions of the elements the guided tour points at. */
export const tourTargets$ = observable<Partial<Record<TourTargetKey, Rect>>>({});

/** Last user action the tour listens for (e.g. the missions banner was opened). */
export const tourEvent$ = observable<{ name: string; at: number } | null>(null);

export function emitTourEvent(name: string): void {
  tourEvent$.set({ name, at: Date.now() });
}

const refs: Partial<Record<TourTargetKey, View | null>> = {};

/** Re-reads a target's position (it moves when the list scrolls or animates in). */
export function measureTarget(key: TourTargetKey): void {
  const node = refs[key];
  if (!node || typeof node.measureInWindow !== 'function') return;
  node.measureInWindow((x, y, width, height) => {
    if (width > 0 && height > 0) tourTargets$[key].set({ x, y, width, height });
  });
}

/**
 * Registers an element as a tour target: spread the result on the View.
 * Pass `enabled: false` to keep the hook call unconditional (e.g. only the
 * first habit card is a target).
 */
export function useTourTarget(key: TourTargetKey, enabled = true) {
  const ref = useRef<View | null>(null);
  const setRef = useCallback(
    (node: View | null) => {
      ref.current = node;
      if (enabled) refs[key] = node;
    },
    [key, enabled],
  );
  const onLayout = useCallback(() => {
    if (enabled) measureTarget(key);
  }, [key, enabled]);
  return { ref: setRef, onLayout, collapsable: false };
}
