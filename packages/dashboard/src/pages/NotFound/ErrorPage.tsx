import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ErrorPage() {
  const { t } = useTranslation();
  const navigation = useNavigate();
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        px: 2,
        background:
          theme.palette.mode === "dark"
            ? "radial-gradient(1200px 600px at 10% -10%, rgba(56,189,248,0.06), transparent 45%), #020617"
            : "#F5F7FB",
      })}
    >
      <Container maxWidth="sm">
        <Paper
          sx={(theme) => ({
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${
              theme.palette.mode === "dark"
                ? "rgba(148,163,184,0.25)"
                : "rgba(148,163,184,0.2)"
            }`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 20px 60px rgba(15,23,42,0.9)"
                : "0 18px 40px rgba(15,23,42,0.06)",
          })}
        >
          <Stack spacing={2.5} textAlign="center">
            <Typography
              variant="overline"
              sx={{ letterSpacing: 2, color: "text.secondary" }}
            >
              {t("notFound.errorLabel")}
            </Typography>

            <Typography variant="h4" fontWeight={800}>
              {t("notFound.title")}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {t("notFound.description")}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {t("notFound.hint")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 1.5,
                mt: 1,
              }}
            >
              <Button
                variant="contained"
                size="medium"
                onClick={() => navigation("/")}
                sx={{ borderRadius: 999, px: 3 }}
              >
                {t("notFound.backToDashboard")}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
