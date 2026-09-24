import type { CrossfaderCurve } from './settings';
import { readJSON, writeJSON } from './storage';

export const MAX_CHANNELS = 4;
export const MIX_ALL = -1; // solo value meaning "all channels audible" in 3-4ch mode

export interface MixerLevels {
  master: number;          // 0–100
  masterMuted: boolean;
  trims: number[];         // per channel, 0–100
  mutes: boolean[];        // per channel
}

export const DEFAULT_LEVELS: MixerLevels = {
  master: 100,
  masterMuted: false,
  trims: Array(MAX_CHANNELS).fill(100),
  mutes: Array(MAX_CHANNELS).fill(false),
};

const LEVELS_KEY = 'dw_mixer';

export const loadLevels = (): MixerLevels => ({ ...DEFAULT_LEVELS, ...readJSON<Partial<MixerLevels>>(LEVELS_KEY, {}) });
export const saveLevels = (levels: MixerLevels) => writeJSON(LEVELS_KEY, levels);

/** Gains (0–1) for CH 1 and CH 2 at crossfader position `mix` (-100 = full CH 1, 100 = full CH 2). */
export function crossfaderGains(mix: number, curve: CrossfaderCurve): [number, number] {
  switch (curve) {
    case 'power': {
      // Constant power: perceived loudness stays even across the fade (~71% each at center)
      const t = ((mix + 100) / 200) * (Math.PI / 2);
      return [Math.cos(t), Math.sin(t)];
    }
    case 'cut':
      // Scratch style: both full until the fader is nearly at an edge
      return [mix >= 90 ? 0 : 1, mix <= -90 ? 0 : 1];
    default:
      // Both full at center, each fades out only on the opposite half
      return [mix <= 0 ? 1 : 1 - mix / 100, mix >= 0 ? 1 : 1 + mix / 100];
  }
}

interface VolumeInput {
  n: number;
  audioMix: number;
  curve: CrossfaderCurve;
  solo: number;              // 3-4ch: channel index or MIX_ALL
  levels: MixerLevels;
  forceSolo?: number | null; // overrides both modes (mobile swipe "audio follows screen")
}

/** Final player volume (0–100) for each of the `n` channels. */
export function computeVolumes({ n, audioMix, curve, solo, levels, forceSolo = null }: VolumeInput): number[] {
  const master = levels.masterMuted ? 0 : levels.master / 100;
  const gains = n === 2 && forceSolo === null ? crossfaderGains(audioMix, curve) : null;
  const soloIdx = forceSolo ?? solo;

  return Array.from({ length: n }, (_, i) => {
    if (levels.mutes[i]) return 0;
    const modeGain = gains ? gains[i] : (soloIdx === MIX_ALL || soloIdx === i ? 1 : 0);
    return Math.round(100 * master * (levels.trims[i] / 100) * modeGain);
  });
}
