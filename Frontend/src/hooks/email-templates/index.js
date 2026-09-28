/**
 * Public surface of the email-templates data layer (#21).
 *
 * Components import from `@/hooks/email-templates`, never the individual files.
 */
export { useEmailTemplates } from "./useEmailTemplates";
export { useEmailTemplate } from "./useEmailTemplate";
export { useEmailTemplateStats } from "./useEmailTemplateStats";
export { useMergeFields } from "./useMergeFields";
export { useCreateEmailTemplate } from "./useCreateEmailTemplate";
export { useUpdateEmailTemplate } from "./useUpdateEmailTemplate";
export { useRemoveEmailTemplate } from "./useRemoveEmailTemplate";
export { useRestoreEmailTemplate } from "./useRestoreEmailTemplate";
export { useSentEmails } from "./useSentEmails";
export { useSentEmail } from "./useSentEmail";
export { usePreviewEmail } from "./usePreviewEmail";
export { useSendEmail } from "./useSendEmail";
export { useEmailTemplatesTableParams } from "./useEmailTemplatesTableParams";
