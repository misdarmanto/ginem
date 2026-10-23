import { useEffect } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { useTranslation } from "react-i18next";
import type { SpokenCaption } from "../voice/captionSync";
import type { VoiceAnalysers } from "../voice/useRealtimeVoice";
import type { VoiceStatus } from "../voice/realtimeEvents";
import SpokenCaptionText from "./SpokenCaptionText";
import VoiceAvatar from "./VoiceAvatar";
import { expressionFor } from "../voice/expression";

interface VoiceOverlayProps {
  status: VoiceStatus;
  muted: boolean;
  error: string | null;
  /** What the user last said. */
  caption: string;
  /** What the assistant is saying, revealed in step with the audio. */
  spokenCaption: SpokenCaption;
  analysers: VoiceAnalysers;
  onToggleMute: () => void;
  onRetry: () => void;
  onEnd: () => void;
}

export default function VoiceOverlay({
  status,
  muted,
  error,
  caption,
  spokenCaption,
  analysers,
  onToggleMute,
  onRetry,
  onEnd,
}: VoiceOverlayProps) {
  const { t } = useTranslation();
  const isError = status === "error";
  const expression = expressionFor(
    status,
    spokenCaption.spoken + spokenCaption.pending,
  );
  const hasAssistantCaption =
    spokenCaption.spoken !== "" || spokenCaption.pending !== "";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEnd();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEnd]);

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={t("chatPage.voice.title")}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.drawer + 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        px: 3,
        backdropFilter: "blur(14px)",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(2,6,23,0.88)"
            : "rgba(248,250,252,0.9)",
      }}
    >
      <VoiceAvatar
        expression={expression}
        speechAnalyser={status === "speaking" ? analysers.output : null}
      />

      <Typography
        variant="h6"
        fontWeight={600}
        role="status"
        color={isError ? "error" : "text.primary"}
      >
        {isError && error ? error : t(`chatPage.voice.status.${status}`)}
      </Typography>

      <Box
        sx={{
          minHeight: 96,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {hasAssistantCaption ? (
          <SpokenCaptionText caption={spokenCaption} />
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 520, textAlign: "center" }}
          >
            {caption}
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        {isError ? (
          <Button variant="contained" onClick={onRetry}>
            {t("chatPage.voice.retry")}
          </Button>
        ) : (
          <IconButton
            onClick={onToggleMute}
            disabled={status === "connecting"}
            aria-label={t(
              muted ? "chatPage.voice.unmute" : "chatPage.voice.mute",
            )}
            sx={{ width: 56, height: 56, bgcolor: "action.hover" }}
          >
            {muted ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
        )}
        <IconButton
          onClick={onEnd}
          aria-label={t("chatPage.voice.end")}
          sx={{
            width: 56,
            height: 56,
            bgcolor: "error.main",
            color: "error.contrastText",
            "&:hover": { bgcolor: "error.dark" },
          }}
        >
          <CallEndIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}
