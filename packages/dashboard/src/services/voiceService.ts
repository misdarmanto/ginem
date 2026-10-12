import { apiClient } from "./api";

export const VOICE_API = {
  session: "/chat/voice/session",
  chat: "/chat",
} as const;

export interface VoiceSessionData {
  clientSecret: string;
  expiresAt: number;
  model: string;
}

interface ChatReplyBody {
  data?: { reply?: string };
}

export const voiceService = {
  createSession: async (): Promise<VoiceSessionData> => {
    const body = await apiClient.post<{ data: VoiceSessionData }>(
      VOICE_API.session,
      {},
    );
    return body.data;
  },

  /** Runs a voice request through the same chat agent (and memory) as typed chat. */
  askAssistant: async (message: string): Promise<string> => {
    const body = await apiClient.post<ChatReplyBody>(VOICE_API.chat, { message });
    return body.data?.reply ?? "";
  },
};
