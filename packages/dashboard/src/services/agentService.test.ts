import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

import { apiClient } from "@/services/api";
import { AGENT_API, agentService, summaryPath } from "./agentService";

describe("summaryPath", () => {
  it("has no query string without filters", () => {
    expect(summaryPath({})).toBe("/agent/logs/summary");
  });

  it("adds only the filters that are set", () => {
    expect(summaryPath({ status: "failed" })).toBe("/agent/logs/summary?status=failed");
    expect(summaryPath({ search: "lampu" })).toBe("/agent/logs/summary?search=lampu");
  });

  it("encodes the search text", () => {
    expect(summaryPath({ status: "failed", search: "lampu & kipas" })).toBe(
      "/agent/logs/summary?status=failed&search=lampu+%26+kipas",
    );
  });
});

describe("AGENT_API.clientLatency", () => {
  it("encodes the request id", () => {
    expect(AGENT_API.clientLatency("a/b c")).toBe("/agent/logs/a%2Fb%20c/client-latency");
  });
});

describe("agentService.getSummary", () => {
  it("reads the summary with the filter applied", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ total: 3 });

    expect(await agentService.getSummary({ status: "success" })).toEqual({ total: 3 });
    expect(apiClient.get).toHaveBeenCalledWith("/agent/logs/summary?status=success");
  });
});

describe("agentService.reportClientLatency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the browser's measurement for that request", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({});

    await agentService.reportClientLatency("req-1", 2345);

    expect(apiClient.patch).toHaveBeenCalledWith("/agent/logs/req-1/client-latency", {
      clientLatencyMs: 2345,
    });
  });

  it("retries when the log row has not been written yet", async () => {
    vi.mocked(apiClient.patch)
      .mockRejectedValueOnce(new Error("Agent log not found"))
      .mockResolvedValueOnce({});

    const done = agentService.reportClientLatency("req-1", 100);
    await vi.runAllTimersAsync();
    await done;

    expect(apiClient.patch).toHaveBeenCalledTimes(2);
  });

  it("gives up quietly after a few attempts so the conversation is never disturbed", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("down"));

    const done = agentService.reportClientLatency("req-1", 100);
    await vi.runAllTimersAsync();

    await expect(done).resolves.toBeUndefined();
    expect(apiClient.patch).toHaveBeenCalledTimes(3);
  });
});
