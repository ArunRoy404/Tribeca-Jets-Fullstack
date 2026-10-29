"use client";

import { useState } from "react";
import { Check, Download, FileText, Mail, Phone, X } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useBranding } from "@/hooks/settings";
import {
  useClientPortalOverview,
  useRespondClientPortalQuote,
} from "@/hooks/client-portal";
import {
  clientPortalDocumentUrl,
  clientPortalInvoicePdfUrl,
  clientPortalItineraryPdfUrl,
  clientPortalQuotePdfUrl,
} from "@/services/clientPortal.service";
import { formatCalendarDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";

const DASH = "—";

const TABS = [
  { id: "quotes", label: "Charter Proposals" },
  { id: "trips", label: "Trips & Itineraries" },
  { id: "invoices", label: "Statements & Invoices" },
  { id: "documents", label: "Documents" },
];

function airportCode(airport) {
  if (!airport) return DASH;
  return airport.icao || airport.iata || airport.city || DASH;
}

function formatBytes(size) {
  if (typeof size !== "number" || !Number.isFinite(size)) return DASH;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusPill({ value }) {
  const clean = String(value ?? DASH).replace(/_/g, " ");
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 border border-zinc-300 bg-zinc-50 text-[10px] font-montserrat font-semibold uppercase tracking-[0.12em] text-zinc-800">
      {clean}
    </span>
  );
}

export default function ClientPortalView({ token }) {
  const { data: branding } = useBranding();
  const { data, isPending, error, refetch } = useClientPortalOverview(token);
  const { mutate: respondToQuote, isPending: responding } = useRespondClientPortalQuote(token);

  const [activeTab, setActiveTab] = useState("quotes");
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-5 w-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="font-montserrat text-[12px] uppercase tracking-[0.18em] text-zinc-500">
            Loading Client Dossier
          </p>
        </div>
      </div>
    );
  }

  if (error || !data?.client) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 p-8 flex flex-col items-center text-center gap-4">
          <BrandLogo tone="dark" width={120} height={44} className="h-11 w-auto" />
          <div className="w-full border-t border-zinc-200 pt-4 flex flex-col gap-2">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Client Portal Access
            </p>
            <h1 className="font-montserrat font-bold text-[18px] text-zinc-900">
              {error?.message || "This portal link is invalid or has expired"}
            </h1>
            <p className="font-montserrat text-[13px] text-zinc-600 leading-relaxed">
              Please contact your Tribeca Jets charter advisor for an updated private portal link.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="mt-2 rounded-none border-zinc-300 text-[12px]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { client, credit, quotes = [], trips = [], invoices = [], documents = [] } = data;
  const clientDisplayName =
    [client.firstName, client.lastName].filter(Boolean).join(" ") || client.companyName || "Valued Client";
  const advisor = client.assignedBroker;
  const advisorName = advisor ? [advisor.firstName, advisor.lastName].filter(Boolean).join(" ") : null;

  const openQuotesCount = quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED").length;
  const activeTripsCount = trips.filter((t) => t.status !== "COMPLETED").length;
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  const creditBalance = Number(credit?.balance ?? 0);

  const contact = branding?.contact;
  const contactLines = contact
    ? [branding?.companyName, contact.website, contact.email, contact.phone, contact.address].filter(Boolean)
    : [];

  const handleConfirmDecision = () => {
    if (!decisionTarget) return;
    respondToQuote(
      {
        quoteId: decisionTarget.quote.id,
        decision: decisionTarget.decision,
        notes: decisionNotes,
      },
      {
        onSuccess: () => {
          setDecisionTarget(null);
          setDecisionNotes("");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-montserrat">
      {/* Top Editorial Letterhead Bar */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo tone="dark" width={130} height={46} className="h-11 w-auto" />
            <div className="hidden sm:block h-7 w-px bg-zinc-200" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold">
                Private Client Dossier
              </p>
              <p className="text-[15px] font-bold text-zinc-900">{clientDisplayName}</p>
            </div>
          </div>

          {contactLines.length > 0 && (
            <div className="text-left sm:text-right text-[11px] text-zinc-500 leading-relaxed">
              {contactLines.map((line, i) => (
                <p key={line} className={i === 0 ? "font-semibold text-zinc-900" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Client Identity & Dedicated Charter Advisor Strip */}
        <section className="bg-white border border-zinc-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              Account Overview
            </p>
            <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">
              {clientDisplayName}
            </h1>
            <p className="text-[12px] text-zinc-600">
              {[
                client.companyName && client.companyName !== clientDisplayName ? client.companyName : null,
                client.email,
                client.phone,
                client.homeAirport ? `Home Base: ${airportCode(client.homeAirport)}` : null,
              ]
                .filter(Boolean)
                .join("  ·  ") || DASH}
            </p>
          </div>

          {advisor && (
            <div className="border-t md:border-t-0 md:border-l border-zinc-200 pt-4 md:pt-0 md:pl-6 flex flex-col gap-1 min-w-[240px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">
                Dedicated Charter Advisor
              </p>
              <p className="text-[14px] font-bold text-zinc-900">{advisorName || DASH}</p>
              <div className="flex flex-col gap-0.5 text-[12px] text-zinc-600 mt-0.5">
                {advisor.email && (
                  <a href={`mailto:${advisor.email}`} className="inline-flex items-center gap-1.5 hover:text-zinc-900">
                    <Mail className="size-3.5 text-zinc-400" />
                    <span>{advisor.email}</span>
                  </a>
                )}
                {advisor.phone && (
                  <a href={`tel:${advisor.phone}`} className="inline-flex items-center gap-1.5 hover:text-zinc-900">
                    <Phone className="size-3.5 text-zinc-400" />
                    <span>{advisor.phone}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Executive Summary Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 border border-zinc-200 bg-white divide-y lg:divide-y-0 divide-x divide-zinc-200">
          <div className="p-5 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
              Open Proposals
            </span>
            <span className="text-[22px] font-bold text-zinc-900">{openQuotesCount}</span>
            <span className="text-[11px] text-zinc-500">{quotes.length} total on file</span>
          </div>
          <div className="p-5 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
              Active & Upcoming Trips
            </span>
            <span className="text-[22px] font-bold text-zinc-900">{activeTripsCount}</span>
            <span className="text-[11px] text-zinc-500">{trips.length} total flights</span>
          </div>
          <div className="p-5 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
              Open Statement Balance
            </span>
            <span className="text-[22px] font-bold text-zinc-900">{formatMoney(totalOutstanding)}</span>
            <span className="text-[11px] text-zinc-500">{invoices.length} issued invoices</span>
          </div>
          <div className="p-5 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
              Credit on Account
            </span>
            <span className="text-[22px] font-bold text-zinc-900">{formatMoney(creditBalance)}</span>
            <span className="text-[11px] text-zinc-500">Available towards charter</span>
          </div>
        </section>

        {/* Minimalist Editorial Tab Bar */}
        <div className="border-b border-zinc-200 flex items-center gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const count =
              tab.id === "quotes"
                ? quotes.length
                : tab.id === "trips"
                  ? trips.length
                  : tab.id === "invoices"
                    ? invoices.length
                    : documents.length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 text-[12px] uppercase tracking-[0.14em] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {tab.label} <span className="text-zinc-400 ml-1">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 1. QUOTES TAB */}
        {activeTab === "quotes" && (
          <div className="flex flex-col gap-4">
            {quotes.length === 0 ? (
              <div className="bg-white border border-zinc-200 p-10 text-center text-[13px] text-zinc-500">
                No charter proposals have been issued yet.
              </div>
            ) : (
              quotes.map((quote) => {
                const canRespond = quote.status === "SENT" || quote.status === "VIEWED";
                const aircraftLabel =
                  quote.aircraft
                    ? [quote.aircraft.model, quote.aircraft.tailNumber].filter(Boolean).join(" · ")
                    : quote.quotedAircraft || DASH;
                return (
                  <div
                    key={quote.id}
                    className="bg-white border border-zinc-200 p-6 flex flex-col gap-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-500">
                            Proposal Q-{quote.reference} · V{quote.version}
                          </span>
                          <StatusPill value={quote.status} />
                        </div>
                        <h3 className="text-[18px] font-bold text-zinc-900">
                          {airportCode(quote.originAirport)} → {airportCode(quote.destinationAirport)}
                          {quote.returnDate ? ` → ${airportCode(quote.originAirport)}` : ""}
                        </h3>
                      </div>

                      <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                          Total Charter Investment
                        </span>
                        <span className="text-[20px] font-bold text-zinc-900">
                          {formatMoney(quote.totalPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Departure Date</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">
                          {quote.departureDate ? formatCalendarDate(quote.departureDate) : DASH}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Aircraft</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">{aircraftLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Passengers</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">{quote.passengers ?? DASH}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Valid Until</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">
                          {quote.validUntil ? formatCalendarDate(quote.validUntil) : DASH}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-none border-zinc-300 h-9 px-4 text-[12px] font-medium gap-1.5"
                      >
                        <a href={clientPortalQuotePdfUrl(token, quote.id)} target="_blank" rel="noreferrer">
                          <Download className="size-3.5" />
                          Download PDF Proposal
                        </a>
                      </Button>

                      {canRespond && (
                        <div className="flex items-center gap-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setDecisionNotes("");
                              setDecisionTarget({ quote, decision: "REJECT" });
                            }}
                            className="rounded-none border-zinc-300 h-9 px-4 text-[12px] font-medium gap-1.5"
                          >
                            <X className="size-3.5" />
                            Decline
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setDecisionNotes("");
                              setDecisionTarget({ quote, decision: "APPROVE" });
                            }}
                            className="rounded-none bg-zinc-900 hover:bg-zinc-800 text-white h-9 px-5 text-[12px] font-medium gap-1.5"
                          >
                            <Check className="size-3.5" />
                            Approve Proposal
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. TRIPS & ITINERARIES TAB */}
        {activeTab === "trips" && (
          <div className="flex flex-col gap-4">
            {trips.length === 0 ? (
              <div className="bg-white border border-zinc-200 p-10 text-center text-[13px] text-zinc-500">
                No flights on file yet.
              </div>
            ) : (
              trips.map((trip) => {
                const firstLeg = trip.legs?.[0];
                const lastLeg = trip.legs?.[trip.legs.length - 1];
                const routeLabel =
                  firstLeg && lastLeg
                    ? `${airportCode(firstLeg.originAirport)} → ${airportCode(lastLeg.destinationAirport)}`
                    : DASH;
                const aircraftLabel =
                  trip.aircraft
                    ? [trip.aircraft.model, trip.aircraft.tailNumber].filter(Boolean).join(" · ")
                    : trip.aircraftDescription || DASH;

                return (
                  <div key={trip.id} className="bg-white border border-zinc-200 p-6 flex flex-col gap-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-500">
                            Trip TJ-{trip.reference}
                          </span>
                          <StatusPill value={trip.status} />
                        </div>
                        <h3 className="text-[18px] font-bold text-zinc-900">{routeLabel}</h3>
                      </div>

                      {trip.itinerary && (
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-none border-zinc-300 h-9 px-4 text-[12px] font-medium gap-1.5 w-fit"
                        >
                          <a
                            href={clientPortalItineraryPdfUrl(token, trip.itinerary.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="size-3.5" />
                            Download Itinerary PDF
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Departure Date</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">
                          {trip.departureDate ? formatCalendarDate(trip.departureDate) : DASH}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Aircraft</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">{aircraftLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Passengers</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">{trip.passengerCount ?? DASH}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">FBO Handling</p>
                        <p className="font-semibold text-zinc-900 mt-0.5">
                          {trip.itinerary?.departureFbo || firstLeg?.originAirport?.assignedFbo || DASH}
                        </p>
                      </div>
                    </div>

                    {trip.legs?.length > 0 && (
                      <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                          Flight Schedule
                        </p>
                        <div className="divide-y divide-zinc-100">
                          {trip.legs.map((leg) => (
                            <div
                              key={leg.id}
                              className="py-2 flex flex-wrap items-center justify-between gap-2 text-[12px]"
                            >
                              <span className="font-semibold text-zinc-900">
                                Leg {leg.sequence}: {airportCode(leg.originAirport)} →{" "}
                                {airportCode(leg.destinationAirport)}
                              </span>
                              <span className="text-zinc-600">
                                {leg.departureDate ? formatCalendarDate(leg.departureDate) : DASH}
                                {leg.departureTime ? ` · Dep ${leg.departureTime}` : ""}
                                {leg.arrivalTime ? ` · Arr ${leg.arrivalTime}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 3. INVOICES TAB */}
        {activeTab === "invoices" && (
          <div className="flex flex-col gap-4">
            {invoices.length === 0 ? (
              <div className="bg-white border border-zinc-200 p-10 text-center text-[13px] text-zinc-500">
                No statements or invoices have been issued yet.
              </div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="bg-white border border-zinc-200 p-6 flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-500">
                          {inv.trip?.reference ? `Trip TJ-${inv.trip.reference}` : "Charter Statement"}
                        </span>
                        <StatusPill value={inv.state} />
                      </div>
                      <h3 className="text-[18px] font-bold text-zinc-900">{inv.number}</h3>
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                        Balance Due
                      </span>
                      <span className="text-[20px] font-bold text-zinc-900">
                        {formatMoney(inv.balance)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Total Billed</p>
                      <p className="font-semibold text-zinc-900 mt-0.5">{formatMoney(inv.total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Paid to Date</p>
                      <p className="font-semibold text-zinc-900 mt-0.5">{formatMoney(inv.paid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Issued On</p>
                      <p className="font-semibold text-zinc-900 mt-0.5">
                        {inv.issuedAt ? formatCalendarDate(inv.issuedAt) : DASH}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Due Date</p>
                      <p className="font-semibold text-zinc-900 mt-0.5">
                        {inv.dueDate ? formatCalendarDate(inv.dueDate) : DASH}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-none border-zinc-300 h-9 px-4 text-[12px] font-medium gap-1.5"
                    >
                      <a href={clientPortalInvoicePdfUrl(token, inv.id)} target="_blank" rel="noreferrer">
                        <Download className="size-3.5" />
                        Download Invoice PDF
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className="bg-white border border-zinc-200 divide-y divide-zinc-200">
            {documents.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-zinc-500">
                No shared documents on file yet.
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="size-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[14px] font-semibold text-zinc-900">{doc.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {[
                          String(doc.category ?? "").replace(/_/g, " "),
                          doc.trip?.reference ? `TJ-${doc.trip.reference}` : null,
                          formatBytes(doc.size),
                          doc.createdAt ? formatCalendarDate(doc.createdAt) : null,
                        ]
                          .filter(Boolean)
                          .join("  ·  ")}
                      </p>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="rounded-none border-zinc-300 h-9 px-4 text-[12px] font-medium gap-1.5 shrink-0 w-fit"
                  >
                    <a href={clientPortalDocumentUrl(token, doc.id)} target="_blank" rel="noreferrer">
                      <Download className="size-3.5" />
                      Download
                    </a>
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Quote Approval / Decline Confirmation Modal */}
      <Dialog open={Boolean(decisionTarget)} onOpenChange={(open) => !open && setDecisionTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-none border-zinc-200 p-6 font-montserrat">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-zinc-900">
              {decisionTarget?.decision === "APPROVE"
                ? `Approve Proposal Q-${decisionTarget?.quote?.reference}`
                : `Decline Proposal Q-${decisionTarget?.quote?.reference}`}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-zinc-600">
              {decisionTarget?.decision === "APPROVE"
                ? "Confirming approval notifies your charter advisor immediately to proceed with aircraft booking."
                : "Please let your charter advisor know if you would like alternative aircraft or schedule options."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-semibold">
              Note for your Charter Advisor (Optional)
            </label>
            <Textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Any preferences, catering requests, or feedback..."
              className="rounded-none border-zinc-300 text-[13px] min-h-24"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={responding}
              onClick={() => setDecisionTarget(null)}
              className="rounded-none border-zinc-300 text-[12px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={responding}
              onClick={handleConfirmDecision}
              className="rounded-none bg-zinc-900 hover:bg-zinc-800 text-white text-[12px]"
            >
              {responding
                ? "Recording..."
                : decisionTarget?.decision === "APPROVE"
                  ? "Confirm Approval"
                  : "Confirm Decline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
