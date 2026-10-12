import { useCallback, useEffect, useRef, useState } from "react";
import { voiceService } from "@/services/voiceService";
import {
  REALTIME_CALLS_URL,
  REALTIME_DATA_CHANNEL,
  buildFunctionOutputEvents,
  extractErrorMessage,
  extractFunctionCalls,
  extractTranscript,
  parseRealtimeEvent,
  statusForEvent,
  type FunctionCall,
  type RealtimeEvent,
  type TranscriptEvent,
  type VoiceStatus,
} from "./realtimeEvents";
import { useSpokenCaption } from "./useSpokenCaption";
import { spectrumToLevels } from "./waveform";

/** Ends a silent session so an open mic cannot keep billing in the background. */
export const VOICE_IDLE_TIMEOUT_MS = 60_000;
export const VOICE_MAX_SESSION_MS = 10 * 60_000;

export interface VoiceAnalysers {
  input: AnalyserNode | null;
  output: AnalyserNode | null;
}

const NO_ANALYSERS: VoiceAnalysers = { input: null, output: null };
const ANALYSER_FFT_SIZE = 256;
const ANALYSER_SMOOTHING = 0.8;

function createAnalyser(
  context: AudioContext,
  stream: MediaStream,
): AnalyserNode {
  const analyser = context.createAnalyser();
  analyser.fftSize = ANALYSER_FFT_SIZE;
  analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
  // Not connected to the destination: the <audio> element already plays the sound.
  context.createMediaStreamSource(stream).connect(analyser);
  return analyser;
}

interface UseRealtimeVoiceOptions {
  onTranscript: (transcript: TranscriptEvent) => void;
}

export function useRealtimeVoice({ onTranscript }: UseRealtimeVoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [analysers, setAnalysers] = useState<VoiceAnalysers>(NO_ANALYSERS);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const attemptRef = useRef(0);

  const getOutputLevel = useCallback((): number | null => {
    const analyser = outputAnalyserRef.current;
    if (!analyser) return null;
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(spectrum);
    return spectrumToLevels(spectrum, 1)[0] ?? 0;
  }, []);

  const spokenCaption = useSpokenCaption({ getOutputLevel });
  const handleCaptionEvent = spokenCaption.handleEvent;
  const resetCaption = spokenCaption.reset;

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(maxTimerRef.current);
  }, []);

  const teardown = useCallback(() => {
    attemptRef.current += 1;
    clearTimers();
    channelRef.current?.close();
    peerRef.current?.close();
    micRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    outputAnalyserRef.current = null;
    resetCaption();
    setAnalysers(NO_ANALYSERS);
    channelRef.current = null;
    peerRef.current = null;
    micRef.current = null;
    audioRef.current = null;
    setMuted(false);
  }, [clearTimers, resetCaption]);

  const stop = useCallback(() => {
    teardown();
    setStatus("idle");
  }, [teardown]);

  const fail = useCallback(
    (message: string) => {
      teardown();
      setError(message);
      setStatus("error");
    },
    [teardown],
  );

  const send = useCallback((events: RealtimeEvent[]) => {
    const channel = channelRef.current;
    if (channel?.readyState !== "open") return;
    events.forEach((event) => channel.send(JSON.stringify(event)));
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stop, VOICE_IDLE_TIMEOUT_MS);
  }, [stop]);

  const runToolCall = useCallback(
    async (call: FunctionCall) => {
      setStatus("thinking");
      try {
        const reply = call.query
          ? await voiceService.askAssistant(call.query)
          : "";
        send(buildFunctionOutputEvents(call.callId, { reply }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        send(buildFunctionOutputEvents(call.callId, { error: message }));
      }
    },
    [send],
  );

  const handleMessage = useCallback(
    (raw: string) => {
      const event = parseRealtimeEvent(raw);
      if (!event) return;

      resetIdleTimer();
      handleCaptionEvent(event);

      const errorMessage = extractErrorMessage(event);
      if (errorMessage) {
        setError(errorMessage);
        return;
      }

      const nextStatus = statusForEvent(event);
      if (nextStatus) setStatus(nextStatus);

      const transcript = extractTranscript(event);
      if (transcript) onTranscriptRef.current(transcript);

      extractFunctionCalls(event).forEach((call) => {
        void runToolCall(call);
      });
    },
    [handleCaptionEvent, resetIdleTimer, runToolCall],
  );

  const start = useCallback(async () => {
    if (peerRef.current) return;

    const attempt = ++attemptRef.current;
    const isStale = () => attempt !== attemptRef.current;
    setError(null);
    setStatus("connecting");

    // Created synchronously inside the click so the browser lets it run.
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    void audioContext.resume();

    try {
      const session = await voiceService.createSession();
      if (isStale()) return;

      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (isStale()) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      micRef.current = mic;
      setAnalysers((current) => ({
        ...current,
        input: createAnalyser(audioContext, mic),
      }));

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = (event) => {
        const [remote] = event.streams;
        audio.srcObject = remote;
        const output = createAnalyser(audioContext, remote);
        outputAnalyserRef.current = output;
        setAnalysers((current) => ({ ...current, output }));
      };

      mic.getTracks().forEach((track) => peer.addTrack(track, mic));

      const channel = peer.createDataChannel(REALTIME_DATA_CHANNEL);
      channelRef.current = channel;
      channel.onmessage = (event) => handleMessage(String(event.data));
      channel.onopen = () => {
        setStatus("listening");
        resetIdleTimer();
        maxTimerRef.current = setTimeout(stop, VOICE_MAX_SESSION_MS);
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          fail("Voice connection lost");
        } else if (peer.connectionState === "closed") {
          stop();
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const response = await fetch(REALTIME_CALLS_URL, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!response.ok) {
        throw new Error(`Realtime connection rejected (${response.status})`);
      }
      if (isStale()) return;

      await peer.setRemoteDescription({
        type: "answer",
        sdp: await response.text(),
      });
    } catch (err) {
      if (isStale()) return;
      const denied =
        err instanceof DOMException && err.name === "NotAllowedError";
      fail(
        denied
          ? "Microphone permission denied"
          : err instanceof Error
            ? err.message
            : "Failed to start voice session",
      );
    }
  }, [fail, handleMessage, resetIdleTimer, stop]);

  const toggleMute = useCallback(() => {
    const tracks = micRef.current?.getAudioTracks() ?? [];
    const nextMuted = !muted;
    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  useEffect(() => teardown, [teardown]);

  return {
    status,
    error,
    muted,
    analysers,
    spokenCaption: spokenCaption.caption,
    start,
    stop,
    toggleMute,
  };
}
