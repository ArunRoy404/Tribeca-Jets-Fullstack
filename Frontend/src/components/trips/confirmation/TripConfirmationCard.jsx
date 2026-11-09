"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import DetailCard from "@/components/trips/DetailCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { useUpdateTrip } from "@/hooks/trips";

/**
 * The confirmation checklist (Batch 3 - CRM Feedback 1.3 & 1.4).
 * Each tick is a real recorded event with a "Go" button navigating
 * directly to the relevant card or action.
 */
export default function TripConfirmationCard({ trip }) {
  const openBuildModal = useItinerariesStore((s) => s.openBuildModal);
  const { mutate: updateTrip, isPending: updating } = useUpdateTrip();

  const committed = ["BOOKED", "CONFIRMED", "IN_FLIGHT", "COMPLETED"].includes(trip?.rawStatus);
  const named = (trip?.passengers?.length ?? 0) > 0;
  const operatorPaymentSent =
    trip?.operatorPayment?.state === "PAID" ||
    Number(trip?.operatorPayment?.paid) > 0 ||
    trip?.operatorPayables?.some((p) => p.status === "PAID");

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const items = [
    {
      id: "client-committed",
      label: "Client committed",
      done: committed,
      onGo: () => scrollTo("trip-action-bar"),
    },
    {
      id: "aircraft-assigned",
      label: "Aircraft assigned",
      done: Boolean(trip?.aircraft && trip.aircraft !== "—"),
      onGo: () => scrollTo("flight-info-card"),
    },
    {
      id: "operator-confirmed",
      label: "Operator confirmed",
      done: Boolean(trip?.operatorConfirmed),
      onGo: () => scrollTo("operator-card"),
    },
    {
      id: "passengers-named",
      label: "Passengers named",
      done: named,
      onGo: () => scrollTo("passengers-card"),
    },
    {
      id: "price-set",
      label: "Price set",
      done: Boolean(trip?.financial?.total && trip.financial.total !== "—"),
      onGo: () => scrollTo("financial-card"),
    },
    {
      id: "contract-sent",
      label: "Contract sent",
      done: Boolean(trip?.contractSent),
      onGo: () => scrollTo("contract-card"),
    },
    {
      id: "contract-received",
      label: "Contract received",
      done: Boolean(trip?.contractReceived),
      onGo: () => scrollTo("contract-card"),
    },
    {
      id: "itinerary-sent",
      label: "Itinerary sent",
      done: Boolean(trip?.itinerary?.sentAt),
      onGo: () => {
        if (trip?.raw) openBuildModal(trip.raw);
        else scrollTo("trip-action-bar");
      },
    },
    {
      id: "client-payment-received",
      label: "Client payment received",
      done: trip?.clientBilling?.rawState === "PAID",
      href: `/dashboard/receivables?tripId=${trip?.id}`,
    },
    {
      id: "operator-payment-sent",
      label: "Operator payment sent",
      done: Boolean(operatorPaymentSent),
      href: `/dashboard/operator-payments?tripId=${trip?.id}`,
    },
    {
      id: "operator-payment-received",
      label: "Operator payment received",
      done: Boolean(trip?.operatorPaymentReceived),
      onToggle: () =>
        updateTrip({
          id: trip?.id,
          operatorPaymentReceived: !trip?.operatorPaymentReceived,
        }),
    },
  ];

  return (
    <div id="confirmation-card">
      <DetailCard title="Confirmation Checklist">
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-b-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full size-4 shrink-0 transition-colors",
                    item.done ? "bg-success text-white" : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Check className="size-2.5" />
                </div>
                <p
                  className={cn(
                    "font-montserrat text-[13px] truncate",
                    item.done ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.onToggle ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updating}
                    onClick={item.onToggle}
                    className="h-6 px-2 text-[11px] font-semibold hover:bg-secondary/80"
                  >
                    {item.done ? "Mark Unreceived" : "Confirm Receipt"}
                  </Button>
                ) : item.href ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-bold text-purple hover:text-purple hover:bg-purple/10"
                  >
                    <Link href={item.href}>Go</Link>
                  </Button>
                ) : item.onGo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={item.onGo}
                    className="h-6 px-2 text-[11px] font-bold text-purple hover:text-purple hover:bg-purple/10"
                  >
                    Go
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </DetailCard>
    </div>
  );
}
