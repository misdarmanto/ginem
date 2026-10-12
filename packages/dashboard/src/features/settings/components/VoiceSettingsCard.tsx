import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Radio,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {
  useSelectVoiceMutation,
  useVoicePreferenceQuery,
} from "@/hooks/services";
import { useVoicePreview } from "../useVoicePreview";

export default function VoiceSettingsCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useVoicePreferenceQuery();
  const selectVoice = useSelectVoiceMutation(t("settings.voice.changedSuccess"));
  const preview = useVoicePreview();

  const handleSelect = (voice: string) => {
    if (voice !== data?.voice && !selectVoice.isPending) selectVoice.mutate(voice);
  };

  const handlePreview = (voice: string) => {
    if (preview.playingVoice === voice) preview.stop();
    else void preview.play(voice);
  };

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600} mb={1}>
          {t("settings.voice.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {t("settings.voice.subtitle")}
        </Typography>

        {isLoading ? (
          <CircularProgress size={20} />
        ) : (
          <Grid container spacing={1.5}>
            {data?.options.map((option) => {
              const selected = option.id === data.voice;
              const loading = preview.loadingVoice === option.id;
              const playing = preview.playingVoice === option.id;

              return (
                <Grid item xs={12} sm={6} key={option.id}>
                  <Box
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.label}
                    tabIndex={0}
                    onClick={() => handleSelect(option.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(option.id);
                      }
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: selected ? "primary.main" : "divider",
                      bgcolor: selected ? "action.selected" : "transparent",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Radio checked={selected} tabIndex={-1} sx={{ p: 0.5 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{option.label}</Typography>
                        {option.recommended && (
                          <Chip
                            size="small"
                            color="primary"
                            label={t("settings.voice.recommended")}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      disabled={loading}
                      aria-label={t(
                        playing
                          ? "settings.voice.stopPreview"
                          : "settings.voice.playPreview",
                        { voice: option.label },
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePreview(option.id);
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={18} />
                      ) : playing ? (
                        <StopIcon fontSize="small" />
                      ) : (
                        <PlayArrowIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}

        {preview.failed && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t("settings.voice.previewFailed")}
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          {t("settings.voice.note")}
        </Typography>
      </CardContent>
    </Card>
  );
}
