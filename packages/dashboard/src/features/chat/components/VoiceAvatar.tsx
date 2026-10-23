import { useEffect, useState } from "react";
import type { Expression } from "../voice/expression";
import { spectrumToLevels } from "../voice/waveform";
import PixelAvatar from "./PixelAvatar";

const MOUTH_GAIN = 2.5;
const MOUTH_STEP = 0.1;
const SMOOTHING = 0.5;

interface VoiceAvatarProps {
  expression: Expression;
  /** Output audio; the mouth follows it while the assistant speaks. Null keeps the mouth shut. */
  speechAnalyser: AnalyserNode | null;
  size?: number | string;
}

export default function VoiceAvatar({
  expression,
  speechAnalyser,
  size = 220,
}: VoiceAvatarProps) {
  const [mouthOpen, setMouthOpen] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!speechAnalyser) {
      setMouthOpen(undefined);
      return;
    }

    const spectrum = new Uint8Array(speechAnalyser.frequencyBinCount);
    let level = 0;
    let frame = 0;

    const tick = () => {
      speechAnalyser.getByteFrequencyData(spectrum);
      const target = Math.min(
        1,
        (spectrumToLevels(spectrum, 1)[0] ?? 0) * MOUTH_GAIN,
      );
      level += (target - level) * SMOOTHING;
      // Quantised so React only re-renders when the mouth visibly moves.
      setMouthOpen(Math.round(level / MOUTH_STEP) * MOUTH_STEP);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => cancelAnimationFrame(frame);
  }, [speechAnalyser]);

  return (
    <PixelAvatar expression={expression} mouthOpen={mouthOpen} size={size} />
  );
}
