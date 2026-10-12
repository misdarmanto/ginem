import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n/config";

const mutate = vi.fn();
const play = vi.fn();
const stop = vi.fn();

const preference = {
  voice: "marin",
  options: [
    { id: "marin", label: "Marin", description: "Hangat", recommended: true },
    { id: "coral", label: "Coral", description: "Ceria", recommended: false },
  ],
};

let isLoading = false;
let playingVoice: string | null = null;

vi.mock("@/hooks/services", () => ({
  useVoicePreferenceQuery: () => ({
    data: isLoading ? undefined : preference,
    isLoading,
  }),
  useSelectVoiceMutation: () => ({ mutate, isPending: false }),
}));

vi.mock("../useVoicePreview", () => ({
  useVoicePreview: () => ({
    playingVoice,
    loadingVoice: null,
    failed: false,
    play,
    stop,
  }),
}));

import VoiceSettingsCard from "./VoiceSettingsCard";

describe("VoiceSettingsCard", () => {
  beforeEach(() => {
    isLoading = false;
    playingVoice = null;
  });

  it("lists voices and marks the current one as selected", () => {
    render(<VoiceSettingsCard />);

    expect(screen.getByRole("radio", { name: "Marin" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Coral" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("flags only recommended voices", () => {
    render(<VoiceSettingsCard />);

    expect(screen.getAllByText(/rekomendasi|recommended/i)).toHaveLength(1);
  });

  it("saves a newly chosen voice", () => {
    render(<VoiceSettingsCard />);

    fireEvent.click(screen.getByRole("radio", { name: "Coral" }));

    expect(mutate).toHaveBeenCalledWith("coral");
  });

  it("does not save the voice that is already selected", () => {
    render(<VoiceSettingsCard />);

    fireEvent.click(screen.getByRole("radio", { name: "Marin" }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("selects with the keyboard", () => {
    render(<VoiceSettingsCard />);

    fireEvent.keyDown(screen.getByRole("radio", { name: "Coral" }), { key: "Enter" });

    expect(mutate).toHaveBeenCalledWith("coral");
  });

  it("previews a voice without changing the selection", () => {
    render(<VoiceSettingsCard />);

    fireEvent.click(screen.getByRole("button", { name: /Coral/ }));

    expect(play).toHaveBeenCalledWith("coral");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("stops a sample that is already playing", () => {
    playingVoice = "coral";
    render(<VoiceSettingsCard />);

    fireEvent.click(screen.getByRole("button", { name: /hentikan|stop/i }));

    expect(stop).toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  it("shows a spinner while loading", () => {
    isLoading = true;
    render(<VoiceSettingsCard />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});
