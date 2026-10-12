import { useCallback, useEffect, useRef, useState } from "react";
import { voiceService } from "@/services/voiceService";

/** Plays one voice sample at a time; samples are fetched once and kept for the session. */
export function useVoicePreview() {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef(new Map<string, string>());
  const requestRef = useRef(0);

  const stop = useCallback(() => {
    requestRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingVoice(null);
    setLoadingVoice(null);
  }, []);

  const play = useCallback(
    async (voice: string) => {
      stop();
      setFailed(false);
      const request = requestRef.current;

      try {
        let url = urlsRef.current.get(voice);
        if (!url) {
          setLoadingVoice(voice);
          url = URL.createObjectURL(await voiceService.fetchPreview(voice));
          urlsRef.current.set(voice, url);
        }
        if (request !== requestRef.current) return;

        const audio = new Audio(url);
        audio.onended = () => setPlayingVoice(null);
        audioRef.current = audio;
        setLoadingVoice(null);
        setPlayingVoice(voice);
        await audio.play();
      } catch {
        if (request !== requestRef.current) return;
        stop();
        setFailed(true);
      }
    },
    [stop],
  );

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      audioRef.current?.pause();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return { playingVoice, loadingVoice, failed, play, stop };
}
