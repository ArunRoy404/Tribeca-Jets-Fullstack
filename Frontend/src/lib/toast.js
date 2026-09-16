import { gooeyToast } from "goey-toast";

/**
 * The app's single toast entry point.
 *
 * Everything imports from here rather than from `goey-toast` directly, so the
 * library is swappable from one file and every hook shares the same wording and
 * durations.
 */
export const toast = gooeyToast;

/**
 * Applied to every toast so they match the app's type.
 *
 * `wrapper` / `content` / `title` / `description` are goey-toast's own class
 * slots — the Toaster's `toastOptions` takes the underlying sonner shape
 * instead, so styling is set per toast rather than guessing at that.
 */
const BASE_CLASS_NAMES = {
  wrapper: "font-montserrat",
  title: "font-montserrat font-medium",
  description: "font-montserrat",
};

/** Durations in ms, so "how long does a toast live" is answered in one place. */
export const TOAST_DURATION = {
  short: 3000,
  default: 4000,
  long: 6000,
  /** Long enough to read and copy a 6-digit code. */
  devCode: 15000,
};

export function toastSuccess(title, description, options) {
  return gooeyToast.success(title, {
    description,
    duration: TOAST_DURATION.default,
    classNames: BASE_CLASS_NAMES,
    ...options,
  });
}

export function toastInfo(title, description, options) {
  return gooeyToast.info(title, {
    description,
    duration: TOAST_DURATION.default,
    classNames: BASE_CLASS_NAMES,
    ...options,
  });
}

/**
 * Surfaces a normalised API error.
 *
 * Field-level errors (`{ email: "Invalid email address" }`) become the
 * description, since the value the user typed is what they need to fix.
 */
export function toastApiError(error, fallback = "Something went wrong") {
  const fieldErrors = error?.fieldErrors;
  const description = fieldErrors
    ? Object.values(fieldErrors).join(" · ")
    : undefined;

  return gooeyToast.error(error?.message ?? fallback, {
    description,
    duration: TOAST_DURATION.long,
    classNames: BASE_CLASS_NAMES,
  });
}

/**
 * In development the API returns the one-time code in `devCode`, because no
 * SMTP is configured. Surfacing it means the OTP screens are usable without a
 * mailbox. It never appears once SMTP is set, and the API refuses to start in
 * production without it.
 */
export function toastDevCode(payload) {
  const devCode = payload?.devCode;
  if (!devCode?.code) return undefined;

  return gooeyToast.info(`Development code: ${devCode.code}`, {
    description: "Returned by the API because SMTP is not configured.",
    duration: TOAST_DURATION.devCode,
    classNames: BASE_CLASS_NAMES,
  });
}
