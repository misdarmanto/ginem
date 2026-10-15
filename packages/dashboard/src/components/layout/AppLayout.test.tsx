import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n/config";
import { ColorModeContext } from "@/context/colorMode.context";
import { SIDEBAR_STORAGE_KEY } from "./useSidebarOpen";

vi.mock("@/features/chat/components/ChatWidget", () => ({ ChatWidget: () => null }));
vi.mock("@/features/notifications/components/NotificationPanel", () => ({
  NotificationPanel: () => null,
}));
vi.mock("@/hooks/services", () => ({
  useMyProfileQuery: () => ({ data: { userName: "Admin One" } }),
}));
vi.mock("@/hooks/use-token", () => ({ useToken: () => ({ removeToken: vi.fn() }) }));
vi.mock("@/context/app.context.store", () => ({
  useAppContext: () => ({
    appAlert: { isDisplayAlert: false, message: "", alertType: "success" },
    setAppAlert: vi.fn(),
    isLoading: false,
  }),
}));

import AppLayout from "./AppLayout";

const renderLayout = () =>
  render(
    <ColorModeContext.Provider value={{ toggleColorMode: vi.fn() }}>
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    </ColorModeContext.Provider>,
  );

const sidebar = () => document.getElementById("desktop-sidebar") as HTMLElement;
/** The arrow in the sidebar: points left to collapse when open, right to expand on the rail. */
const sidebarArrow = () =>
  within(sidebar()).getByRole("button", { name: /^(Open|Close) menu$/ });
const headerMenuButton = () =>
  within(screen.getByRole("banner")).queryByRole("button", { name: /menu$/ });

function stubViewport(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: mobile && query.includes("max-width"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("AppLayout sidebar", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    stubViewport(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts open, with the full menu, text labels and an arrow to collapse", () => {
    renderLayout();

    expect(sidebar()).toHaveStyle({ width: "260px" });
    expect(within(sidebar()).getByText("Agent")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Ginem AI")).toBeInTheDocument();
    expect(sidebarArrow()).toHaveAccessibleName("Close menu");
    expect(sidebarArrow()).toHaveAttribute("aria-expanded", "true");
  });

  it("has no menu button in the header on desktop, the toggle lives in the sidebar", () => {
    renderLayout();
    expect(headerMenuButton()).toBeNull();

    fireEvent.click(sidebarArrow());
    expect(headerMenuButton()).toBeNull();
  });

  it("collapses to a rail of icons instead of disappearing, with an arrow to open it", () => {
    renderLayout();

    fireEvent.click(sidebarArrow());

    expect(sidebar()).toHaveStyle({ width: "76px" });
    expect(sidebar()).toBeVisible();
    expect(sidebarArrow()).toHaveAccessibleName("Open menu");
    expect(sidebarArrow()).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps every menu entry reachable by name once collapsed, without the text labels", () => {
    renderLayout();

    fireEvent.click(sidebarArrow());

    ["Dashboard", "Devices", "Rules", "Scheduler", "Embedding", "Agent", "Logger", "Admin", "Settings", "Profile"].forEach(
      (name) => {
        expect(within(sidebar()).getByRole("link", { name })).toHaveAttribute("href");
      },
    );
    expect(within(sidebar()).queryByText("Agent")).not.toBeInTheDocument();
    expect(within(sidebar()).queryByText("Ginem AI")).not.toBeInTheDocument();
  });

  it("marks the page you are on in the rail", () => {
    render(
      <ColorModeContext.Provider value={{ toggleColorMode: vi.fn() }}>
        <MemoryRouter initialEntries={["/agent"]}>
          <AppLayout />
        </MemoryRouter>
      </ColorModeContext.Provider>,
    );

    fireEvent.click(sidebarArrow());

    expect(within(sidebar()).getByRole("link", { name: "Agent" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(sidebar()).getByRole("link", { name: "Logger" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("opens again from the arrow on the rail", () => {
    renderLayout();

    fireEvent.click(sidebarArrow());
    fireEvent.click(sidebarArrow());

    expect(sidebar()).toHaveStyle({ width: "260px" });
    expect(within(sidebar()).getByText("Agent")).toBeInTheDocument();
    expect(sidebarArrow()).toHaveAccessibleName("Close menu");
  });

  it("shows only one toggle at a time", () => {
    renderLayout();
    expect(within(sidebar()).getAllByRole("button", { name: /menu$/ })).toHaveLength(1);

    fireEvent.click(sidebarArrow());
    expect(within(sidebar()).getAllByRole("button", { name: /menu$/ })).toHaveLength(1);
  });

  it("remembers that it was collapsed", () => {
    const first = renderLayout();
    fireEvent.click(sidebarArrow());
    first.unmount();

    renderLayout();

    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("false");
    expect(sidebar()).toHaveStyle({ width: "76px" });
    expect(sidebarArrow()).toHaveAccessibleName("Open menu");
  });

  it("labels the navigation landmark for screen readers", () => {
    renderLayout();

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBe(sidebar());
  });

  it("on a phone, keeps the hamburger in the header to open the drawer, and no desktop sidebar", () => {
    stubViewport(true);
    renderLayout();

    expect(sidebar()).toBeNull();
    expect(headerMenuButton()).toHaveAccessibleName("Open menu");
  });
});
