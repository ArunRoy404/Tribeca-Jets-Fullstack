/**
 * Public surface of the referrals data layer (#11) — desk and portal alike.
 *
 * Components import from `@/hooks/referrals`, never the individual files.
 */
export { useReferrals } from "./useReferrals";
export { useReferral } from "./useReferral";
export { useReferralStats } from "./useReferralStats";
export { useSubmitReferral } from "./useSubmitReferral";
export { useUpdateReferral } from "./useUpdateReferral";
export { useConvertReferral } from "./useConvertReferral";
export { useRemoveReferral } from "./useRemoveReferral";
export { useRestoreReferral } from "./useRestoreReferral";
export { useReferralResources } from "./useReferralResources";
export { useSaveReferralResource } from "./useSaveReferralResource";
export { useArchiveReferralResource } from "./useArchiveReferralResource";
export { useReferralsTableParams } from "./useReferralsTableParams";
