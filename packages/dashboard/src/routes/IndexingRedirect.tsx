import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "./routes";

/** The Embedding page now lives under Agent. Old links to /indexing keep working, query included. */
export default function IndexingRedirect() {
  const { search } = useLocation();

  return (
    <Navigate to={{ pathname: ROUTES.agentEmbedding, search }} replace />
  );
}
