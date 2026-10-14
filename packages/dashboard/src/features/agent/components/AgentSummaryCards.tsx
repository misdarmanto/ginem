import { Card, CardContent, Grid, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AgentLogSummary } from "@/services/agentService";
import { formatMs, formatTokens, formatUsd } from "../format";

function Metric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card sx={{ borderRadius: 2, height: "100%" }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentSummaryCards({
  summary,
}: {
  summary: AgentLogSummary | undefined;
}) {
  const { t } = useTranslation();
  const latency = summary?.avgClientLatencyMs ?? summary?.avgServerLatencyMs;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} md={3}>
        <Metric
          label={t("agent.summary.commands")}
          value={formatTokens(summary?.total ?? 0)}
          caption={t("agent.summary.outcomes", {
            success: summary?.success ?? 0,
            failed: summary?.failed ?? 0,
            clarification: summary?.clarification ?? 0,
          })}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <Metric
          label={t("agent.summary.avgLatency")}
          value={formatMs(latency)}
          caption={
            summary?.avgClientLatencyMs == null
              ? t("agent.summary.latencyServer")
              : t("agent.summary.latencyBrowser")
          }
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <Metric
          label={t("agent.summary.tokens")}
          value={formatTokens(summary?.totalTokens ?? 0)}
          caption={t("agent.summary.tokenSplit", {
            input: formatTokens(summary?.inputTokens ?? 0),
            output: formatTokens(summary?.outputTokens ?? 0),
          })}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <Metric
          label={t("agent.summary.cost")}
          value={formatUsd(summary?.estimatedCostUsd ?? 0)}
          caption={t("agent.summary.costNote")}
        />
      </Grid>
    </Grid>
  );
}

