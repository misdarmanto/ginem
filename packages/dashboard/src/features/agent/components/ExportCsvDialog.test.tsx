import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n/config";

const exportCsv = vi.fn();
const saveBlob = vi.fn();

vi.mock("@/services/agentService", () => ({
  agentService: { exportCsv: (...args: unknown[]) => exportCsv(...args) },
}));

vi.mock("../downloadFile", () => ({
  saveBlob: (...args: unknown[]) => saveBlob(...args),
}));

import ExportCsvDialog from "./ExportCsvDialog";

const open = (props: Partial<React.ComponentProps<typeof ExportCsvDialog>> = {}) => {
  const onClose = vi.fn();
  render(<ExportCsvDialog open onClose={onClose} filter={{}} {...props} />);
  return { onClose };
};

const from = () => screen.getByLabelText("From") as HTMLInputElement;
const to = () => screen.getByLabelText("To") as HTMLInputElement;
const downloadButton = () => screen.getByRole("button", { name: "Download CSV" });
const pick = (label: string) => fireEvent.click(screen.getByRole("button", { name: label }));

describe("ExportCsvDialog", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    exportCsv.mockResolvedValue(new Blob(["csv"]));
  });

  it("offers every range the user asked for", () => {
    open();

    ["Today", "Yesterday", "This week", "This month", "All time", "Custom"].forEach((label) =>
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument(),
    );
  });

  it("starts on today, with both dates filled in", () => {
    open();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    expect(from().value).toBe(iso);
    expect(to().value).toBe(iso);
  });

  it("fills the dates for the chosen preset so the range is visible", () => {
    open();

    pick("This month");

    expect(from().value).toMatch(/^\d{4}-\d{2}-01$/);
    expect(to().value).toMatch(/^\d{4}-\d{2}-(28|29|30|31)$/);
  });

  it("clears the dates for all time", () => {
    open();

    pick("All time");

    expect(from().value).toBe("");
    expect(to().value).toBe("");
    expect(screen.getByText("All logs")).toBeInTheDocument();
  });

  it("switches to custom as soon as a date is edited", () => {
    open();

    fireEvent.change(from(), { target: { value: "2026-09-01" } });

    expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
  });

  it("downloads the chosen custom range with the table's filters", async () => {
    const { onClose } = open({ filter: { status: "failed", search: "lampu" } });

    pick("Custom");
    fireEvent.change(from(), { target: { value: "2026-10-01" } });
    fireEvent.change(to(), { target: { value: "2026-10-15" } });
    fireEvent.click(downloadButton());

    await waitFor(() => expect(saveBlob).toHaveBeenCalled());
    expect(exportCsv).toHaveBeenCalledWith({
      status: "failed",
      search: "lampu",
      from: "2026-10-01",
      to: "2026-10-15",
    });
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), "agent-logs_2026-10-01_2026-10-15.csv");
    expect(onClose).toHaveBeenCalled();
  });

  it("downloads everything for all time", async () => {
    open();

    pick("All time");
    fireEvent.click(downloadButton());

    await waitFor(() => expect(exportCsv).toHaveBeenCalledWith({ from: "", to: "" }));
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), "agent-logs_all.csv");
  });

  it("tells the user the table's filters are applied only when there are some", () => {
    const { unmount } = render(<ExportCsvDialog open onClose={vi.fn()} filter={{}} />);
    expect(screen.queryByText(/currently applied to the table/)).not.toBeInTheDocument();
    unmount();

    render(<ExportCsvDialog open onClose={vi.fn()} filter={{ status: "failed" }} />);
    expect(screen.getByText(/currently applied to the table/)).toBeInTheDocument();
  });

  it("will not download a custom range with an end before its start", () => {
    open();

    pick("Custom");
    fireEvent.change(from(), { target: { value: "2026-10-15" } });
    fireEvent.change(to(), { target: { value: "2026-10-01" } });

    expect(screen.getByText("The start date must not be after the end date.")).toBeInTheDocument();
    expect(downloadButton()).toBeDisabled();
  });

  it("will not download a custom range missing a date", () => {
    open();

    pick("Custom");
    fireEvent.change(to(), { target: { value: "" } });

    expect(screen.getByText("Pick both a start and an end date.")).toBeInTheDocument();
    expect(downloadButton()).toBeDisabled();
  });

  it("shows an error and stays open when the export fails", async () => {
    exportCsv.mockRejectedValue(new Error("boom"));
    const { onClose } = open();

    fireEvent.click(downloadButton());

    expect(await screen.findByText("The export failed. Please try again.")).toBeInTheDocument();
    expect(saveBlob).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without exporting when cancelled", () => {
    const { onClose } = open();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(exportCsv).not.toHaveBeenCalled();
  });
});
