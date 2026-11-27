/** Screen labels for audit field names. Unknown fields remain readable. */
const FIELD_LABELS = {
  firstName: "first name", lastName: "last name", companyName: "company",
  email: "email", phone: "phone", type: "type", status: "status",
  leadStage: "lead stage", leadSource: "lead source", priority: "priority",
  assignedBrokerId: "assigned broker", homeAirportId: "home airport",
  nextFollowUpAt: "next follow-up", followUpMethod: "follow-up method",
  birthday: "birthday", labels: "labels", preferences: "travel preferences",
  notes: "notes", internalNotes: "internal notes", clientNotes: "client notes",
  clientId: "client", operatorId: "operator", aircraftId: "aircraft",
  aircraftDescription: "aircraft", aircraftPreference: "aircraft needed",
  originAirportId: "departure airport", destinationAirportId: "arrival airport",
  departureDate: "departure date", departureTime: "departure time", returnDate: "return date",
  passengerCount: "passenger count", passengers: "passengers", legs: "flight legs",
  basePrice: "base price", fetEnabled: "apply FET", fetRate: "FET rate",
  operatorCost: "operator cost", lineItems: "extras", depositAmount: "deposit",
  summary: "summary", requirements: "client requirements", estimatedValue: "estimated value",
  quoteDeadline: "quote deadline", estimatedArrival: "arrival estimate", trackingUrl: "tracking link",
  operatorConfirmed: "operator confirmed", contractSent: "contract sent",
  contractReceived: "contract received", operatorPaymentReceived: "operator payment received",
  amount: "amount", occurredAt: "date", appliedToTripId: "applied to trip", reason: "reason",
  fileUrl: "file", uploadId: "file", description: "description",
  tripRequestId: "trip request", source: "source", title: "title", category: "category",
};

export function auditFieldLabel(key) {
  return FIELD_LABELS[key] ?? String(key ?? "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ").trim().toLowerCase();
}

export function auditFieldList(fields) {
  return new Intl.ListFormat("en-US", { style: "long", type: "conjunction" })
    .format(fields.map(auditFieldLabel));
}
