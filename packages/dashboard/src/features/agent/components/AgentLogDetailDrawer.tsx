import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import type { AgentLog } from "@/services/agentService";
import {
  endToEndLatency,
  formatDateTime,
  formatMs,
  formatTokens,
  formatUsd,
} from "../format";
import AgentStatusChip from "./AgentStatusChip";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 0.8 }}
      >
        {title}
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 0.5 }}>
        {children}
      </Stack>
    </Box>
  );
}

interface AgentLogDetailDrawerProps {
  log: AgentLog | null;
  onClose: () => void;
}

export default function AgentLogDetailDrawer({
  log,
  onClose,
}: AgentLogDetailDrawerProps) {
  const { t } = useTranslation();
  const latency = log ? endToEndLatency(log) : null;

  return (
    <Drawer
      anchor="right"
      open={log != null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 440 } } }}
    >
      {log && (
        <Stack spacing={2.5} sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              {t("agent.detail.title")}
            </Typography>
            <IconButton onClick={onClose} aria-label={t("agent.detail.close")}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Section title={t("agent.detail.command")}>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>{log.command}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(log.createdAt)} · {t(`agent.channel.${log.source === "whatsapp" ? "whatsapp" : log.channel}`)}
            </Typography>
          </Section>

          <Section title={t("agent.detail.status")}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AgentStatusChip status={log.status} />
            </Stack>
            {log.statusReason && (
              <Typography variant="body2" color="text.secondary">
                {log.statusReason}
              </Typography>
            )}
          </Section>

          <Section title={t("agent.detail.reply")}>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>{log.reply ?? "—"}</Typography>
          </Section>

          <Divider />

          <Section title={t("agent.detail.timing")}>
            <Row
              label={
                latency?.measuredInBrowser
                  ? t("agent.detail.e2eBrowser")
                  : t("agent.detail.e2eServer")
              }
              value={formatMs(latency?.ms)}
            />
            <Row label={t("agent.detail.server")} value={formatMs(log.serverLatencyMs)} />
            <Row label={t("agent.detail.queue")} value={formatMs(log.queueWaitMs)} />
            <Row label={t("agent.detail.context")} value={formatMs(log.contextLatencyMs)} />
            <Row label={t("agent.detail.llm")} value={formatMs(log.agentLatencyMs)} />
          </Section>

          <Section title={t("agent.detail.usage")}>
            <Row label={t("agent.detail.model")} value={log.model ?? "—"} />
            <Row label={t("agent.detail.inputTokens")} value={formatTokens(log.inputTokens)} />
            <Row label={t("agent.detail.cachedTokens")} value={formatTokens(log.cachedInputTokens)} />
            <Row label={t("agent.detail.outputTokens")} value={formatTokens(log.outputTokens)} />
            <Row label={t("agent.detail.totalTokens")} value={formatTokens(log.totalTokens)} />
            <Row label={t("agent.detail.cost")} value={formatUsd(log.estimatedCostUsd)} />
          </Section>

          <Section title={t("agent.detail.tools")}>
            {log.toolCalls?.length ? (
              log.toolCalls.map((call, index) => (
                <Box key={`${call.name}-${index}`}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {call.name}
                    </Typography>
                    {call.ok != null && (
                      <Chip
                        size="small"
                        variant="outlined"
                        color={call.ok ? "success" : "error"}
                        label={call.ok ? t("agent.detail.toolOk") : t("agent.detail.toolFailed")}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ wordBreak: "break-word" }}
                  >
                    {JSON.stringify(call.args)}
                    {call.error ? ` — ${call.error}` : ""}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t("agent.detail.noTools")}
              </Typography>
            )}
          </Section>
        </Stack>
      )}
    </Drawer>
  );
}
