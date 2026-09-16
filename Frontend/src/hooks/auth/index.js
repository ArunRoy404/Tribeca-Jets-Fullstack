/**
 * One import site for the auth hooks:
 *   import { useLogin, useCurrentUser } from "@/hooks/auth";
 *
 * Query hooks return the React Query result and mutation hooks return the
 * mutation, so components destructure exactly what they need.
 */
export { useCurrentUser } from "./useCurrentUser";
export { useLogin } from "./useLogin";
export { useLogout } from "./useLogout";
export { useVerifyTwoFactor } from "./useVerifyTwoFactor";
export { useResendTwoFactor } from "./useResendTwoFactor";
export { useForgotPassword } from "./useForgotPassword";
export { useVerifyResetCode } from "./useVerifyResetCode";
export { useResendResetCode } from "./useResendResetCode";
export { useResetPassword } from "./useResetPassword";
export { useAuthFlowGuard } from "./useAuthFlowGuard";
export { useRedirectTarget } from "./useRedirectTarget";
