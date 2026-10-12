import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from "@/services/api";
import { VOICE_API, voiceService } from "./voiceService";

describe("voiceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSession unwraps the client secret payload", async () => {
    const session = { clientSecret: "ek_test", expiresAt: 1, model: "m" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: session });

    const result = await voiceService.createSession();

    expect(apiClient.post).toHaveBeenCalledWith(VOICE_API.session, {});
    expect(result).toEqual(session);
  });

  it("askAssistant posts the message to the chat endpoint and returns the reply", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { reply: "Lampu menyala" } });

    const reply = await voiceService.askAssistant("nyalakan lampu");

    expect(apiClient.post).toHaveBeenCalledWith(VOICE_API.chat, {
      message: "nyalakan lampu",
    });
    expect(reply).toBe("Lampu menyala");
  });

  it("askAssistant falls back to an empty reply", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    expect(await voiceService.askAssistant("halo")).toBe("");
  });
});
