/**
 * Public surface of the Document Vault data layer (#22).
 *
 * Components import from `@/hooks/documents`, never the individual files.
 */
export { useDocuments } from "./useDocuments";
export { useDocument } from "./useDocument";
export { useDocumentStats } from "./useDocumentStats";
export { useCreateDocument } from "./useCreateDocument";
export { useUpdateDocument } from "./useUpdateDocument";
export { useRemoveDocument } from "./useRemoveDocument";
export { useRestoreDocument } from "./useRestoreDocument";
export { useDocumentsTableParams } from "./useDocumentsTableParams";
