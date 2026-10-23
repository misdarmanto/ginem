import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PixelAvatar from "./PixelAvatar";
import type { Expression } from "../voice/expression";

const EXPRESSIONS: Expression[] = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "asking",
  "surprised",
  "thinking",
];

describe("PixelAvatar", () => {
  it.each(EXPRESSIONS)("renders the %s face", (expression) => {
    const { container } = render(<PixelAvatar expression={expression} />);
    const svg = container.querySelector("svg");

    expect(svg?.getAttribute("data-expression")).toBe(expression);
    expect(svg?.querySelectorAll("rect").length).toBeGreaterThan(8);
  });

  it("draws a speaking mouth that grows with the audio level", () => {
    const closed = render(<PixelAvatar mouthOpen={0} />).container;
    const open = render(<PixelAvatar mouthOpen={1} />).container;
    const heightOf = (root: HTMLElement) =>
      Math.max(
        ...[...root.querySelectorAll("rect")]
          .map((r) => Number(r.getAttribute("height")))
          .filter((h) => h < 40),
      );

    expect(heightOf(open)).toBeGreaterThan(heightOf(closed));
  });
});
