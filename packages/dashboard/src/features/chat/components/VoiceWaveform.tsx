import { useEffect, useRef } from "react";
import { useTheme } from "@mui/material";
import {
  mirrorLevels,
  smoothLevels,
  spectrumToLevels,
} from "../voice/waveform";

const BAR_COUNT = 16;
const BAR_WIDTH = 8;
const BAR_GAP = 6;
const MIN_BAR_RATIO = 0.06;
const LEVEL_CURVE = 1.4;
const LEVEL_GAIN = 1.5;
const HEIGHT = 160;
const WIDTH = BAR_COUNT * 2 * (BAR_WIDTH + BAR_GAP);

interface VoiceWaveformProps {
  /** Source of the frequency data; null draws a resting waveform. */
  analyser: AnalyserNode | null;
  color?: string;
}

export default function VoiceWaveform({ analyser, color }: VoiceWaveformProps) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fill = color ?? theme.palette.primary.main;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;
    context.scale(ratio, ratio);

    const spectrum = new Uint8Array(analyser?.frequencyBinCount ?? 0);
    let levels: number[] = new Array(BAR_COUNT).fill(0);
    let frame = 0;

    const draw = () => {
      if (analyser) analyser.getByteFrequencyData(spectrum);
      levels = smoothLevels(levels, spectrumToLevels(spectrum, BAR_COUNT));

      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.fillStyle = fill;

      mirrorLevels(levels).forEach((level, i) => {
        const barHeight =
          Math.max(MIN_BAR_RATIO, Math.min(1, level ** LEVEL_CURVE * LEVEL_GAIN)) * HEIGHT;
        const x = i * (BAR_WIDTH + BAR_GAP);
        context.beginPath();
        context.roundRect(
          x,
          (HEIGHT - barHeight) / 2,
          BAR_WIDTH,
          barHeight,
          BAR_WIDTH / 2,
        );
        context.fill();
      });

      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser, fill]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: WIDTH, height: HEIGHT, maxWidth: "100%" }}
    />
  );
}
