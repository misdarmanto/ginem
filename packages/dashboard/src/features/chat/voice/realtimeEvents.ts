export const VOICE_TOOL_NAME = "ask_assistant";
export const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
export const REALTIME_DATA_CHANNEL = "oai-events";

export type VoiceStatus =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

export interface FunctionCall {
  callId: string;
  name: string;
  query: string;
}

interface ResponseOutputItem {
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
}

export function parseRealtimeEvent(raw: string): RealtimeEvent | null {
  try {
    const parsed = JSON.parse(raw) as RealtimeEvent;
    return typeof parsed?.type === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Completed `ask_assistant` calls found in a `response.done` event. */
export function extractFunctionCalls(event: RealtimeEvent): FunctionCall[] {
  if (event.type !== "response.done") return [];

  const output = (
    event.response as { output?: ResponseOutputItem[] } | undefined
  )?.output;
  if (!Array.isArray(output)) return [];

  return output.flatMap((item): FunctionCall[] => {
    if (item.type !== "function_call" || item.name !== VOICE_TOOL_NAME)
      return [];
    if (!item.call_id) return [];

    let query = "";
    try {
      const args = JSON.parse(item.arguments ?? "{}") as { query?: unknown };
      query = typeof args.query === "string" ? args.query.trim() : "";
    } catch {
      query = "";
    }
    return [{ callId: item.call_id, name: item.name, query }];
  });
}

/** Events that hand a tool result back to the model and ask it to speak. */
export function buildFunctionOutputEvents(
  callId: string,
  output: unknown,
): RealtimeEvent[] {
  return [
    {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    },
    { type: "response.create" },
  ];
}

export type TranscriptEvent = { role: "user" | "assistant"; text: string };

export function extractTranscript(
  event: RealtimeEvent,
): TranscriptEvent | null {
  const text =
    typeof event.transcript === "string" ? event.transcript.trim() : "";
  if (!text) return null;

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    return { role: "user", text };
  }
  if (
    event.type === "response.output_audio_transcript.done" ||
    event.type === "response.audio_transcript.done"
  ) {
    return { role: "assistant", text };
  }
  return null;
}

/** Status implied by an event, or null when the event does not change it. */
export function statusForEvent(event: RealtimeEvent): VoiceStatus | null {
  switch (event.type) {
    case "input_audio_buffer.speech_started":
      return "listening";
    case "input_audio_buffer.speech_stopped":
      return "thinking";
    case "output_audio_buffer.started":
      return "speaking";
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return "listening";
    default:
      return null;
  }
}

export function extractErrorMessage(event: RealtimeEvent): string | null {
  if (event.type !== "error") return null;
  const message = (event.error as { message?: unknown } | undefined)?.message;
  return typeof message === "string" && message
    ? message
    : "Voice session error";
}
