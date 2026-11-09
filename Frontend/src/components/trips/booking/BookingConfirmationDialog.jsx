"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, DollarSign, FileText, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBookingConfirmationStore } from "@/store/useBookingConfirmationStore";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import { formatMoney } from "@/lib/money";

const CONFETTI_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#6366f1"];

// Pre-computed deterministic confetti particle positions for pure rendering
const STATIC_CONFETTI = Array.from({ length: 36 }).map((_, i) => {
  const angle = (i / 36) * 360 + ((i % 5) * 6 - 15);
  const distance = 80 + (i % 7) * 20;
  const radians = (angle * Math.PI) / 180;
  return {
    id: i,
    x: Math.cos(radians) * distance,
    y: Math.sin(radians) * distance,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 7 + (i % 4) * 2,
    rotate: (i * 37) % 360,
  };
});

/**
 * Celebratory Booking Confirmation Pop-Up (Batch 3 - CRM Feedback 1.2).
 * Displays celebratory confetti animation, trip summary, and a direct reminder
 * to invoice the client with a quick link to generate the invoice.
 */
export default function BookingConfirmationDialog() {
  const router = useRouter();
  const isOpen = useBookingConfirmationStore((s) => s.isOpen);
  const trip = useBookingConfirmationStore((s) => s.trip);
  const closeModal = useBookingConfirmationStore((s) => s.closeModal);
  const openInvoiceModal = useReceivablesStore((s) => s.openAddModal);

  const confetti = STATIC_CONFETTI;

  if (!trip) return null;

  const tripReference = trip?.reference ? `TJ-${trip.reference}` : "Trip Booked";
  const clientName =
    typeof trip?.client === "string"
      ? trip.client
      : [trip?.client?.firstName, trip?.client?.lastName].filter(Boolean).join(" ") ||
        trip?.client?.companyName ||
        "Client";

  const routeLabel =
    trip?.route ||
    (trip?.legs?.length > 0
      ? `${trip.legs[0]?.originAirport?.icao ?? "Origin"} → ${trip.legs[trip.legs.length - 1]?.destinationAirport?.icao ?? "Destination"}`
      : "Flight Route");

  const departureDate = trip?.departureDate || trip?.rawDepartureDate || "Scheduled Departure";
  const amount = trip?.financial?.total ?? trip?.totalPrice ?? trip?.basePrice;

  const handleGenerateInvoice = () => {
    closeModal();
    // Pre-populate invoice draft and navigate to receivables
    openInvoiceModal({
      tripId: trip.id,
      clientId: trip.clientId ?? trip.client?.id,
      amount: amount ? String(amount).replace(/[^0-9.]/g, "") : "",
    });
    router.push(`/dashboard/receivables?tripId=${trip.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-0 overflow-hidden relative border border-border/80 bg-white shadow-2xl">
        {/* Floating Confetti Particle Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <AnimatePresence>
            {isOpen &&
              confetti.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{
                    opacity: [1, 1, 0],
                    scale: [0, 1.2, 0.8],
                    x: particle.x,
                    y: particle.y,
                    rotate: particle.rotate + 180,
                  }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute rounded-sm"
                  style={{
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size * 1.6,
                  }}
                />
              ))}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-4 relative z-10 pt-2">
          {/* Animated Celebration Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="size-16 rounded-full bg-gradient-to-tr from-purple to-indigo-500 flex items-center justify-center shadow-lg shadow-purple/20 text-white"
          >
            <Sparkles className="size-8 animate-pulse" />
          </motion.div>

          <div className="flex flex-col gap-1">
            <DialogTitle className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
              Trip Booked Successfully!
            </DialogTitle>
            <p className="font-montserrat text-[13px] text-muted-foreground">
              {tripReference} is now booked and added to the flight log.
            </p>
          </div>

          {/* Trip Summary Card */}
          <div className="w-full bg-secondary/40 border border-border/60 rounded-xl p-4 flex flex-col gap-2 text-[13px] text-left">
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-semibold text-foreground">{clientName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Routing:</span>
              <span className="font-semibold text-foreground">{routeLabel}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Departure:</span>
              <span className="font-medium text-foreground">{departureDate}</span>
            </div>
            {amount && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Charter Total:</span>
                <span className="font-bold text-success font-mono">
                  {typeof amount === "number" ? formatMoney(amount) : amount}
                </span>
              </div>
            )}
          </div>

          {/* Prompt / Reminder Callout */}
          <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-left">
            <div className="size-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="size-3.5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-montserrat font-bold text-[13px] text-amber-900 dark:text-amber-300">
                Next Step: Invoice the Client
              </p>
              <p className="font-montserrat text-[12px] text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
                Remember to generate and issue the charter invoice to collect client payment and wire remittance.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="flex-1 h-10 text-[13px] font-medium"
            >
              Continue to Trip
            </Button>
            <Button
              type="button"
              onClick={handleGenerateInvoice}
              className="flex-1 h-10 text-[13px] font-semibold gap-1.5 shadow-button"
            >
              <DollarSign className="size-4" />
              Generate Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
