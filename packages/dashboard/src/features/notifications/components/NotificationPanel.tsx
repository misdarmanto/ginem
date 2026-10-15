import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import moment from "moment";
import "moment/locale/id";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes/routes";
import type { AppLog, AppLogLevel } from "@/services/loggerService";

const drawerWidth = { xs: "100%", sm: 420, md: 440 };

const LEVEL_ICON: Record<AppLogLevel, typeof InfoOutlinedIcon> = {
  error: ErrorOutlineIcon,
  warn: WarningAmberIcon,
  info: InfoOutlinedIcon,
};

const LEVEL_COLOR: Record<AppLogLevel, "error.main" | "warning.main" | "info.main"> = {
  error: "error.main",
  warn: "warning.main",
  info: "info.main",
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  items: AppLog[];
  isLoading: boolean;
  isError: boolean;
  /** Id of the newest entry the user had already seen when the panel was last closed. */
  lastSeenId: number | null;
  onSeen: () => void;
}

function NotificationItem({ item, unread }: { item: AppLog; unread: boolean }) {
  const { t, i18n } = useTranslation();
  const Icon = LEVEL_ICON[item.appLogLevel] ?? InfoOutlinedIcon;
  const color = LEVEL_COLOR[item.appLogLevel] ?? "info.main";
  const when = moment(item.createdAt).locale(i18n.language);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      component="li"
      sx={{
        listStyle: "none",
        p: 1.5,
        borderRadius: 2,
        bgcolor: unread ? "action.hover" : "transparent",
      }}
    >
      <Icon sx={{ color, mt: 0.25 }} fontSize="small" aria-label={item.appLogLevel} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.appLogMessage.trim()}
        </Typography>
        <Typography variant="caption" color="text.secondary" title={item.createdAt}>
          {item.appLogSource ? `${item.appLogSource} · ` : ""}
          {when.isValid() ? when.fromNow() : item.createdAt}
        </Typography>
      </Box>
      {unread && (
        <Box
          role="img"
          aria-label={t("notificationsPanel.unread")}
          sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", mt: 1 }}
        />
      )}
    </Stack>
  );
}

export function NotificationPanel({
  open,
  onClose,
  items,
  isLoading,
  isError,
  lastSeenId,
  onSeen,
}: NotificationPanelProps) {
  const { t } = useTranslation();
  // What counted as new when the panel opened; reading it must not clear the dots at once.
  const [unreadAfter, setUnreadAfter] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setUnreadAfter(lastSeenId);
      onSeen();
    }
    // only when the panel is opened: onSeen advances lastSeenId, which must not re-trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: false,
      }}
      PaperProps={{
        sx: {
          width: drawerWidth,
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid",
          borderColor: "divider",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(15,23,42,0.98)"
              : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        },
      }}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 2,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {t("notificationsPanel.title")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("notificationsPanel.subtitle")}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={t("notificationsPanel.close")}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          py: 1.5,
          backgroundColor: "background.default",
          minHeight: 0,
        }}
      >
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : isError && items.length === 0 ? (
          <Typography variant="body2" color="error" sx={{ textAlign: "center", py: 6 }}>
            {t("notificationsPanel.error")}
          </Typography>
        ) : items.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6 }} spacing={2}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NotificationsNoneOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              {t("notificationsPanel.empty")}
            </Typography>
          </Stack>
        ) : (
          <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0 }}>
            {items.map((item) => (
              <NotificationItem
                key={item.appLogId}
                item={item}
                unread={unreadAfter != null && item.appLogId > unreadAfter}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 1.5, flexShrink: 0 }}>
        <Button component={Link} to={ROUTES.logger} onClick={onClose} fullWidth>
          {t("notificationsPanel.viewAll")}
        </Button>
      </Box>
    </Drawer>
  );
}
