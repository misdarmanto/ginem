import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Tab, Tabs } from "@mui/material";
import BreadCrumberStyle from "@/components/common/Breadcrumb";
import PageHeader from "@/components/common/PageHeader";
import { IconMenus } from "@/assets/icons";
import { ROUTES } from "@/routes/routes";

type AgentTab = "log" | "embedding";

function activeTab(pathname: string): AgentTab {
  return pathname === ROUTES.agentEmbedding ||
    pathname.startsWith(`${ROUTES.agentEmbedding}/`)
    ? "embedding"
    : "log";
}

/** Shared frame of the Agent menu: title and tabs, with the open tab's page below. */
export default function AgentLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const tab = activeTab(pathname);

  return (
    <>
      <BreadCrumberStyle
        navigation={[
          {
            label: t("nav.agent"),
            link: ROUTES.agent,
            icon: <IconMenus.agent fontSize="small" />,
          },
          ...(tab === "embedding"
            ? [
                {
                  label: t("agent.tabs.embedding"),
                  link: ROUTES.agentEmbedding,
                  icon: <IconMenus.vectorIndexes fontSize="small" />,
                },
              ]
            : []),
        ]}
      />
      <PageHeader title={t("agent.title")} subtitle={t("agent.subtitle")} />

      <Tabs
        value={tab}
        aria-label={t("agent.tabs.label")}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          component={Link}
          to={ROUTES.agent}
          value="log"
          label={t("agent.tabs.log")}
        />
        <Tab
          component={Link}
          to={ROUTES.agentEmbedding}
          value="embedding"
          label={t("agent.tabs.embedding")}
        />
      </Tabs>

      <Box>
        <Outlet />
      </Box>
    </>
  );
}
