import { describe, expect, it } from "vitest";
import { detectExpression, expressionFor } from "./expression";

describe("detectExpression", () => {
  it.each([
    ["Udah nyala nih.", "happy"],
    ["Maaf, aku nggak bisa nemuin perangkatnya.", "sad"],
    ["Awas, suhunya bahaya banget!", "angry"],
    ["Wah, serius segitu panas?", "surprised"],
    ["Mau dinyalain jam berapa?", "asking"],
    ["Lampu depan lagi mati.", "neutral"],
    ["Mantap!", "happy"],
    ["", "neutral"],
  ])("reads %j as %s", (text, expected) => {
    expect(detectExpression(text)).toBe(expected);
  });
});

describe("expressionFor", () => {
  it("lets the session state win over the text", () => {
    expect(expressionFor("error", "Udah nyala")).toBe("sad");
    expect(expressionFor("thinking", "Udah nyala")).toBe("thinking");
    expect(expressionFor("listening", "Udah nyala")).toBe("neutral");
    expect(expressionFor("connecting", "")).toBe("neutral");
  });

  it("follows the reply while speaking", () => {
    expect(expressionFor("speaking", "Udah nyala nih.")).toBe("happy");
    expect(expressionFor("speaking", "")).toBe("neutral");
  });
});
