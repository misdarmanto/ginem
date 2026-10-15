import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import i18n from "@/i18n/config";
import AgentLayout from "./AgentLayout";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/agent" element={<AgentLayout />}>
          <Route index element={<p>log page</p>} />
          <Route path="embedding" element={<p>embedding page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const tab = (name: string) => screen.getByRole("tab", { name });

describe("AgentLayout", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("opens on the Log tab at /agent and shows the log page", () => {
    renderAt("/agent");

    expect(tab("Log")).toHaveAttribute("aria-selected", "true");
    expect(tab("Embedding")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("log page")).toBeInTheDocument();
    expect(screen.queryByText("embedding page")).not.toBeInTheDocument();
  });

  it("opens on the Embedding tab at /agent/embedding", () => {
    renderAt("/agent/embedding");

    expect(tab("Embedding")).toHaveAttribute("aria-selected", "true");
    expect(tab("Log")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("embedding page")).toBeInTheDocument();
  });

  it("switches page when a tab is clicked, and back again", () => {
    renderAt("/agent");

    fireEvent.click(tab("Embedding"));
    expect(screen.getByText("embedding page")).toBeInTheDocument();
    expect(tab("Embedding")).toHaveAttribute("aria-selected", "true");

    fireEvent.click(tab("Log"));
    expect(screen.getByText("log page")).toBeInTheDocument();
  });

  it("gives each tab its own address, so a tab can be bookmarked and survives a reload", () => {
    renderAt("/agent");

    expect(tab("Log")).toHaveAttribute("href", "/agent");
    expect(tab("Embedding")).toHaveAttribute("href", "/agent/embedding");
  });

  it("labels the tabs with text only, no icons", () => {
    renderAt("/agent");

    expect(tab("Log").querySelector("svg")).toBeNull();
    expect(tab("Embedding").querySelector("svg")).toBeNull();
  });

  it("shows the Agent title above the tabs on both tabs", () => {
    const { unmount } = renderAt("/agent");
    expect(screen.getByRole("heading", { name: "Agent" })).toBeInTheDocument();
    unmount();

    renderAt("/agent/embedding");
    expect(screen.getByRole("heading", { name: "Agent" })).toBeInTheDocument();
  });

  it("adds Embedding to the breadcrumb only on that tab", () => {
    const { unmount } = renderAt("/agent");
    const crumbs = () => screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(crumbs()).queryByText("Embedding")).not.toBeInTheDocument();
    unmount();

    renderAt("/agent/embedding");
    expect(within(crumbs()).getByText("Embedding")).toBeInTheDocument();
  });
});
