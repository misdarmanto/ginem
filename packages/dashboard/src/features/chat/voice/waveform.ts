/**
 * Share of the spectrum used for bars. Speech energy sits below ~4-5 kHz, which is the
 * lowest fifth of a 24 kHz-wide analyser; the rest would leave most bars flat.
 */
const SPEECH_BAND_RATIO = 0.2;
const MAX_BYTE = 255;

/** Averages the speech band of a frequency snapshot into `barCount` levels in 0..1. */
export function spectrumToLevels(
  data: ArrayLike<number>,
  barCount: number,
): number[] {
  if (barCount <= 0) return [];

  const usable = Math.max(1, Math.floor(data.length * SPEECH_BAND_RATIO));
  const levels: number[] = [];

  for (let bar = 0; bar < barCount; bar += 1) {
    const start = Math.floor((bar * usable) / barCount);
    const end = Math.max(
      start + 1,
      Math.floor(((bar + 1) * usable) / barCount),
    );
    let sum = 0;
    for (let i = start; i < end; i += 1) sum += data[i] ?? 0;
    levels.push(sum / (end - start) / MAX_BYTE);
  }

  return levels;
}
