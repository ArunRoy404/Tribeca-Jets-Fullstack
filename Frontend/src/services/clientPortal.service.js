import { request } from "@/lib/axios";
import { uploadUrl } from "@/services/uploads.service";

/**
 * Client Portal (#33 / #25) HTTP wrappers and direct file download URLs.
 */
export const clientPortalService = {
  /** GET /client-portal/link/:clientId — staff-only; issues a 90-day signed portal token. */
  issueLink: (clientId) =>
    request({ url: `/client-portal/link/${clientId}`, method: "GET" }),

  /** GET /client-portal/:token — public token-authenticated client portal snapshot. */
  overview: (token) =>
    request({ url: `/client-portal/${encodeURIComponent(token)}`, method: "GET" }),

  /** POST /client-portal/:token/quotes/:quoteId/respond — approve or decline an open quote. */
  respondToQuote: ({ token, quoteId, decision, notes }) =>
    request({
      url: `/client-portal/${encodeURIComponent(token)}/quotes/${quoteId}/respond`,
      method: "POST",
      data: { decision, ...(notes?.trim() ? { notes: notes.trim() } : {}) },
    }),
};

export const clientPortalQuotePdfUrl = (token, quoteId) =>
  uploadUrl(`/api/client-portal/${encodeURIComponent(token)}/quotes/${quoteId}/pdf`);

export const clientPortalItineraryPdfUrl = (token, itineraryId) =>
  uploadUrl(`/api/client-portal/${encodeURIComponent(token)}/itineraries/${itineraryId}/pdf`);

export const clientPortalInvoicePdfUrl = (token, invoiceId) =>
  uploadUrl(`/api/client-portal/${encodeURIComponent(token)}/invoices/${invoiceId}/pdf`);

export const clientPortalDocumentUrl = (token, documentId) =>
  uploadUrl(`/api/client-portal/${encodeURIComponent(token)}/documents/${documentId}/file`);
