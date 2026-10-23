import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { agentService, type AgentLogFilter } from "@/services/agentService";
import {
  exportFileName,
  rangeForPreset,
  rangeProblem,
  type DateRange,
  type RangePreset,
} from "../dateRange";
import { saveBlob } from "../downloadFile";

const PRESETS: readonly RangePreset[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "all",
  "custom",
];

interface ExportCsvDialogProps {
  open: boolean;
  onClose: () => void;
  /** Status and search currently applied to the table; the export follows them. */
  filter: AgentLogFilter;
}

export default function ExportCsvDialog({
  open,
  onClose,
  filter,
}: ExportCsvDialogProps) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<RangePreset>("today");
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("today"));
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  const problem = preset === "custom" ? rangeProblem(range) : null;
  const filterActive = Boolean(filter.status || filter.search);

  const choosePreset = (next: RangePreset | null) => {
    if (!next) return;
    setPreset(next);
    if (next !== "custom") setRange(rangeForPreset(next));
  };

  const changeDate = (side: keyof DateRange, value: string) => {
    setPreset("custom");
    setRange((current) => ({ ...current, [side]: value }));
  };

  const download = async () => {
    setFailed(false);
    setDownloading(true);
    try {
      const blob = await agentService.exportCsv({ ...filter, ...range });
      saveBlob(blob, exportFileName(range));
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  const summary =
    !range.from && !range.to
      ? t("agent.export.summaryAll")
      : t("agent.export.summaryRange", {
          from: range.from || "…",
          to: range.to || "…",
        });

  return (
    <Dialog
      open={open}
      onClose={downloading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{t("agent.export.title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={preset}
            onChange={(_, next: RangePreset | null) => choosePreset(next)}
            aria-label={t("agent.export.presets")}
            sx={{ flexWrap: "wrap", gap: 0.5 }}
          >
            {PRESETS.map((value) => (
              <ToggleButton key={value} value={value} sx={{ px: 1.5 }}>
                {t(`agent.export.preset.${value}`)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="date"
              size="small"
              fullWidth
              label={t("agent.export.from")}
              value={range.from}
              onChange={(event) => changeDate("from", event.target.value)}
              InputLabelProps={{ shrink: true }}
              error={problem === "order"}
            />
            <TextField
              type="date"
              size="small"
              fullWidth
              label={t("agent.export.to")}
              value={range.to}
              onChange={(event) => changeDate("to", event.target.value)}
              InputLabelProps={{ shrink: true }}
              error={problem === "order"}
            />
          </Stack>

          <Box>
            <Typography variant="body2" fontWeight={600}>
              {summary}
            </Typography>
            {filterActive && (
              <Typography variant="caption" color="text.secondary">
                {t("agent.export.filterNote")}
              </Typography>
            )}
          </Box>

          {problem && (
            <Alert severity="warning">
              {t(
                problem === "order"
                  ? "agent.export.errorOrder"
                  : "agent.export.errorIncomplete",
              )}
            </Alert>
          )}
          {failed && <Alert severity="error">{t("agent.export.failed")}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={downloading}>
          {t("agent.export.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={download}
          disabled={downloading || problem !== null}
          startIcon={downloading ? <CircularProgress size={16} /> : undefined}
        >
          {t("agent.export.download")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
