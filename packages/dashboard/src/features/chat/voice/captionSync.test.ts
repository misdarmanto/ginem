import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHARS_PER_SEC,
  nextCharsPerSec,
  spokenLength,
  splitCaption,
} from "./captionSync";

describe("spokenLength", () => {
  const text = "Lampu depan sudah saya nyalakan";

  it("is zero before any audio has played", () => {
    expect(spokenLength(text, 0, 15)).toBe(0);
  });

  it("snaps to the end of the word being spoken", () => {
    // 1s at 15 chars/s lands inside "sudah" (index 15)
    expect(text.slice(0, spokenLength(text, 1000, 15))).toBe("Lampu depan sudah");
  });

  it("returns the full length once the pace has covered the text", () => {
    expect(spokenLength(text, 60_000, 15)).toBe(text.length);
  });

  it("never exceeds the text that has arrived so far", () => {
    expect(spokenLength("Halo", 5000, 15)).toBe(4);
    expect(spokenLength("", 5000, 15)).toBe(0);
  });

  it("finishes the last word when no whitespace follows the target", () => {
    expect(spokenLength("Halo dunia", 500, 15)).toBe(10);
  });
});

describe("nextCharsPerSec", () => {
  it("moves halfway toward the measured pace", () => {
    // 60 chars in 3s = 20 chars/s; halfway from 10 is 15
    expect(nextCharsPerSec(10, 60, 3000)).toBe(15);
  });

  it("ignores responses too short to measure", () => {
    expect(nextCharsPerSec(DEFAULT_CHARS_PER_SEC, 5, 3000)).toBe(DEFAULT_CHARS_PER_SEC);
    expect(nextCharsPerSec(DEFAULT_CHARS_PER_SEC, 60, 300)).toBe(DEFAULT_CHARS_PER_SEC);
  });

  it("clamps absurd measurements", () => {
    expect(nextCharsPerSec(15, 5000, 1000)).toBe(22.5);
  });
});

describe("splitCaption", () => {
  it("splits spoken and pending text", () => {
    expect(splitCaption("Halo dunia", 4)).toEqual({ spoken: "Halo", pending: " dunia" });
  });
});
