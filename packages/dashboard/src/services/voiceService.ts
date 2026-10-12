import { api, apiClient } from "./api";

export const VOICE_API = {
  session: "/chat/voice/session",
  chat: "/chat",
  preference: "/chat/voice/preference",
  preview: "/chat/voice/preview",
} as const;

export interface VoiceOption {
  id: string;
  label: string;
  description: string;
  recommended: boolean;
}

export interface VoicePreferenceData {
  voice: string;
  options: VoiceOption[];
}

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

  getPreference: () => apiClient.get<VoicePreferenceData>(VOICE_API.preference),

  selectVoice: async (voice: string): Promise<VoicePreferenceData> => {
    const body = await apiClient.post<{ data: VoicePreferenceData }>(
      VOICE_API.preference,
      { voice },
    );
    return body.data;
  },

  /** Short audio sample of a voice, fetched with auth so it cannot be a plain <audio src>. */
  fetchPreview: async (voice: string): Promise<Blob> => {
    const response = await api.get<Blob>(VOICE_API.preview, {
      params: { voice },
      responseType: "blob",
    });
    return response.data;
  },

  /** Runs a voice request through the same chat agent (and memory) as typed chat. */
  askAssistant: async (message: string): Promise<string> => {
    const body = await apiClient.post<ChatReplyBody>(VOICE_API.chat, { message });
    return body.data?.reply ?? "";
  },
};
