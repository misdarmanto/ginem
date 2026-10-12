import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import type { SpokenCaption } from "../voice/captionSync";

const VISIBLE_LINES = 3;
const LINE_HEIGHT = 1.6;
const FADE = "linear-gradient(transparent, #000 18%, #000 82%, transparent)";

interface SpokenCaptionTextProps {
  caption: SpokenCaption;
}

/** Live subtitle: spoken words in full colour, upcoming words dimmed, kept in view as it advances. */
export default function SpokenCaptionText({ caption }: SpokenCaptionTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const marker = markerRef.current;
    if (!container || !marker) return;

    const target = marker.offsetTop - container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [caption.spoken]);

  return (
    <Box
      ref={containerRef}
      aria-live="off"
      sx={{
        position: "relative",
        maxWidth: 640,
        width: "100%",
        maxHeight: `${VISIBLE_LINES * LINE_HEIGHT}em`,
        overflow: "hidden",
        textAlign: "center",
        fontSize: { xs: 15, sm: 16 },
        fontWeight: 400,
        lineHeight: LINE_HEIGHT,
        maskImage: FADE,
        WebkitMaskImage: FADE,
      }}
    >
      <Box component="span" sx={{ color: "text.primary" }}>
        {caption.spoken}
      </Box>
      <span ref={markerRef} />
      <Box component="span" sx={{ color: "text.disabled" }}>
        {caption.pending}
      </Box>
    </Box>
  );
}
