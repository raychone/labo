import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

export function BillingArchiveRedirect(): ReactNode {
  const location = useLocation();
  const next = new URLSearchParams(location.search);
  next.set("tab", "archive");

  return <Navigate replace to={`/billing?${next.toString()}`} />;
}
