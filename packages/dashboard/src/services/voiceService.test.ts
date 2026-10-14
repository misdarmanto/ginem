import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
  api: { get: vi.fn() },
}));

vi.mock("@/services/agentService", () => ({
  agentService: { reportClientLatency: vi.fn() },
}));

import { api, apiClient } from "@/services/api";
import { agentService } from "@/services/agentService";
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
      requestId: expect.any(String),
      channel: "voice",
    });
    expect(reply).toBe("Lampu menyala");
  });

  it("askAssistant reports its own latency under the same request id", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { reply: "ok" } });

    await voiceService.askAssistant("nyalakan lampu");

    const sentId = vi.mocked(apiClient.post).mock.calls[0][1] as { requestId: string };
    expect(agentService.reportClientLatency).toHaveBeenCalledWith(
      sentId.requestId,
      expect.any(Number),
    );
  });

  it("askAssistant does not report latency when the request fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("boom"));

    await expect(voiceService.askAssistant("nyalakan lampu")).rejects.toThrow("boom");
    expect(agentService.reportClientLatency).not.toHaveBeenCalled();
  });

  it("askAssistant falls back to an empty reply", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    expect(await voiceService.askAssistant("halo")).toBe("");
  });

  it("getPreference reads the voice preference", async () => {
    const preference = { voice: "marin", options: [] };
    vi.mocked(apiClient.get).mockResolvedValue(preference);

    expect(await voiceService.getPreference()).toEqual(preference);
    expect(apiClient.get).toHaveBeenCalledWith(VOICE_API.preference);
  });

  it("selectVoice posts the voice and unwraps the updated preference", async () => {
    const preference = { voice: "cedar", options: [] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: preference });

    expect(await voiceService.selectVoice("cedar")).toEqual(preference);
    expect(apiClient.post).toHaveBeenCalledWith(VOICE_API.preference, {
      voice: "cedar",
    });
  });

  it("fetchPreview downloads the sample as a blob", async () => {
    const sample = new Blob(["mp3"]);
    vi.mocked(api.get).mockResolvedValue({ data: sample });

    expect(await voiceService.fetchPreview("marin")).toBe(sample);
    expect(api.get).toHaveBeenCalledWith(VOICE_API.preview, {
      params: { voice: "marin" },
      responseType: "blob",
    });
  });
});
