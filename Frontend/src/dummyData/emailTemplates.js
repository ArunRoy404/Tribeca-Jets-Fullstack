export const emailTemplateStats = [
  { label: "TOTAL TEMPLATES", value: "6", tone: "foreground" },
  { label: "ACTIVE", value: "5", tone: "success" },
  { label: "CATEGORIES", value: "7", tone: "purple" },
  { label: "SENT THIS MONTH", value: "142", tone: "foreground" },
];

export const templateStatusOptions = ["All", "Active", "Inactive"];
export const templateCategoryOptions = [
  "All",
  "Quote Follow-up",
  "Trip Confirmation",
  "Empty Leg",
  "Payment",
  "General",
  "Travel Agent",
];

export const emailTemplatesData = [
  {
    id: "TPL-001",
    name: "Quote Follow-up — Standard",
    category: "Quote Follow-up",
    subject: "Following up on your charter quote for {route}",
    status: "Active",
    lastUpdated: "Aug 24, 2026",
    content: "Dear {client_name},\n\nI hope this email finds you well. I wanted to follow up on the quote I sent you for your {route} charter on {departure_date}.\n\nThe quote includes:\n- Aircraft: {aircraft}\n- Total Price: ${total_price}\n- FET: ${fet_amount}\n\nPlease let me know if you have any questions or if you would like to move forward with confirming this flight.\n\nBest regards,\nTribeca Jets Team",
  },
  {
    id: "TPL-002",
    name: "Trip Confirmation",
    category: "Trip Confirmation",
    subject: "Your charter is confirmed - Trip {trip_id}",
    status: "Active",
    lastUpdated: "Aug 20, 2026",
    content: "Dear {client_name},\n\nWe are pleased to confirm your charter flight for Trip {trip_id}.\n\nFlight Details:\n- Route: {route}\n- Departure Date: {departure_date}\n- Aircraft: {aircraft}\n- Tail Number: {tail_number}\n\nAttached you will find your full passenger briefing and itinerary. Please review and feel free to reach out if you have any questions.\n\nSafe travels,\nTribeca Jets Operations",
  },
  {
    id: "TPL-003",
    name: "Empty Leg Offer",
    category: "Empty Leg",
    subject: "Empty Leg Available: {origin} - {destination}",
    status: "Active",
    lastUpdated: "Aug 18, 2026",
    content: "Dear {client_name},\n\nAn exclusive empty leg opportunity has just opened up:\n\n- Route: {origin} to {destination}\n- Date: {departure_date}\n- Aircraft: {aircraft}\n- Special Rate: ${total_price}\n\nThis availability is on a first-come, first-served basis. Let us know immediately if you would like to book.\n\nBest regards,\nTribeca Jets Charter Sales",
  },
  {
    id: "TPL-004",
    name: "Payment Reminder - Overdue",
    category: "Payment",
    subject: "Payment Reminder - Invoice {invoice_id}",
    status: "Active",
    lastUpdated: "Aug 15, 2026",
    content: "Dear {client_name},\n\nThis is a friendly reminder that payment for Invoice {invoice_id} regarding Trip {trip_id} is now due.\n\n- Amount Due: ${total_price}\n- Due Date: {due_date}\n\nPlease click the secure payment link below to complete your transaction or contact our finance department.\n\nBest regards,\nTribeca Jets Billing",
  },
  {
    id: "TPL-005",
    name: "Birthday Greeting",
    category: "General",
    subject: "Happy Birthday, {client_name}!",
    status: "Active",
    lastUpdated: "Aug 10, 2026",
    content: "Dear {client_name},\n\nWishing you a very Happy Birthday from all of us at Tribeca Jets!\n\nWe truly appreciate your continued trust and partnership, and we look forward to welcoming you aboard for your next journey.\n\nWarmest regards,\nThe Tribeca Jets Team",
  },
  {
    id: "TPL-006",
    name: "Commission Statement",
    category: "Travel Agent",
    subject: "Commission Statement - Trip {trip_id}",
    status: "Inactive",
    lastUpdated: "Aug 02, 2026",
    content: "Dear {agent_name},\n\nPlease find attached your commission statement for Trip {trip_id} on behalf of client {client_name}.\n\n- Total Sourced: ${total_price}\n- Commission Amount: ${commission_amount}\n\nThank you for your business and partnership.\n\nBest regards,\nTribeca Jets Partner Relations",
  },
];
