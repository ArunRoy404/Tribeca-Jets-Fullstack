/**
 * Public surface of the quotes data layer.
 *
 * Components import from `@/hooks/quotes`, never the individual files.
 */
export { useQuotes } from "./useQuotes";
export { useQuote } from "./useQuote";
export { useQuoteVersions } from "./useQuoteVersions";
export { useQuoteStats } from "./useQuoteStats";
export { useQuotesTableParams } from "./useQuotesTableParams";
export { useCreateQuote } from "./useCreateQuote";
export { useQuotePricePreview } from "./useQuotePricePreview";
export { useUpdateQuote } from "./useUpdateQuote";
export { useSendQuote } from "./useSendQuote";
export { useDecideQuote } from "./useDecideQuote";
export { useReopenQuote } from "./useReopenQuote";
export { useDuplicateQuote } from "./useDuplicateQuote";
export { useRemoveQuote } from "./useRemoveQuote";
export { useRestoreQuote } from "./useRestoreQuote";
