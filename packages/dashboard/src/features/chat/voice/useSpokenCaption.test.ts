import { StrictMode, useEffect } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpokenCaption } from "./useSpokenCaption";

const delta = (text: string) => ({
  type: "response.output_audio_transcript.delta",
  delta: text,
});

describe("useSpokenCaption", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (level: number | null = 0.5) =>
    renderHook(() => useSpokenCaption({ getOutputLevel: () => level }));

  const send = (
    result: ReturnType<typeof setup>["result"],
    ...events: Array<{ type: string; delta?: string }>
  ) => act(() => events.forEach((event) => result.current.handleEvent(event)));

  it("shows arriving text as pending until audio starts", () => {
    const { result } = setup();

    send(result, delta("Lampu sudah menyala"));

    expect(result.current.caption).toEqual({ spoken: "", pending: "Lampu sudah menyala" });
  });

  it("releases text at the speaking pace, not as fast as it arrives", () => {
    const { result } = setup();
    const text = "Lampu depan sudah saya nyalakan sekarang juga";

    send(result, delta(text), { type: "output_audio_buffer.started" });
    act(() => void vi.advanceTimersByTime(1000));

    const { spoken, pending } = result.current.caption;
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken.length).toBeLessThan(text.length);
    expect(spoken + pending).toBe(text);
  });

  it("does not advance while the assistant is silent", () => {
    const { result } = setup(0);

    send(result, delta("Lampu depan sudah saya nyalakan"), {
      type: "output_audio_buffer.started",
    });
    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.caption.spoken).toBe("");
  });

  it("falls back to wall time when the level gate never opens", () => {
    const { result } = setup(0);

    send(result, delta("Lampu depan sudah saya nyalakan"), {
      type: "output_audio_buffer.started",
    });
    act(() => void vi.advanceTimersByTime(3000));

    expect(result.current.caption.spoken.length).toBeGreaterThan(0);
  });

  it("follows real elapsed time when the browser delays timers", () => {
    const { result } = setup();
    const text = "Lampu depan sudah saya nyalakan sekarang juga ya";

    send(result, delta(text), { type: "output_audio_buffer.started" });
    // one late timer callback covering a full second instead of twenty 50 ms ticks
    act(() => {
      vi.setSystemTime(Date.now() + 1000);
      vi.advanceTimersToNextTimer();
    });

    expect(result.current.caption.spoken.length).toBeGreaterThanOrEqual(15);
  });

  it("shows the whole text once playback finishes", () => {
    const { result } = setup();

    send(
      result,
      delta("Selesai ya"),
      { type: "output_audio_buffer.started" },
      { type: "output_audio_buffer.stopped" },
    );

    expect(result.current.caption).toEqual({ spoken: "Selesai ya", pending: "" });
  });

  it("drops the unspoken part when the user interrupts", () => {
    const { result } = setup();

    send(result, delta("Lampu depan sudah saya nyalakan sekarang"), {
      type: "output_audio_buffer.started",
    });
    act(() => void vi.advanceTimersByTime(500));
    send(result, { type: "output_audio_buffer.cleared" });

    expect(result.current.caption.pending).toBe("");
    expect(result.current.caption.spoken.length).toBeGreaterThan(0);
    expect(result.current.caption.spoken.length).toBeLessThan(
      "Lampu depan sudah saya nyalakan sekarang".length,
    );
  });

  it("starts a fresh caption for the next response", () => {
    const { result } = setup();

    send(
      result,
      delta("Sebentar ya"),
      { type: "output_audio_buffer.started" },
      { type: "output_audio_buffer.stopped" },
      { type: "response.created" },
      delta("Lampunya menyala"),
    );

    expect(result.current.caption).toEqual({ spoken: "", pending: "Lampunya menyala" });
  });

  it("clears the caption when the user starts speaking", () => {
    const { result } = setup();

    send(result, delta("Halo"), { type: "input_audio_buffer.speech_started" });

    expect(result.current.caption).toEqual({ spoken: "", pending: "" });
  });
});

describe("useSpokenCaption lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps ticking when effects are mounted twice (React StrictMode)", () => {
    const { result } = renderHook(
      () => {
        const spoken = useSpokenCaption({ getOutputLevel: () => 0.5 });
        const { handleEvent } = spoken;
        useEffect(() => {
          handleEvent(delta("Halo dunia semuanya"));
          handleEvent({ type: "output_audio_buffer.started" });
        }, [handleEvent]);
        return spoken;
      },
      { wrapper: StrictMode },
    );

    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.caption.spoken.length).toBeGreaterThan(0);
  });
});
