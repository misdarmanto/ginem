import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/voiceService", () => ({
  voiceService: { fetchPreview: vi.fn() },
}));

import { voiceService } from "@/services/voiceService";
import { useVoicePreview } from "./useVoicePreview";

interface FakeAudio {
  src: string;
  onended: (() => void) | null;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

const instances: FakeAudio[] = [];

describe("useVoicePreview", () => {
  beforeEach(() => {
    instances.length = 0;
    vi.mocked(voiceService.fetchPreview).mockResolvedValue(new Blob(["mp3"]));
    URL.createObjectURL = vi.fn(() => "blob:sample");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "Audio",
      class implements FakeAudio {
        onended: (() => void) | null = null;
        play = vi.fn().mockResolvedValue(undefined);
        pause = vi.fn();

        constructor(public src: string) {
          instances.push(this);
        }
      },
    );
  });

  it("fetches and plays a sample", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("marin"));

    expect(voiceService.fetchPreview).toHaveBeenCalledWith("marin");
    expect(instances[0].play).toHaveBeenCalled();
    expect(result.current.playingVoice).toBe("marin");
    expect(result.current.loadingVoice).toBeNull();
  });

  it("clears the playing state when the sample ends", async () => {
    const { result } = renderHook(() => useVoicePreview());
    await act(() => result.current.play("marin"));

    act(() => instances[0].onended?.());

    expect(result.current.playingVoice).toBeNull();
  });

  it("reuses a downloaded sample instead of fetching it again", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("marin"));
    await act(() => result.current.play("marin"));

    expect(voiceService.fetchPreview).toHaveBeenCalledTimes(1);
  });

  it("stops the current sample before playing another", async () => {
    const { result } = renderHook(() => useVoicePreview());
    await act(() => result.current.play("marin"));

    await act(() => result.current.play("cedar"));

    expect(instances[0].pause).toHaveBeenCalled();
    expect(result.current.playingVoice).toBe("cedar");
  });

  it("stop halts playback", async () => {
    const { result } = renderHook(() => useVoicePreview());
    await act(() => result.current.play("marin"));

    act(() => result.current.stop());

    expect(instances[0].pause).toHaveBeenCalled();
    expect(result.current.playingVoice).toBeNull();
  });

  it("reports a failure when the sample cannot be fetched", async () => {
    vi.mocked(voiceService.fetchPreview).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("marin"));

    expect(result.current.failed).toBe(true);
    expect(result.current.playingVoice).toBeNull();
    expect(result.current.loadingVoice).toBeNull();
  });

  it("releases downloaded samples on unmount", async () => {
    const { result, unmount } = renderHook(() => useVoicePreview());
    await act(() => result.current.play("marin"));

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sample");
  });
});
