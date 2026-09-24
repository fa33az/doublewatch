import type { CSSProperties } from 'react';
import { MAX_CHANNELS } from './mixer';
import { readJSON, writeJSON } from './storage';

// The embed API ignores setPlaybackQuality, but YouTube still caps quality by the player's
// size. So to "choose" a resolution we render the iframe at that size and scale it back
// down (or up) with a CSS transform to fit the screen; YouTube then picks that quality,
// bandwidth permitting. Resizing never reloads the iframe.

export type QualityTarget = 'auto' | 2160 | 1440 | 1080 | 720 | 480 | 360;

export const QUALITY_TARGETS: { value: QualityTarget; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 2160, label: '4K' },
  { value: 1440, label: '1440p' },
  { value: 1080, label: '1080p' },
  { value: 720, label: '720p' },
  { value: 480, label: '480p' },
  { value: 360, label: '360p' },
];

/**
 * Style for the iframe wrapper so the 16:9 picture inside a `width`×`height` screen is
 * rendered `target` device pixels tall, then scaled to fit. undefined = native size.
 */
export function qualityFrameStyle(target: QualityTarget, width: number, height: number, dpr: number): CSSProperties | undefined {
  if (target === 'auto' || width <= 0 || height <= 0) return undefined;
  const pictureHeight = Math.min(height, (width * 9) / 16);   // YouTube letterboxes to 16:9
  const scale = target / (pictureHeight * dpr);
  if (Math.abs(scale - 1) < 0.02) return undefined;
  return {
    inset: 'auto',
    top: 0,
    left: 0,
    width: width * scale,
    height: height * scale,
    transform: `scale(${1 / scale})`,
    transformOrigin: '0 0',
  };
}

const KEY = 'dw_quality';

export const loadQualityTargets = (): QualityTarget[] => {
  const saved = readJSON<QualityTarget[]>(KEY, []);
  return Array.from({ length: MAX_CHANNELS }, (_, i) =>
    QUALITY_TARGETS.some(q => q.value === saved[i]) ? saved[i] : 'auto');
};
export const saveQualityTargets = (targets: QualityTarget[]) => writeJSON(KEY, targets);
