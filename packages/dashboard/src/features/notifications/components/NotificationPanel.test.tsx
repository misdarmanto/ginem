import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n/config";
import type { AppLog } from "@/services/loggerService";
import { NotificationPanel } from "./NotificationPanel";

const entry = (overrides: Partial<AppLog>): AppLog => ({
  appLogId: 1,
  appLogLevel: "error",
  appLogMessage: "[ChatServices] - Failed to send message\n",
  appLogSource: null,
  createdAt: "2026-08-19 21:42:33",
  ...overrides,
});

const items = [
  entry({ appLogId: 3, appLogLevel: "error", appLogMessage: "newest error" }),
  entry({ appLogId: 2, appLogLevel: "warn", appLogMessage: "a warning", appLogSource: "MQTTService" }),
  entry({ appLogId: 1, appLogLevel: "info", appLogMessage: "just info" }),
];

const show = (props: Partial<React.ComponentProps<typeof NotificationPanel>> = {}) => {
  const onClose = vi.fn();
  const onSeen = vi.fn();
  render(
    <MemoryRouter>
      <NotificationPanel
        open
        onClose={onClose}
        items={items}
        isLoading={false}
        isError={false}
        lastSeenId={null}
        onSeen={onSeen}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onClose, onSeen };
};

describe("NotificationPanel", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("lists the system log entries, newest first, with their messages", () => {
    show();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("newest error")).toBeInTheDocument();
    expect(within(rows[1]).getByText("a warning")).toBeInTheDocument();
    expect(within(rows[2]).getByText("just info")).toBeInTheDocument();
  });

  it("shows each entry's level, and the source when there is one", () => {
    show();

    expect(screen.getByLabelText("error")).toBeInTheDocument();
    expect(screen.getByLabelText("warn")).toBeInTheDocument();
    expect(screen.getByLabelText("info")).toBeInTheDocument();
    expect(screen.getByText(/MQTTService ·/)).toBeInTheDocument();
  });

  it("trims trailing newlines from the stored message", () => {
    show({ items: [entry({ appLogMessage: "[MQTTService] - unstable\n" })] });

    expect(screen.getByText("[MQTTService] - unstable")).toBeInTheDocument();
  });

  it("marks only entries newer than what was last seen as new", () => {
    show({ lastSeenId: 1 });

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByLabelText("New")).toBeInTheDocument();
    expect(within(rows[1]).getByLabelText("New")).toBeInTheDocument();
    expect(within(rows[2]).queryByLabelText("New")).not.toBeInTheDocument();
  });

  it("marks nothing as new on the first visit", () => {
    show({ lastSeenId: null });

    expect(screen.queryByLabelText("New")).not.toBeInTheDocument();
  });

  it("reports that it was seen as soon as it opens", () => {
    const { onSeen } = show();

    expect(onSeen).toHaveBeenCalledTimes(1);
  });

  it("does not report anything while closed", () => {
    const { onSeen } = show({ open: false });

    expect(onSeen).not.toHaveBeenCalled();
  });

  it("shows a spinner while loading", () => {
    show({ items: [], isLoading: true });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("says so when there is nothing yet", () => {
    show({ items: [] });

    expect(screen.getByText("No system events yet.")).toBeInTheDocument();
  });

  it("shows an error when loading failed and nothing is cached", () => {
    show({ items: [], isError: true });

    expect(screen.getByText("Could not load notifications.")).toBeInTheDocument();
  });

  it("keeps showing the entries it has when a refresh fails", () => {
    show({ isError: true });

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Could not load notifications.")).not.toBeInTheDocument();
  });

  it("links to the Logger page and closes", () => {
    const { onClose } = show();

    const link = screen.getByRole("link", { name: "View all in Logger" });
    fireEvent.click(link);

    expect(link).toHaveAttribute("href", "/logger");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes from the close button", () => {
    const { onClose } = show();

    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));

    expect(onClose).toHaveBeenCalled();
  });
});
