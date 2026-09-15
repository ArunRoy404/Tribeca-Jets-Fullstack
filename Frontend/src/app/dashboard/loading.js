import FullPageLoader from "@/components/common/FullPageLoader";

/**
 * Route-level loading UI for the dashboard.
 *
 * Next renders this while a dashboard route's server component streams in, so
 * the branded splash now appears where there is genuinely something to wait
 * for — rather than on every navigation while a client guard checked a session.
 */
export default function DashboardLoading() {
  return <FullPageLoader label="Preparing your workspace…" />;
}
