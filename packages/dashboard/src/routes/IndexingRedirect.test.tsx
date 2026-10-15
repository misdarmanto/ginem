import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import IndexingRedirect from "./IndexingRedirect";

function Where() {
  const { pathname, search } = useLocation();
  return <p>{`${pathname}${search}`}</p>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/indexing" element={<IndexingRedirect />} />
        <Route path="/agent/embedding" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("IndexingRedirect", () => {
  it("sends an old /indexing link to the Embedding tab under Agent", () => {
    renderAt("/indexing");

    expect(screen.getByText("/agent/embedding")).toBeInTheDocument();
  });

  it("keeps the query string, such as a saved search", () => {
    renderAt("/indexing?search=lampu");

    expect(screen.getByText("/agent/embedding?search=lampu")).toBeInTheDocument();
  });
});
