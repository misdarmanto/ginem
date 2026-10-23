export const DEVICE_DESCRIPTION_MAX_WORDS = 100;

export const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;
