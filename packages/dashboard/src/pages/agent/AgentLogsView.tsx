import { useState } from "react";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { useTranslation } from "react-i18next";
import type { GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AppDataGrid from "@/components/common/AppDataGrid";
import { useAgentLogsQuery, useAgentSummaryQuery } from "@/hooks/services";
import type { AgentLog } from "@/services/agentService";
import AgentLogDetailDrawer from "@/features/agent/components/AgentLogDetailDrawer";
import ExportCsvDialog from "@/features/agent/components/ExportCsvDialog";
import AgentStatusChip from "@/features/agent/components/AgentStatusChip";
import AgentSummaryCards from "@/features/agent/components/AgentSummaryCards";
import {
  endToEndLatency,
  formatDateTime,
  formatMs,
  formatTokens,
  formatUsd,
} from "@/features/agent/format";

const STATUS_FILTERS = ["", "success", "failed", "clarification", "pending"] as const;

export default function AgentLogsView() {
  const { t } = useTranslation();
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AgentLog | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const filter = { status: status || undefined, search: search || undefined };
  const { data, isFetching } = useAgentLogsQuery({
    page: paginationModel.page + 1,
    size: paginationModel.pageSize,
    ...filter,
  });
  const { data: summary } = useAgentSummaryQuery(filter);

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPaginationModel((model) => ({ ...model, page: 0 }));
  };

  const channelLabel = (log: AgentLog) =>
    t(`agent.channel.${log.source === "whatsapp" ? "whatsapp" : log.channel}`);

  const columns: GridColDef<AgentLog>[] = [
    {
      field: "createdAt",
      headerName: t("agent.columns.time"),
      width: 170,
      valueFormatter: (item) => formatDateTime(item.value),
    },
    {
      field: "command",
      headerName: t("agent.columns.command"),
      flex: 2,
      minWidth: 240,
    },
    {
      field: "channel",
      headerName: t("agent.columns.via"),
      width: 100,
      valueGetter: (params) => channelLabel(params.row),
    },
    {
      field: "model",
      headerName: t("agent.columns.model"),
      width: 150,
      valueFormatter: (item) => item.value ?? "—",
    },
    {
      field: "status",
      headerName: t("agent.columns.status"),
      width: 140,
      renderCell: (params) => <AgentStatusChip status={params.row.status} />,
    },
    {
      field: "latency",
      headerName: t("agent.columns.latency"),
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const { ms, measuredInBrowser } = endToEndLatency(params.row);
        return (
          <Tooltip
            title={
              measuredInBrowser
                ? t("agent.latencyBrowserHint")
                : t("agent.latencyServerHint")
            }
          >
            <Typography variant="body2" color={measuredInBrowser ? "text.primary" : "text.secondary"}>
              {formatMs(ms)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "inputTokens",
      headerName: t("agent.columns.inputTokens"),
      width: 100,
      valueFormatter: (item) => formatTokens(item.value),
    },
    {
      field: "outputTokens",
      headerName: t("agent.columns.outputTokens"),
      width: 100,
      valueFormatter: (item) => formatTokens(item.value),
    },
    {
      field: "totalTokens",
      headerName: t("agent.columns.totalTokens"),
      width: 100,
      valueFormatter: (item) => formatTokens(item.value),
    },
    {
      field: "estimatedCostUsd",
      headerName: t("agent.columns.cost"),
      width: 120,
      valueFormatter: (item) => formatUsd(item.value),
    },
  ];

  return (
    <>
      <AgentSummaryCards summary={summary} />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems={{ sm: "center" }}
      >
        <Select
          size="small"
          displayEmpty
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPaginationModel((model) => ({ ...model, page: 0 }));
          }}
          sx={{ minWidth: 190 }}
          inputProps={{ "aria-label": t("agent.filters.status") }}
        >
          {STATUS_FILTERS.map((value) => (
            <MenuItem key={value || "all"} value={value}>
              {value ? t(`agent.status.${value}`) : t("agent.filters.allStatuses")}
            </MenuItem>
          ))}
        </Select>
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
          sx={{ display: "flex", gap: 1, flex: 1 }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder={t("agent.filters.search")}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" variant="outlined">
            {t("agent.filters.searchButton")}
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={() => setExportOpen(true)}
        >
          {t("agent.export.button")}
        </Button>
      </Stack>

      <AppDataGrid
        rows={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.agentLogId}
        loading={isFetching}
        pageSizeOptions={[5, 10, 25]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={data?.totalItems ?? 0}
        paginationMode="server"
        onRowClick={(params) => setSelected(params.row as AgentLog)}
        sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
        localeText={{ noRowsLabel: t("agent.empty") }}
      />

      <AgentLogDetailDrawer log={selected} onClose={() => setSelected(null)} />
      <ExportCsvDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filter={filter}
      />
    </>
  );
}
