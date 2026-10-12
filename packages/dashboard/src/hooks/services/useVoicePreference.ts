import { useApiGet } from "@/hooks/api/useApiGet";
import { useServicePostMutation } from "@/hooks/api/useApiMutations";
import {
  VOICE_API,
  voiceService,
  type VoicePreferenceData,
} from "@/services/voiceService";

export function useVoicePreferenceQuery() {
  return useApiGet<VoicePreferenceData>(VOICE_API.preference);
}

export function useSelectVoiceMutation(successMessage?: string) {
  return useServicePostMutation<VoicePreferenceData, string>(
    (voice) => voiceService.selectVoice(voice),
    { invalidateGetPaths: [VOICE_API.preference], successMessage },
  );
}
