import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { cn } from "@/lib/utils";

function Field({ label, value, valueClassName }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className={cn("font-montserrat font-medium text-[12px] text-foreground truncate", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

export default function TripCard({
  id,
  trip,
  date,
  client,
  broker,
  route,
  departure,
  returnDate,
  aircraft,
  operator,
  status,
  clientPmt,
  opPmt,
  fet,
  profit,
  nextAction,
  actions,
  onClick,
}) {
  const displayId = id || trip?.trip;
  const displayDate = date || trip?.date;
  const displayClient = client || trip?.client;
  const displayBroker = broker || trip?.broker;
  const displayRoute = route || trip?.route;
  const displayAircraft = aircraft || trip?.aircraft;
  const displayOperator = operator || trip?.operator;
  const displayStatus = status || trip?.status;
  const displayClientPmt = clientPmt || trip?.clientPmt;
  const displayOpPmt = opPmt || trip?.opPmt;
  const displayProfit = profit || trip?.profit;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white",
        onClick && "cursor-pointer hover:bg-secondary/40"
      )}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <p className="font-montserrat font-semibold text-[13px] text-purple truncate">{displayId}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {displayStatus && <StatusBadge status={displayStatus} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Client" value={displayClient} />
        {displayBroker && <Field label="Broker" value={displayBroker} />}
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Route" value={displayRoute} />
        {displayDate && <Field label="Date" value={displayDate} />}
        {departure && <Field label="Departure" value={departure} />}
      </div>

      {returnDate && (
        <div className="flex items-start justify-between gap-3 w-full">
          <Field label="Return" value={returnDate} />
        </div>
      )}

      {(displayAircraft || displayOperator) && (
        <Field
          label="Aircraft · Operator"
          value={[displayAircraft, displayOperator].filter(Boolean).join(" · ")}
          valueClassName="text-purple"
        />
      )}

      {(displayClientPmt || displayOpPmt) && (
        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap w-full pt-2 border-t border-border">
          {displayClientPmt && (
            <div className="flex items-center gap-1.5">
              <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">Client Pmt</p>
              <StatusBadge status={displayClientPmt} bordered />
            </div>
          )}
          {displayOpPmt && (
            <div className="flex items-center gap-1.5">
              <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">Op Pmt</p>
              <StatusBadge status={displayOpPmt} bordered />
            </div>
          )}
        </div>
      )}

      <div className="flex items-end justify-between gap-3 w-full">
        {fet && <Field label="FET (7.5%)" value={fet} />}
        <Field label="Profit" value={displayProfit} valueClassName="text-success font-bold" />
      </div>

      {nextAction && (
        <p className="font-montserrat font-medium text-[12px] text-purple w-full truncate">Next: {nextAction}</p>
      )}
    </div>
  );
}
