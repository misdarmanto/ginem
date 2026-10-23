import { Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AgentStatus } from "@/services/agentService";
import { STATUS_COLOR } from "../format";

export default function AgentStatusChip({ status }: { status: AgentStatus }) {
  const { t } = useTranslation();

  return (
    <Chip
      size="small"
      variant="outlined"
      color={STATUS_COLOR[status]}
      label={t(`agent.status.${status}`)}
    />
  );
}
