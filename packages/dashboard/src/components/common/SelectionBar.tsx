import { Button, Stack, Typography } from "@mui/material";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";

export type SelectionBarProps = {
  count: number;
  onClear: () => void;
  onDelete: () => void;
};

export default function SelectionBar({
  count,
  onClear,
  onDelete,
}: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{
        mt: 2,
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        bgcolor: "action.selected",
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        {count} selected
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button size="small" color="inherit" onClick={onClear}>
          Clear
        </Button>
        <Button
          size="small"
          color="error"
          variant="contained"
          startIcon={<DeleteOutlinedIcon fontSize="small" />}
          onClick={onDelete}
        >
          Delete selected
        </Button>
      </Stack>
    </Stack>
  );
}
