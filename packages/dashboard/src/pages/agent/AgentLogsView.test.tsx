import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n/config";
import type { AgentLog } from "@/services/agentService";

const logsQuery = vi.fn();
const summaryQuery = vi.fn();

interface StubColumn {
  field: string;
  renderCell?: (params: { row: AgentLog }) => React.ReactNode;
  valueGetter?: (params: { row: AgentLog }) => unknown;
  valueFormatter?: (item: { value: unknown }) => unknown;
}

// jsdom has no layout, so the real DataGrid virtualises away most columns. This stand-in renders
// every column through the page's own renderCell / valueGetter / valueFormatter.
vi.mock("@/components/common/AppDataGrid", () => ({
  default: ({
    rows,
    columns,
    getRowId,
    onRowClick,
    localeText,
  }: {
    rows: AgentLog[];
    columns: StubColumn[];
    getRowId: (row: AgentLog) => number;
    onRowClick: (params: { row: AgentLog }) => void;
    localeText: { noRowsLabel: string };
  }) =>
    rows.length === 0 ? (
      <p>{localeText.noRowsLabel}</p>
    ) : (
      <table>
        <tbody>
          {rows.map((item) => (
            <tr key={getRowId(item)} onClick={() => onRowClick({ row: item })}>
              {columns.map((column) => (
                <td key={column.field}>
                  {column.renderCell
                    ? column.renderCell({ row: item })
                    : String(
                        column.valueGetter
                          ? column.valueGetter({ row: item })
                          : column.valueFormatter
                            ? column.valueFormatter({
                                value: item[column.field as keyof AgentLog],
                              })
                            : (item[column.field as keyof AgentLog] ?? ""),
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
}));

vi.mock("@/hooks/services", () => ({
  useAgentLogsQuery: (params: unknown) => logsQuery(params),
  useAgentSummaryQuery: (filter: unknown) => summaryQuery(filter),
}));

import AgentLogsView from "./AgentLogsView";

const row = (overrides: Partial<AgentLog>): AgentLog => ({
  agentLogId: 1,
  requestId: "req-1",
  userId: 1,
  source: "web",
  channel: "chat",
  command: "tolong hidupkan TV di ruang tamu",
  reply: "Maaf",
  status: "failed",
  statusReason: "Perangkat TV tidak terdaftar.",
  model: "gpt-4o",
  inputTokens: 11094,
  outputTokens: 66,
  totalTokens: 11160,
  cachedInputTokens: 0,
  estimatedCostUsd: 0.0214,
  queueWaitMs: 16,
  contextLatencyMs: 100,
  agentLatencyMs: 3110,
  serverLatencyMs: 14040,
  clientLatencyMs: 14050,
  toolCalls: null,
  createdAt: "2026-10-14 17:50:20",
  ...overrides,
});

const rows = [
  row({}),
  row({
    agentLogId: 2,
    requestId: "req-2",
    command: "tolong hidupkan",
    status: "clarification",
    model: null,
    clientLatencyMs: null,
    serverLatencyMs: 3500,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    estimatedCostUsd: null,
  }),
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <AgentLogsView />
    </MemoryRouter>,
  );

describe("AgentLogsView", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    logsQuery.mockReturnValue({ data: { items: rows, totalItems: 2 }, isFetching: false });
    summaryQuery.mockReturnValue({ data: undefined });
  });

  it("lists each command with its outcome, latency, tokens and cost", () => {
    renderPage();

    expect(screen.getByText("tolong hidupkan TV di ruang tamu")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Clarification")).toBeInTheDocument();
    expect(screen.getByText("14.05 s")).toBeInTheDocument();
    expect(screen.getByText("11.094")).toBeInTheDocument();
    expect(screen.getByText("$0.0214")).toBeInTheDocument();
  });

  it("shows which model answered each command, with a dash when none did", () => {
    renderPage();

    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("falls back to the server latency and dashes when the browser or tokens are unknown", () => {
    renderPage();

    expect(screen.getByText("3.50 s")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("asks for the first page of ten with no filter at first", () => {
    renderPage();

    expect(logsQuery).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      status: undefined,
      search: undefined,
    });
    expect(summaryQuery).toHaveBeenCalledWith({ status: undefined, search: undefined });
  });

  it("applies the search to both the table and the totals", () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Search commands…"), {
      target: { value: "lampu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(logsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "lampu", page: 1 }),
    );
    expect(summaryQuery).toHaveBeenLastCalledWith({ status: undefined, search: "lampu" });
  });

  it("filters by outcome", () => {
    renderPage();

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Failed"));

    expect(logsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "failed", page: 1 }),
    );
    expect(summaryQuery).toHaveBeenLastCalledWith({ status: "failed", search: undefined });
  });

  it("opens the details of a command when its row is clicked", () => {
    renderPage();

    fireEvent.click(screen.getByText("tolong hidupkan TV di ruang tamu"));

    expect(screen.getByText("Command details")).toBeInTheDocument();
    expect(screen.getByText("Perangkat TV tidak terdaftar.")).toBeInTheDocument();
  });

  it("shows a helpful message when nothing has been logged yet", () => {
    logsQuery.mockReturnValue({ data: { items: [], totalItems: 0 }, isFetching: false });
    renderPage();

    expect(screen.getByText("No commands yet. Send one from the chat.")).toBeInTheDocument();
  });
});
