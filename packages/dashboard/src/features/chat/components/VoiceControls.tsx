import { Box, IconButton, Stack, Typography, keyframes } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { useTranslation } from "react-i18next";
import type { VoiceStatus } from "../voice/realtimeEvents";

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.35); opacity: 0.4; }
  100% { transform: scale(1); opacity: 0.9; }
`;

const STATUS_COLOR: Record<VoiceStatus, string> = {
  idle: "text.disabled",
  connecting: "warning.main",
  listening: "success.main",
  thinking: "info.main",
  speaking: "primary.main",
  error: "error.main",
};

interface VoiceControlsProps {
  status: VoiceStatus;
  muted: boolean;
  error: string | null;
  onToggleMute: () => void;
  onEnd: () => void;
}

export default function VoiceControls({
  status,
  muted,
  error,
  onToggleMute,
  onEnd,
}: VoiceControlsProps) {
  const { t } = useTranslation();
  const animated = status === "listening" || status === "speaking";

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ px: 1.5, py: 1, mb: 1, borderRadius: 3, bgcolor: "action.hover" }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: STATUS_COLOR[status],
          flexShrink: 0,
          animation: animated ? `${pulse} 1.4s ease-in-out infinite` : "none",
        }}
      />
      <Typography
        variant="body2"
        sx={{ flex: 1, fontWeight: 500 }}
        color={status === "error" ? "error" : "text.primary"}
        role="status"
      >
        {status === "error" && error ? error : t(`chatPage.voice.status.${status}`)}
      </Typography>
      <IconButton
        size="small"
        onClick={onToggleMute}
        aria-label={t(muted ? "chatPage.voice.unmute" : "chatPage.voice.mute")}
        disabled={status === "connecting"}
      >
        {muted ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
      </IconButton>
      <IconButton
        size="small"
        color="error"
        onClick={onEnd}
        aria-label={t("chatPage.voice.end")}
      >
        <CallEndIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
