import { describe, expect, it } from "vitest";
import {
  buildFunctionOutputEvents,
  extractErrorMessage,
  extractFunctionCalls,
  extractTranscript,
  parseRealtimeEvent,
  statusForEvent,
} from "./realtimeEvents";

describe("parseRealtimeEvent", () => {
  it("parses a JSON event", () => {
    expect(parseRealtimeEvent('{"type":"session.created"}')).toEqual({
      type: "session.created",
    });
  });

  it.each(["not json", "{}", '{"type":1}', "null"])("rejects %s", (raw) => {
    expect(parseRealtimeEvent(raw)).toBeNull();
  });
});

describe("extractFunctionCalls", () => {
  const done = (output: unknown[]) => ({
    type: "response.done",
    response: { output },
  });

  it("returns ask_assistant calls with parsed query", () => {
    const calls = extractFunctionCalls(
      done([
        { type: "message" },
        {
          type: "function_call",
          name: "ask_assistant",
          call_id: "call_1",
          arguments: '{"query":" nyalakan lampu "}',
        },
      ]),
    );

    expect(calls).toEqual([
      { callId: "call_1", name: "ask_assistant", query: "nyalakan lampu" },
    ]);
  });

  it("ignores unknown tools, missing call ids and other events", () => {
    expect(
      extractFunctionCalls(
        done([
          {
            type: "function_call",
            name: "other",
            call_id: "c",
            arguments: "{}",
          },
          { type: "function_call", name: "ask_assistant", arguments: "{}" },
        ]),
      ),
    ).toEqual([]);
    expect(extractFunctionCalls({ type: "response.created" })).toEqual([]);
  });

  it("tolerates malformed arguments", () => {
    const [call] = extractFunctionCalls(
      done([
        {
          type: "function_call",
          name: "ask_assistant",
          call_id: "c",
          arguments: "{broken",
        },
      ]),
    );

    expect(call.query).toBe("");
  });
});

describe("buildFunctionOutputEvents", () => {
  it("returns the tool output followed by a response request", () => {
    const [item, create] = buildFunctionOutputEvents("call_1", { reply: "ok" });

    expect(item).toEqual({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call_1",
        output: '{"reply":"ok"}',
      },
    });
    expect(create).toEqual({ type: "response.create" });
  });
});

describe("extractTranscript", () => {
  it("maps user and assistant transcripts", () => {
    expect(
      extractTranscript({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: " halo ",
      }),
    ).toEqual({ role: "user", text: "halo" });
    expect(
      extractTranscript({
        type: "response.output_audio_transcript.done",
        transcript: "Hai",
      }),
    ).toEqual({ role: "assistant", text: "Hai" });
  });

  it("ignores empty transcripts and other events", () => {
    expect(
      extractTranscript({
        type: "response.output_audio_transcript.done",
        transcript: "  ",
      }),
    ).toBeNull();
    expect(extractTranscript({ type: "response.done" })).toBeNull();
  });
});

describe("statusForEvent", () => {
  it("tracks speech and playback", () => {
    expect(statusForEvent({ type: "input_audio_buffer.speech_started" })).toBe(
      "listening",
    );
    expect(statusForEvent({ type: "input_audio_buffer.speech_stopped" })).toBe(
      "thinking",
    );
    expect(statusForEvent({ type: "output_audio_buffer.started" })).toBe(
      "speaking",
    );
    expect(statusForEvent({ type: "output_audio_buffer.stopped" })).toBe(
      "listening",
    );
    expect(statusForEvent({ type: "response.done" })).toBeNull();
  });
});

describe("extractErrorMessage", () => {
  it("returns the API error message", () => {
    expect(
      extractErrorMessage({ type: "error", error: { message: "boom" } }),
    ).toBe("boom");
  });

  it("falls back to a generic message and ignores non-errors", () => {
    expect(extractErrorMessage({ type: "error" })).toBe("Voice session error");
    expect(extractErrorMessage({ type: "response.done" })).toBeNull();
  });
});
