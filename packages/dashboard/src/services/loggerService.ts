import { apiClient } from "./api";
import type { PaginatedResponse } from "./types";

export const LOGGER_API = {
  list: "/logs",
} as const;

export type AppLogLevel = "error" | "warn" | "info";

/** One system log entry, as the Logger page lists it. */
export interface AppLog {
  appLogId: number;
  appLogLevel: AppLogLevel;
  appLogMessage: string;
  appLogSource: string | null;
  createdAt: string;
}

export interface LoggerListParams {
  page: number;
  size: number;
  search?: string;
}

export const loggerService = {
  getList: (params: LoggerListParams): Promise<PaginatedResponse<unknown>> =>
    apiClient.getTableData({
      path: LOGGER_API.list,
      page: params.page,
      size: params.size,
      filter: { search: params.search },
    }),
};
