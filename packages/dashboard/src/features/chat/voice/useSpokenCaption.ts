import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CHARS_PER_SEC,
  EMPTY_CAPTION,
  nextCharsPerSec,
  splitCaption,
  spokenLength,
  type SpokenCaption,
} from "./captionSync";
import type { RealtimeEvent } from "./realtimeEvents";

export const CAPTION_TICK_MS = 50;
/** Browsers may delay timers; elapsed time is measured, but one gap is never counted beyond this. */
const MAX_TICK_GAP_MS = 1000;
/** Output level (0..1) above which the assistant counts as speaking. */
export const SPEAKING_LEVEL_THRESHOLD = 0.03;
/** If the level gate admits less than this share of wall time, it is ignored. */
const MIN_GATED_SHARE = 0.15;
const GATE_CHECK_AFTER_MS = 2000;

const DELTA_EVENTS = new Set([
  "response.output_audio_transcript.delta",
  "response.audio_transcript.delta",
]);

interface UseSpokenCaptionOptions {
  /** Current loudness of the assistant's audio, or null when it cannot be measured. */
  getOutputLevel: () => number | null;
}

/**
 * Reveals the assistant's transcript in step with the audio actually being played. Transcript
 * deltas arrive much faster than speech, so text is released at the speaking pace instead.
 */
export function useSpokenCaption({ getOutputLevel }: UseSpokenCaptionOptions) {
  const [caption, setCaption] = useState<SpokenCaption>(EMPTY_CAPTION);

  const getLevelRef = useRef(getOutputLevel);
  getLevelRef.current = getOutputLevel;

  const textRef = useRef("");
  const rateRef = useRef(DEFAULT_CHARS_PER_SEC);
  const playingRef = useRef(false);
  const finishedRef = useRef(true);
  const separatorRef = useRef(false);
  const lastTickAtRef = useRef(0);
  const wallMsRef = useRef(0);
  const speakingMsRef = useRef(0);
  const spokenCharsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const render = useCallback(() => {
    const next = splitCaption(textRef.current, spokenCharsRef.current);
    setCaption((current) =>
      current.spoken === next.spoken && current.pending === next.pending
        ? current
        : next,
    );
  }, []);

  const stopTicking = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = undefined;
    playingRef.current = false;
  }, []);

  const reset = useCallback(() => {
    stopTicking();
    textRef.current = "";
    spokenCharsRef.current = 0;
    wallMsRef.current = 0;
    speakingMsRef.current = 0;
    finishedRef.current = true;
    separatorRef.current = false;
    setCaption(EMPTY_CAPTION);
  }, [stopTicking]);

  const clockMs = () => {
    const gateBroken =
      wallMsRef.current > GATE_CHECK_AFTER_MS &&
      speakingMsRef.current < wallMsRef.current * MIN_GATED_SHARE;
    return gateBroken ? wallMsRef.current : speakingMsRef.current;
  };

  const tick = useCallback(() => {
    const now = Date.now();
    const elapsedMs = Math.min(now - lastTickAtRef.current, MAX_TICK_GAP_MS);
    lastTickAtRef.current = now;

    wallMsRef.current += elapsedMs;
    const level = getLevelRef.current();
    if (level == null || level > SPEAKING_LEVEL_THRESHOLD) {
      speakingMsRef.current += elapsedMs;
    }

    spokenCharsRef.current = spokenLength(
      textRef.current,
      clockMs(),
      rateRef.current,
    );
    render();
  }, [render]);

  const startPlayback = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    lastTickAtRef.current = Date.now();
    wallMsRef.current = 0;
    speakingMsRef.current = 0;
    timerRef.current = setInterval(tick, CAPTION_TICK_MS);
  }, [tick]);

  const endPlayback = useCallback(
    (interrupted: boolean) => {
      if (playingRef.current) {
        if (interrupted) {
          textRef.current = textRef.current.slice(0, spokenCharsRef.current);
        } else {
          rateRef.current = nextCharsPerSec(
            rateRef.current,
            textRef.current.length,
            clockMs(),
          );
          spokenCharsRef.current = textRef.current.length;
        }
      } else if (!interrupted) {
        spokenCharsRef.current = textRef.current.length;
      }

      stopTicking();
      finishedRef.current = true;
      render();
    },
    [render, stopTicking],
  );

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      if (DELTA_EVENTS.has(event.type) && typeof event.delta === "string") {
        if (finishedRef.current) {
          textRef.current = "";
          spokenCharsRef.current = 0;
          finishedRef.current = false;
        } else if (separatorRef.current && !/\s$/.test(textRef.current)) {
          textRef.current += " ";
        }
        separatorRef.current = false;
        textRef.current += event.delta;
        render();
        return;
      }

      switch (event.type) {
        case "response.created":
          separatorRef.current = true;
          break;
        case "output_audio_buffer.started":
          startPlayback();
          break;
        case "output_audio_buffer.stopped":
          endPlayback(false);
          break;
        case "output_audio_buffer.cleared":
          endPlayback(true);
          break;
        case "input_audio_buffer.speech_started":
          reset();
          break;
      }
    },
    [endPlayback, render, reset, startPlayback],
  );

  useEffect(() => stopTicking, [stopTicking]);

  return { caption, handleEvent, reset };
}
