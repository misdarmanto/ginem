import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n/config";
import type { AgentLog, AgentLogSummary } from "@/services/agentService";
import AgentLogDetailDrawer from "./AgentLogDetailDrawer";
import AgentStatusChip from "./AgentStatusChip";
import AgentSummaryCards from "./AgentSummaryCards";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

const log = (overrides: Partial<AgentLog> = {}): AgentLog => ({
  agentLogId: 1,
  requestId: "req-1",
  userId: 1,
  source: "web",
  channel: "chat",
  command: "tolong hidupkan TV di ruang tamu",
  reply: "Perangkat TV tidak terdaftar.",
  status: "failed",
  statusReason: "Perangkat TV tidak terdaftar di sistem.",
  model: "gpt-4o",
  inputTokens: 11094,
  outputTokens: 66,
  totalTokens: 11160,
  cachedInputTokens: 5632,
  estimatedCostUsd: 0.0214,
  queueWaitMs: 16,
  contextLatencyMs: 10760,
  agentLatencyMs: 3110,
  serverLatencyMs: 14040,
  clientLatencyMs: 14050,
  toolCalls: [{ name: "list_devices", args: {}, ok: true }],
  createdAt: "2026-10-14 17:50:20",
  ...overrides,
});

describe("AgentStatusChip", () => {
  it.each([
    ["success", "Success"],
    ["failed", "Failed"],
    ["clarification", "Clarification"],
    ["pending", "Judging…"],
  ] as const)("labels %s", (status, label) => {
    render(<AgentStatusChip status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("AgentSummaryCards", () => {
  const summary: AgentLogSummary = {
    total: 4,
    success: 2,
    failed: 1,
    clarification: 1,
    pending: 0,
    avgClientLatencyMs: 8630,
    avgServerLatencyMs: 8000,
    inputTokens: 28567,
    outputTokens: 254,
    totalTokens: 28821,
    estimatedCostUsd: 0.056,
  };

  it("shows counts, latency, tokens and cost", () => {
    render(<AgentSummaryCards summary={summary} />);

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/2 success · 1 failed · 1 clarification/)).toBeInTheDocument();
    expect(screen.getByText("8.63 s")).toBeInTheDocument();
    expect(screen.getByText("Measured in the browser")).toBeInTheDocument();
    expect(screen.getByText("28.821")).toBeInTheDocument();
    expect(screen.getByText("$0.0560")).toBeInTheDocument();
  });

  it("says so when latency falls back to the server's measurement", () => {
    render(<AgentSummaryCards summary={{ ...summary, avgClientLatencyMs: null }} />);

    expect(screen.getByText("8.00 s")).toBeInTheDocument();
    expect(screen.getByText(/Server-side/)).toBeInTheDocument();
  });

  it("renders zeros before the first response arrives", () => {
    render(<AgentSummaryCards summary={undefined} />);

    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});

describe("AgentLogDetailDrawer", () => {
  it("renders nothing when no log is selected", () => {
    render(<AgentLogDetailDrawer log={null} onClose={vi.fn()} />);

    expect(screen.queryByText("Command details")).not.toBeInTheDocument();
  });

  it("shows the command, outcome, reply and the reason for the outcome", () => {
    render(<AgentLogDetailDrawer log={log()} onClose={vi.fn()} />);

    expect(screen.getByText("tolong hidupkan TV di ruang tamu")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Perangkat TV tidak terdaftar di sistem.")).toBeInTheDocument();
    expect(screen.getByText("Perangkat TV tidak terdaftar.")).toBeInTheDocument();
  });

  it("breaks the latency down into where the time went", () => {
    render(<AgentLogDetailDrawer log={log()} onClose={vi.fn()} />);

    expect(screen.getByText("End to end (browser)")).toBeInTheDocument();
    expect(screen.getByText("14.05 s")).toBeInTheDocument();
    expect(screen.getByText("Memory + knowledge search")).toBeInTheDocument();
    expect(screen.getByText("10.76 s")).toBeInTheDocument();
    expect(screen.getByText("16 ms")).toBeInTheDocument();
  });

  it("labels end-to-end as server-side when the browser did not report", () => {
    render(<AgentLogDetailDrawer log={log({ clientLatencyMs: null })} onClose={vi.fn()} />);

    expect(screen.getByText("End to end (server)")).toBeInTheDocument();
  });

  it("shows token usage including the cached share, and the estimated cost", () => {
    render(<AgentLogDetailDrawer log={log()} onClose={vi.fn()} />);

    expect(screen.getByText("11.094")).toBeInTheDocument();
    expect(screen.getByText("5.632")).toBeInTheDocument();
    expect(screen.getByText("11.160")).toBeInTheDocument();
    expect(screen.getByText("$0.0214")).toBeInTheDocument();
  });

  it("lists the tools used and flags one that failed", () => {
    render(
      <AgentLogDetailDrawer
        log={log({
          toolCalls: [
            { name: "list_devices", args: {}, ok: true },
            {
              name: "set_actuator_state_by_device_name",
              args: { deviceName: "TV" },
              ok: false,
              error: "Device not found",
            },
          ],
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("list_devices")).toBeInTheDocument();
    expect(screen.getByText("set_actuator_state_by_device_name")).toBeInTheDocument();
    expect(within(document.body).getByText(/Device not found/)).toBeInTheDocument();
  });

  it("says when no tool was called", () => {
    render(<AgentLogDetailDrawer log={log({ toolCalls: null })} onClose={vi.fn()} />);

    expect(screen.getByText("No tools were called.")).toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(<AgentLogDetailDrawer log={log()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });
});
