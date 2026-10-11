import TableStatus from "@/components/table/common/TableStatus";

/**
 * What a Settings screen shows before its values arrive, or when they could
 * not be loaded — never a form pre-filled with values the server did not send.
 */
export default function SettingsSectionStatus({ isPending, error, onRetry }) {
  return <TableStatus isLoading={isPending} error={error} onRetry={onRetry} />;
}
