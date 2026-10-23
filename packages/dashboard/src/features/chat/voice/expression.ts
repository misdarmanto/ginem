import type { VoiceStatus } from "./realtimeEvents";

export type Expression =
  "neutral" | "happy" | "sad" | "angry" | "asking" | "surprised" | "thinking";

const SAD =
  /\b(maaf|gagal|sayangnya|sayang banget|sedih|nggak bisa|gak bisa|tidak bisa|belum bisa|nggak ketemu|tidak ditemukan|masalah|error|sorry|unfortunately|failed)\b/;
const ANGRY = /\b(marah|kesal|sebel|awas|bahaya|dilarang|angry)\b/;
const SURPRISED = /\b(wah|wow|hah|astaga|serius|kaget|whoa)\b/;
const HAPPY =
  /\b(udah|sudah|berhasil|siap|oke|ok|sip|makasih|terima kasih|senang|haha|hehe|yeay|mantap|nyala|menyala|selesai|done|great|glad)\b/;

function endsWithQuestion(text: string): boolean {
  return /\?\s*$/.test(text);
}

/** Emotion carried by what the assistant says; neutral when nothing stands out. */
export function detectExpression(text: string): Expression {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "neutral";
  if (SAD.test(normalized)) return "sad";
  if (ANGRY.test(normalized)) return "angry";
  if (SURPRISED.test(normalized)) return "surprised";
  if (endsWithQuestion(normalized)) return "asking";
  if (HAPPY.test(normalized) || normalized.endsWith("!")) return "happy";
  return "neutral";
}

/** Face to show: the session state wins, and while speaking the reply sets the mood. */
export function expressionFor(
  status: VoiceStatus,
  assistantText: string,
): Expression {
  switch (status) {
    case "error":
      return "sad";
    case "thinking":
      return "thinking";
    case "speaking":
      return detectExpression(assistantText);
    default:
      return "neutral";
  }
}
