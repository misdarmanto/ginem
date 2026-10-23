import { describe, expect, it } from "vitest";
import { spectrumToLevels } from "./waveform";

describe("spectrumToLevels", () => {
  it("returns one level per bar, normalised to 0..1", () => {
    const levels = spectrumToLevels(new Uint8Array(128).fill(255), 8);

    expect(levels).toHaveLength(8);
    levels.forEach((level) => expect(level).toBe(1));
  });

  it("returns zeros for silence and handles empty input", () => {
    expect(spectrumToLevels(new Uint8Array(64), 4)).toEqual([0, 0, 0, 0]);
    expect(spectrumToLevels([], 3)).toEqual([0, 0, 0]);
    expect(spectrumToLevels(new Uint8Array(64), 0)).toEqual([]);
  });

  it("averages only the speech band, ignoring the highest bins", () => {
    const data = new Uint8Array(100);
    data.fill(200, 0, 20);
    data.fill(255, 20);

    const levels = spectrumToLevels(data, 6);

    levels.forEach((level) => expect(level).toBeCloseTo(200 / 255));
  });
});
