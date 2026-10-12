/** Typical speaking pace of the voice model; refined after every spoken response. */
export const DEFAULT_CHARS_PER_SEC = 15;
const MIN_CHARS_PER_SEC = 8;
const MAX_CHARS_PER_SEC = 30;
const MIN_CALIBRATION_MS = 800;
const MIN_CALIBRATION_CHARS = 12;
const CALIBRATION_WEIGHT = 0.5;

/**
 * Length of `text` that has been spoken after `speakingMs` of audio, rounded up to the end
 * of the word being spoken so words are highlighted whole.
 */
export function spokenLength(
  text: string,
  speakingMs: number,
  charsPerSec: number,
): number {
  const target = Math.floor((speakingMs / 1000) * charsPerSec);
  if (target <= 0) return 0;
  if (target >= text.length) return text.length;

  const nextBreak = text.slice(target).search(/\s/);
  return nextBreak === -1 ? text.length : target + nextBreak;
}

/** Blends the pace measured over a finished response into the running estimate. */
export function nextCharsPerSec(
  current: number,
  spokenChars: number,
  speakingMs: number,
): number {
  if (speakingMs < MIN_CALIBRATION_MS || spokenChars < MIN_CALIBRATION_CHARS) {
    return current;
  }

  const measured = Math.min(
    MAX_CHARS_PER_SEC,
    Math.max(MIN_CHARS_PER_SEC, spokenChars / (speakingMs / 1000)),
  );
  return current * (1 - CALIBRATION_WEIGHT) + measured * CALIBRATION_WEIGHT;
}

export interface SpokenCaption {
  spoken: string;
  pending: string;
}

export const EMPTY_CAPTION: SpokenCaption = { spoken: "", pending: "" };

export function splitCaption(text: string, spokenChars: number): SpokenCaption {
  return { spoken: text.slice(0, spokenChars), pending: text.slice(spokenChars) };
}
