import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export type ShareResult = 'shared' | 'downloaded' | 'failed';

/** Instagram portrait size. */
export const SHARE_SIZE = { width: 1080, height: 1350 };

function dataUriToFile(uri: string, name: string): File {
  const [head, body] = uri.split(',');
  const mime = /data:(.*?);/.exec(head)?.[1] ?? 'image/png';
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

/**
 * Captures a view as a PNG and shares it: the share sheet on phones; on the
 * web, the browser's share sheet when it can share files, a download otherwise.
 */
export async function shareViewAsImage(ref: RefObject<View | null>, text: string): Promise<ShareResult> {
  try {
    if (Platform.OS === 'web') {
      // On the web the view is a DOM element: capture it directly (view-shot's
      // web path relies on findNodeHandle, which react-native-web dropped).
      const node = ref.current as unknown as HTMLElement | null;
      if (!node) return 'failed';
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(node, { backgroundColor: null, scale: SHARE_SIZE.width / node.offsetWidth, logging: false });
      const uri = canvas.toDataURL('image/png');
      const file = dataUriToFile(uri, 'habitquest-stats.png');
      const nav = globalThis.navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav?.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text });
        return 'shared';
      }
      const a = document.createElement('a');
      a.href = uri;
      a.download = file.name;
      a.click();
      return 'downloaded';
    }
    const uri = await captureRef(ref, { format: 'png', result: 'tmpfile', ...SHARE_SIZE });
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: text, UTI: 'public.png' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
