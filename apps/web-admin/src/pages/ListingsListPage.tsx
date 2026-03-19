import { Navigate, useLocation } from "react-router-dom";

export default function ListingsListPage() {
  const location = useLocation();
  return <Navigate to={`/enterprise-properties${location.search}`} replace />;
}
