import {
  airportCodeLabel,
  cleanText,
  clientDisplayName,
  createPdfDocument,
  DASH,
  drawBrokerAdvisorBlock,
  drawDocumentTitle,
  drawHairline,
  drawKeyValueGrid,
  drawLetterhead,
  drawRouteBanner,
  drawSectionHeading,
  ensureSpace,
  finalizePdf,
  formatPdfDate,
  formatPdfMoney,
  formatPdfPercent,
  PDF_THEME,
  type PdfAirportSummary,
  type PdfBrokerContact,
  type PdfCompanyBrand,
} from './pdf.document.js';

// ---- 1. Quote PDF ---------------------------------------------------------

export interface QuotePdfData {
  reference: number | string;
  version: number;
  status: string;
  validUntil: Date | string | null;
  sentAt?: Date | string | null;
  createdAt?: Date | string | null;
  departureDate: Date | string | null;
  returnDate?: Date | string | null;
  passengers?: number | null;
  quotedAircraft?: string | null;
  basePrice: number;
  fetEnabled: boolean;
  fetRate: number;
  fetAmount: number;
  extrasTotal: number;
  totalPrice: number;
  depositAmount?: number | null;
  lineItems?: ReadonlyArray<{ description?: string; label?: string; amount: number }>;
  terms?: string | null;
  client?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
  } | null;
  assignedBroker?: PdfBrokerContact | null;
  originAirport?: PdfAirportSummary | null;
  destinationAirport?: PdfAirportSummary | null;
  aircraft?: {
    tailNumber?: string | null;
    model?: string | null;
    category?: string | null;
    maxPassengers?: number | null;
    rangeNm?: number | null;
  } | null;
  operator?: {
    name?: string | null;
  } | null;
}

export async function renderQuotePdf(
  quote: QuotePdfData,
  brand: PdfCompanyBrand,
  exteriorPhotoBuffer?: Buffer | null,
): Promise<Buffer> {
  const refLabel = String(quote.reference).startsWith('Q-') ? String(quote.reference) : `Q-${quote.reference}`;
  const doc = createPdfDocument({ title: `Charter Quotation ${refLabel}` });

  drawLetterhead(doc, brand);
  drawDocumentTitle(doc, {
    eyebrow: `Charter Quotation \u00B7 Version ${quote.version}`,
    title: refLabel,
    subtitle: `Prepared for ${clientDisplayName(quote.client)}`,
    status: quote.status.replace(/_/g, ' '),
    dateLabel: quote.validUntil ? `Valid until ${formatPdfDate(quote.validUntil)}` : `Issued ${formatPdfDate(quote.createdAt ?? new Date())}`,
  });

  drawRouteBanner(doc, {
    origin: quote.originAirport ?? null,
    destination: quote.destinationAirport ?? null,
    departureLabel: formatPdfDate(quote.departureDate),
    secondaryDateLabel: quote.returnDate ? `Return ${formatPdfDate(quote.returnDate)}` : 'One-Way Charter',
  });

  drawSectionHeading(doc, 'Client & Aircraft Specification');
  const aircraftModel = quote.aircraft?.model || quote.quotedAircraft || DASH;
  const tailNumber = quote.aircraft?.tailNumber || DASH;
  const category = quote.aircraft?.category ? quote.aircraft.category.replace(/_/g, ' ') : DASH;
  const capacity =
    quote.aircraft?.maxPassengers !== null && quote.aircraft?.maxPassengers !== undefined
      ? `${quote.aircraft.maxPassengers} seats`
      : DASH;

  drawKeyValueGrid(
    doc,
    [
      { label: 'Client', value: clientDisplayName(quote.client) },
      { label: 'Client Email', value: quote.client?.email ?? DASH },
      { label: 'Passengers', value: quote.passengers ? `${quote.passengers} pax` : DASH },
      { label: 'Aircraft', value: aircraftModel },
      { label: 'Tail Number', value: tailNumber },
      { label: 'Cabin Category', value: category },
      { label: 'Seating Capacity', value: capacity },
      { label: 'Operator', value: quote.operator?.name ?? DASH },
      { label: 'Valid Through', value: formatPdfDate(quote.validUntil) },
    ],
    3,
  );

  if (exteriorPhotoBuffer) {
    try {
      ensureSpace(doc, 145);
      const left = 48;
      const topY = doc.y + 2;
      doc.image(exteriorPhotoBuffer, left, topY, { fit: [240, 125] });
      doc.y = topY + 134;
    } catch {
      // Ignore unrenderable raster buffer
    }
  }

  drawSectionHeading(doc, 'Charter Investment Breakdown');
  const left = 48;
  const right = doc.page.width - 48;
  const width = right - left;

  const drawPriceRow = (label: string, amount: string, bold = false) => {
    ensureSpace(doc, 24);
    const y = doc.y;
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 10.5 : 9.5)
      .fillColor(PDF_THEME.ink)
      .text(label, left, y, { width: width - 140, lineBreak: false });
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 10.5 : 9.5)
      .fillColor(PDF_THEME.ink)
      .text(amount, right - 130, y, { width: 130, align: 'right', lineBreak: false });
    drawHairline(doc, y + 16, left, right, PDF_THEME.rule, 0.4);
    doc.y = y + 23;
  };

  drawPriceRow('Base Charter Price', formatPdfMoney(quote.basePrice));

  for (const item of quote.lineItems ?? []) {
    const itemLabel = item.description || item.label || 'Additional Service';
    drawPriceRow(itemLabel, formatPdfMoney(item.amount));
  }

  if (quote.fetEnabled) {
    const ratePct = (Number(quote.fetRate) * 100).toFixed(1);
    drawPriceRow(`Federal Excise Tax (${ratePct}%)`, formatPdfMoney(quote.fetAmount));
  }

  ensureSpace(doc, 38);
  const totalY = doc.y + 2;
  drawHairline(doc, totalY - 4, left, right, PDF_THEME.strongRule, 0.8);
  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(PDF_THEME.ink)
    .text('TOTAL CHARTER INVESTMENT', left, totalY + 4, { width: width - 150, characterSpacing: 0.6, lineBreak: false });
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(PDF_THEME.ink)
    .text(formatPdfMoney(quote.totalPrice), right - 140, totalY + 3, { width: 140, align: 'right', lineBreak: false });
  drawHairline(doc, totalY + 22, left, right, PDF_THEME.strongRule, 0.8);
  doc.y = totalY + 32;

  if (quote.depositAmount !== null && quote.depositAmount !== undefined && quote.depositAmount > 0) {
    drawKeyValueGrid(doc, [{ label: 'Deposit Required to Confirm', value: formatPdfMoney(quote.depositAmount) }], 2);
  }

  const effectiveTerms = quote.terms?.trim() || brand.defaultQuoteTerms?.trim() || null;
  if (effectiveTerms) {
    drawSectionHeading(doc, 'Terms & Conditions');
    ensureSpace(doc, 48);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(PDF_THEME.body)
      .text(effectiveTerms, left, doc.y, { width, lineGap: 2.5 });
    doc.y += 14;
  }

  drawBrokerAdvisorBlock(doc, brand, quote.assignedBroker);
  return finalizePdf(doc, brand, refLabel);
}

// ---- 2. Itinerary PDF -----------------------------------------------------

export interface ItineraryPdfLeg {
  sequence: number;
  originAirport?: (PdfAirportSummary & { assignedFbo?: string | null }) | null;
  destinationAirport?: (PdfAirportSummary & { assignedFbo?: string | null }) | null;
  departureDate?: Date | string | null;
  departureTime?: string | null;
}

export interface ItineraryPdfPassenger {
  fullName?: string | null;
  dateOfBirth?: Date | string | null;
  passportNumber?: string | null;
}

export interface ItineraryPdfData {
  tripReference: string;
  status: string;
  tripStatus?: string | null;
  departureDate?: Date | string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  flightTime?: string | null;
  miles?: string | null;
  departureFbo?: string | null;
  arrivalFbo?: string | null;
  catering?: string | null;
  groundTransport?: string | null;
  operatorItineraryText?: string | null;
  notes?: string | null;
  client?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  } | null;
  assignedBroker?: PdfBrokerContact | null;
  operator?: { name?: string | null } | null;
  aircraft?: { tailNumber?: string | null; model?: string | null } | null;
  aircraftDescription?: string | null;
  originAirport?: PdfAirportSummary | null;
  destinationAirport?: PdfAirportSummary | null;
  legs?: readonly ItineraryPdfLeg[];
  passengers?: readonly ItineraryPdfPassenger[];
}

export interface ItineraryPdfPhotos {
  logoBuffer?: Buffer | null;
  exteriorBuffer?: Buffer | null;
  interiorBuffer?: Buffer | null;
}

export async function renderItineraryPdf(
  itinerary: ItineraryPdfData,
  brand: PdfCompanyBrand,
  photos: ItineraryPdfPhotos = {},
): Promise<Buffer> {
  const refLabel = itinerary.tripReference || 'ITINERARY';
  const doc = createPdfDocument({ title: `Passenger Itinerary ${refLabel}` });

  drawLetterhead(doc, brand, photos.logoBuffer);
  drawDocumentTitle(doc, {
    eyebrow: 'Passenger Briefing & Flight Itinerary',
    title: refLabel,
    subtitle: `Prepared for ${clientDisplayName(itinerary.client)}`,
    status: itinerary.status.replace(/_/g, ' '),
    dateLabel: itinerary.departureDate ? `Departure ${formatPdfDate(itinerary.departureDate)}` : null,
  });

  const depSchedule = [
    formatPdfDate(itinerary.departureDate),
    itinerary.departureTime ? `${itinerary.departureTime} local` : null,
  ]
    .filter((p) => p && p !== DASH)
    .join(' \u00B7 ') || DASH;

  drawRouteBanner(doc, {
    origin: itinerary.originAirport ?? null,
    destination: itinerary.destinationAirport ?? null,
    departureLabel: depSchedule,
    secondaryDateLabel: itinerary.arrivalTime ? `Est. Arrival ${itinerary.arrivalTime} local` : null,
  });

  drawSectionHeading(doc, 'Aircraft & Flight Summary');
  const aircraftModel = itinerary.aircraft?.model || itinerary.aircraftDescription || DASH;
  drawKeyValueGrid(
    doc,
    [
      { label: 'Aircraft', value: aircraftModel },
      { label: 'Tail Number', value: itinerary.aircraft?.tailNumber ?? DASH },
      { label: 'Operator', value: itinerary.operator?.name ?? DASH },
      { label: 'Flight Duration', value: itinerary.flightTime ?? DASH },
      { label: 'Distance (Miles)', value: itinerary.miles ?? DASH },
      { label: 'Trip Status', value: itinerary.tripStatus ? itinerary.tripStatus.replace(/_/g, ' ') : DASH },
    ],
    3,
  );

  if (photos.exteriorBuffer || photos.interiorBuffer) {
    ensureSpace(doc, 145);
    const left = 48;
    const topY = doc.y + 2;
    let drewAny = false;
    if (photos.exteriorBuffer) {
      try {
        doc.image(photos.exteriorBuffer, left, topY, { fit: [240, 120] });
        drewAny = true;
      } catch {
        // Ignore invalid buffer
      }
    }
    if (photos.interiorBuffer) {
      try {
        doc.image(photos.interiorBuffer, photos.exteriorBuffer ? left + 260 : left, topY, { fit: [240, 120] });
        drewAny = true;
      } catch {
        // Ignore invalid buffer
      }
    }
    if (drewAny) doc.y = topY + 132;
  }

  drawSectionHeading(doc, 'FBO Handling & Concierge Services');
  drawKeyValueGrid(
    doc,
    [
      { label: 'Departure FBO', value: itinerary.departureFbo ?? DASH },
      { label: 'Arrival FBO', value: itinerary.arrivalFbo ?? DASH },
      { label: 'In-Flight Catering', value: itinerary.catering ?? DASH },
      { label: 'Ground Transport', value: itinerary.groundTransport ?? DASH },
    ],
    2,
  );

  if (itinerary.legs && itinerary.legs.length > 1) {
    drawSectionHeading(doc, 'Flight Legs');
    const left = 48;
    const right = doc.page.width - 48;
    for (const leg of itinerary.legs) {
      ensureSpace(doc, 26);
      const y = doc.y;
      const routeText = `${airportCodeLabel(leg.originAirport)} \u2192 ${airportCodeLabel(leg.destinationAirport)}`;
      const timeText = [formatPdfDate(leg.departureDate), leg.departureTime].filter((v) => v && v !== DASH).join(' \u00B7 ') || DASH;
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(PDF_THEME.ink)
        .text(`Leg ${leg.sequence}   \u00B7   ${routeText}`, left, y, { lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(PDF_THEME.muted)
        .text(timeText, right - 180, y, { width: 180, align: 'right', lineBreak: false });
      drawHairline(doc, y + 16, left, right, PDF_THEME.rule, 0.4);
      doc.y = y + 22;
    }
  }

  drawSectionHeading(doc, `Passenger Manifest (${itinerary.passengers?.length ?? 0})`);
  const left = 48;
  const right = doc.page.width - 48;
  const passengers = itinerary.passengers ?? [];

  if (passengers.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(PDF_THEME.muted)
      .text('No passengers recorded on manifest.', left, doc.y);
    doc.y += 18;
  } else {
    ensureSpace(doc, 24);
    const headerY = doc.y;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(PDF_THEME.muted);
    doc.text('#', left, headerY, { width: 28, lineBreak: false });
    doc.text('FULL NAME', left + 32, headerY, { width: 220, characterSpacing: 1, lineBreak: false });
    doc.text('DATE OF BIRTH', left + 260, headerY, { width: 120, characterSpacing: 1, lineBreak: false });
    doc.text('PASSPORT / ID', right - 130, headerY, { width: 130, align: 'right', characterSpacing: 1, lineBreak: false });
    drawHairline(doc, headerY + 11, left, right, PDF_THEME.rule, 0.5);
    doc.y = headerY + 17;

    passengers.forEach((pax, index) => {
      ensureSpace(doc, 22);
      const rowY = doc.y;
      doc.font('Helvetica').fontSize(9).fillColor(PDF_THEME.muted).text(String(index + 1).padStart(2, '0'), left, rowY, {
        width: 28,
        lineBreak: false,
      });
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(PDF_THEME.ink)
        .text(cleanText(pax.fullName), left + 32, rowY, { width: 220, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(PDF_THEME.body)
        .text(formatPdfDate(pax.dateOfBirth), left + 260, rowY, { width: 120, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(PDF_THEME.body)
        .text(cleanText(pax.passportNumber), right - 130, rowY, { width: 130, align: 'right', lineBreak: false });
      drawHairline(doc, rowY + 15, left, right, PDF_THEME.rule, 0.4);
      doc.y = rowY + 21;
    });
    doc.y += 6;
  }

  if (itinerary.operatorItineraryText?.trim()) {
    drawSectionHeading(doc, 'Operator Dispatch Briefing');
    ensureSpace(doc, 40);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(PDF_THEME.body)
      .text(itinerary.operatorItineraryText.trim(), left, doc.y, { width: right - left, lineGap: 2 });
    doc.y += 12;
  }

  if (itinerary.notes?.trim()) {
    drawSectionHeading(doc, 'Additional Notes');
    ensureSpace(doc, 36);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(PDF_THEME.body)
      .text(itinerary.notes.trim(), left, doc.y, { width: right - left, lineGap: 2 });
    doc.y += 12;
  }

  drawBrokerAdvisorBlock(doc, brand, itinerary.assignedBroker);
  return finalizePdf(doc, brand, refLabel);
}

// ---- 3. Client Invoice PDF (Receivables) ----------------------------------

export interface InvoicePdfPayment {
  amount: number;
  paidAt: Date | string | null;
  method?: string | null;
  reference?: string | null;
}

export interface InvoicePdfData {
  number: string;
  status: string;
  state: string;
  amount: number;
  fetAmount: number;
  total: number;
  paid: number;
  balance: number;
  issuedAt?: Date | string | null;
  dueDate?: Date | string | null;
  notes?: string | null;
  client?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  trip?: {
    reference: number | string;
    departureDate?: Date | string | null;
    assignedBroker?: PdfBrokerContact | null;
  } | null;
  payments?: readonly InvoicePdfPayment[];
}

export async function renderInvoicePdf(invoice: InvoicePdfData, brand: PdfCompanyBrand): Promise<Buffer> {
  const doc = createPdfDocument({ title: `Invoice ${invoice.number}` });
  const tripRef = invoice.trip?.reference
    ? String(invoice.trip.reference).startsWith('TJ-')
      ? String(invoice.trip.reference)
      : `TJ-${invoice.trip.reference}`
    : DASH;

  drawLetterhead(doc, brand);
  drawDocumentTitle(doc, {
    eyebrow: 'Charter Invoice & Statement',
    title: invoice.number,
    subtitle: `Billed to ${clientDisplayName(invoice.client)}`,
    status: invoice.state.replace(/_/g, ' '),
    dateLabel: invoice.dueDate ? `Due ${formatPdfDate(invoice.dueDate)}` : `Issued ${formatPdfDate(invoice.issuedAt)}`,
  });

  drawSectionHeading(doc, 'Billing & Flight Details');
  drawKeyValueGrid(
    doc,
    [
      { label: 'Billed To', value: clientDisplayName(invoice.client) },
      { label: 'Client Email', value: invoice.client?.email ?? DASH },
      { label: 'Client Phone', value: invoice.client?.phone ?? DASH },
      { label: 'Trip Reference', value: tripRef },
      { label: 'Flight Date', value: formatPdfDate(invoice.trip?.departureDate) },
      { label: 'Invoice Status', value: invoice.status.replace(/_/g, ' ') },
      { label: 'Date Issued', value: formatPdfDate(invoice.issuedAt) },
      { label: 'Payment Due Date', value: formatPdfDate(invoice.dueDate) },
    ],
    3,
  );

  drawSectionHeading(doc, 'Summary of Charges');
  const left = 48;
  const right = doc.page.width - 48;
  const width = right - left;

  const drawChargeLine = (label: string, value: string, bold = false) => {
    ensureSpace(doc, 24);
    const y = doc.y;
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 10 : 9.5)
      .fillColor(PDF_THEME.ink)
      .text(label, left, y, { width: width - 140, lineBreak: false });
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 10 : 9.5)
      .fillColor(PDF_THEME.ink)
      .text(value, right - 130, y, { width: 130, align: 'right', lineBreak: false });
    drawHairline(doc, y + 16, left, right, PDF_THEME.rule, 0.4);
    doc.y = y + 23;
  };

  drawChargeLine(`Charter Flight Services (${tripRef})`, formatPdfMoney(invoice.amount));
  drawChargeLine('Federal Excise Tax (FET)', formatPdfMoney(invoice.fetAmount));
  drawChargeLine('Invoice Total', formatPdfMoney(invoice.total), true);
  drawChargeLine('Payments Received', formatPdfMoney(invoice.paid));

  ensureSpace(doc, 38);
  const balY = doc.y + 2;
  drawHairline(doc, balY - 4, left, right, PDF_THEME.strongRule, 0.8);
  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(PDF_THEME.ink)
    .text('BALANCE DUE', left, balY + 4, { width: width - 150, characterSpacing: 0.6, lineBreak: false });
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(PDF_THEME.ink)
    .text(formatPdfMoney(invoice.balance), right - 140, balY + 3, { width: 140, align: 'right', lineBreak: false });
  drawHairline(doc, balY + 22, left, right, PDF_THEME.strongRule, 0.8);
  doc.y = balY + 32;

  const payments = invoice.payments ?? [];
  if (payments.length > 0) {
    drawSectionHeading(doc, 'Recorded Payments');
    ensureSpace(doc, 24);
    const hY = doc.y;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(PDF_THEME.muted);
    doc.text('DATE', left, hY, { width: 100, characterSpacing: 1, lineBreak: false });
    doc.text('METHOD', left + 110, hY, { width: 110, characterSpacing: 1, lineBreak: false });
    doc.text('REFERENCE', left + 230, hY, { width: 150, characterSpacing: 1, lineBreak: false });
    doc.text('AMOUNT', right - 110, hY, { width: 110, align: 'right', characterSpacing: 1, lineBreak: false });
    drawHairline(doc, hY + 11, left, right, PDF_THEME.rule, 0.5);
    doc.y = hY + 17;

    for (const p of payments) {
      ensureSpace(doc, 22);
      const rY = doc.y;
      doc.font('Helvetica').fontSize(9).fillColor(PDF_THEME.body).text(formatPdfDate(p.paidAt), left, rY, {
        width: 100,
        lineBreak: false,
      });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(PDF_THEME.body)
        .text(p.method ? p.method.replace(/_/g, ' ') : DASH, left + 110, rY, { width: 110, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(PDF_THEME.body)
        .text(cleanText(p.reference), left + 230, rY, { width: 150, lineBreak: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(PDF_THEME.ink)
        .text(formatPdfMoney(p.amount), right - 110, rY, { width: 110, align: 'right', lineBreak: false });
      drawHairline(doc, rY + 15, left, right, PDF_THEME.rule, 0.4);
      doc.y = rY + 21;
    }
    doc.y += 6;
  }

  if (invoice.notes?.trim()) {
    drawSectionHeading(doc, 'Notes & Remittance Instructions');
    ensureSpace(doc, 36);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(PDF_THEME.body)
      .text(invoice.notes.trim(), left, doc.y, { width, lineGap: 2 });
    doc.y += 12;
  }

  drawBrokerAdvisorBlock(doc, brand, invoice.trip?.assignedBroker);
  return finalizePdf(doc, brand, invoice.number);
}

// ---- 4. Operations Report PDF (Reports) -----------------------------------

export interface OperationsReportPdfRow {
  reference: string;
  departure: string | null;
  status: string;
  client: string | null;
  broker: string | null;
  route: string | null;
  aircraft: string | null;
  operator: string | null;
  revenue: number | null;
  fet: number | null;
  operatorCost: number | null;
  profit: number | null;
  marginPercentage: number | null;
}

export interface OperationsReportPdfInput {
  periodLabel: string;
  rows: readonly OperationsReportPdfRow[];
  totals: {
    tripCount: number;
    revenue: number;
    fet: number;
    profit: number;
    marginPercentage: number | null;
  };
}

export async function renderOperationsReportPdf(
  report: OperationsReportPdfInput,
  brand: PdfCompanyBrand,
): Promise<Buffer> {
  const doc = createPdfDocument({ title: `Operations Report (${report.periodLabel})`, layout: 'landscape' });

  drawLetterhead(doc, brand);
  drawDocumentTitle(doc, {
    eyebrow: 'Financial & Operations Ledger',
    title: 'Operations Report',
    subtitle: `Period: ${report.periodLabel}`,
    status: `${report.totals.tripCount} ${report.totals.tripCount === 1 ? 'Operation' : 'Operations'}`,
    dateLabel: `Generated ${formatPdfDate(new Date())}`,
  });

  drawSectionHeading(doc, 'Executive Summary');
  drawKeyValueGrid(
    doc,
    [
      { label: 'Total Operations', value: String(report.totals.tripCount) },
      { label: 'Total Revenue', value: formatPdfMoney(report.totals.revenue) },
      { label: 'FET Charged', value: formatPdfMoney(report.totals.fet) },
      {
        label: 'Gross Profit \u00B7 Margin',
        value: `${formatPdfMoney(report.totals.profit)} (${formatPdfPercent(report.totals.marginPercentage)})`,
      },
    ],
    4,
  );

  drawSectionHeading(doc, 'Operations Breakdown');
  const left = 48;
  const right = doc.page.width - 48;

  const cols = [
    { header: 'TRIP', width: 52, align: 'left' as const },
    { header: 'DEPARTURE', width: 62, align: 'left' as const },
    { header: 'STATUS', width: 62, align: 'left' as const },
    { header: 'CLIENT', width: 96, align: 'left' as const },
    { header: 'BROKER', width: 82, align: 'left' as const },
    { header: 'ROUTE', width: 74, align: 'left' as const },
    { header: 'AIRCRAFT', width: 78, align: 'left' as const },
    { header: 'REVENUE', width: 66, align: 'right' as const },
    { header: 'OP COST', width: 66, align: 'right' as const },
    { header: 'PROFIT', width: 64, align: 'right' as const },
  ];

  const drawTableHeader = () => {
    const y = doc.y;
    let x = left;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(PDF_THEME.muted);
    for (const col of cols) {
      doc.text(col.header, x, y, { width: col.width - 4, align: col.align, characterSpacing: 0.8, lineBreak: false });
      x += col.width;
    }
    drawHairline(doc, y + 10, left, right, PDF_THEME.strongRule, 0.6);
    doc.y = y + 15;
  };

  drawTableHeader();

  if (report.rows.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(PDF_THEME.muted)
      .text('No operations recorded in this window.', left, doc.y + 4);
    doc.y += 24;
  } else {
    for (const row of report.rows) {
      if (doc.y + 20 > doc.page.height - 58) {
        doc.addPage();
        doc.y = 48;
        drawTableHeader();
      }
      const rY = doc.y;
      const values = [
        row.reference,
        row.departure ?? DASH,
        row.status.replace(/_/g, ' '),
        cleanText(row.client),
        cleanText(row.broker),
        cleanText(row.route),
        cleanText(row.aircraft),
        formatPdfMoney(row.revenue),
        formatPdfMoney(row.operatorCost),
        formatPdfMoney(row.profit),
      ];

      let x = left;
      values.forEach((val, idx) => {
        const col = cols[idx]!;
        doc
          .font(idx === 0 || idx === 7 || idx === 9 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7.8)
          .fillColor(idx === 0 ? PDF_THEME.ink : PDF_THEME.body)
          .text(val, x, rY, { width: col.width - 4, align: col.align, ellipsis: true, lineBreak: false });
        x += col.width;
      });
      drawHairline(doc, rY + 13, left, right, PDF_THEME.rule, 0.35);
      doc.y = rY + 18;
    }
  }

  return finalizePdf(doc, brand, 'Operations Report');
}

// ---- 5. Branding Header Preview PDF (Settings › Company & Branding) -------

export async function renderBrandingPreviewPdf(
  brand: PdfCompanyBrand,
  actor?: PdfBrokerContact | null,
): Promise<Buffer> {
  const doc = createPdfDocument({ title: `${brand.companyName} — Document Identity Preview` });

  drawLetterhead(doc, brand);
  drawDocumentTitle(doc, {
    eyebrow: 'Document Identity Preview',
    title: 'Sample Charter Document',
    subtitle: 'Reflects the current Company & Branding letterhead settings.',
    status: 'PREVIEW',
    dateLabel: formatPdfDate(new Date()),
  });

  drawSectionHeading(doc, 'Active Document Identity Settings');
  drawKeyValueGrid(
    doc,
    [
      { label: 'Company Name', value: brand.companyName },
      { label: 'Company Logo on Documents', value: brand.showLogo ? 'Enabled' : 'Hidden' },
      { label: 'Company Contact Block', value: brand.contact ? 'Enabled (All filled lines shown)' : 'Hidden' },
      { label: 'Assigned Broker Contact', value: brand.showBrokerContact ? 'Enabled' : 'Hidden' },
      { label: 'Client Services Footer', value: brand.contact?.clientServicesLabel || brand.companyName },
    ],
    2,
  );

  drawBrokerAdvisorBlock(
    doc,
    brand,
    actor ?? {
      firstName: 'Assigned',
      lastName: 'Advisor',
      email: brand.contact?.email ?? 'advisor@example.com',
      phone: brand.contact?.phone ?? null,
    },
  );

  return finalizePdf(doc, brand, 'Branding Preview');
}
