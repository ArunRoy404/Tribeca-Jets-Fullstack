"use client";

import { useSettingsSection } from "@/hooks/settings";
import {
  CODE_ATTEMPT_LIMIT_OPTIONS,
  CODE_SEND_LIMIT_OPTIONS,
  CODE_SEND_WINDOW_OPTIONS,
  FAILED_SIGN_IN_LIMIT_OPTIONS,
  FAILED_SIGN_IN_SCOPE_HINTS,
  FAILED_SIGN_IN_SCOPE_OPTIONS,
  FAILED_SIGN_IN_WINDOW_OPTIONS,
  NEVER,
  SIGN_IN_LOCKOUT_OPTIONS,
} from "@/lib/settings";
import SettingsCard from "../SettingsCard";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";
import SettingsSectionStatus from "../SettingsSectionStatus";

/** A line under a choice: what it means, or — for "Never" — what it gives up. */
function Hint({ children, warning }) {
  return (
    <p
      className={`font-montserrat text-[12px] leading-normal ${warning ? "text-destructive" : "text-muted-foreground"}`}
    >
      {children}
    </p>
  );
}

/** Greys out the choices that a "Never" makes irrelevant, keeping their values. */
function DependsOn({ active, children }) {
  return (
    <div
      aria-disabled={!active}
      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 w-full transition-opacity duration-300 ${
        active ? "" : "opacity-50 pointer-events-none select-none"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Settings › Rate Limiting (owner's decision, 15 Oct 2026). Only failures
 * and emailed codes are limited; a correct sign-in, for any role, never is —
 * and it clears the count. The server reads these on the next attempt.
 */
export default function RateLimitsSection() {
  const {
    values: limits,
    set,
    save,
    isDirty,
    isSaving,
    canEdit,
    isPending,
    error,
    refetch,
  } = useSettingsSection("rateLimits");

  if (isPending || error) return <SettingsSectionStatus isPending={isPending} error={error} onRetry={refetch} />;

  const signInLimited = limits?.failedSignInLimit !== NEVER;
  const codesLimited = limits?.codeSendLimit !== NEVER;

  return (
    <>
      <SettingsCard
        title="Failed sign-ins"
        description="Only a wrong password counts. A correct sign-in is never limited, however often someone signs in or switches accounts, and it clears the count. While sign-in is paused, every attempt is refused — the right password too — and the screen says how long to wait."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsSelect
            label="Pause sign-in after"
            value={limits?.failedSignInLimit}
            onChange={set("failedSignInLimit")}
            disabled={!canEdit}
            options={FAILED_SIGN_IN_LIMIT_OPTIONS}
          />
          <SettingsSelect
            label="Counted"
            value={limits?.failedSignInWindowMinutes}
            onChange={set("failedSignInWindowMinutes")}
            disabled={!canEdit || !signInLimited}
            options={FAILED_SIGN_IN_WINDOW_OPTIONS}
          />
        </div>
        {signInLimited ? null : (
          <Hint warning>Never: anyone can keep guessing a password without being slowed down.</Hint>
        )}
        <DependsOn active={signInLimited}>
          <SettingsSelect
            label="Pause for"
            value={limits?.signInLockoutMinutes}
            onChange={set("signInLockoutMinutes")}
            disabled={!canEdit || !signInLimited}
            options={SIGN_IN_LOCKOUT_OPTIONS}
          />
          <SettingsSelect
            label="Count failures for"
            value={limits?.failedSignInScope}
            onChange={set("failedSignInScope")}
            disabled={!canEdit || !signInLimited}
            options={FAILED_SIGN_IN_SCOPE_OPTIONS}
          />
        </DependsOn>
        {signInLimited ? <Hint>{FAILED_SIGN_IN_SCOPE_HINTS[limits?.failedSignInScope]}</Hint> : null}
        <Hint>
          The same limit applies to a wrong current password on My Account (changing the password, turning
          two-factor on or off), counted separately from sign-in.
        </Hint>
      </SettingsCard>

      <SettingsCard
        title="Verification codes"
        description="The 6-digit codes emailed for two-factor sign-in and password reset. Resends and reset codes are counted per email address; the code a correct sign-in sends is not."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsSelect
            label="Codes an address can request"
            value={limits?.codeSendLimit}
            onChange={set("codeSendLimit")}
            disabled={!canEdit}
            options={CODE_SEND_LIMIT_OPTIONS}
          />
          <SettingsSelect
            label="Counted"
            value={limits?.codeSendWindowMinutes}
            onChange={set("codeSendWindowMinutes")}
            disabled={!canEdit || !codesLimited}
            options={CODE_SEND_WINDOW_OPTIONS}
          />
        </div>
        {codesLimited ? null : (
          <Hint warning>Never: one address can be sent any number of emails.</Hint>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsSelect
            label="A code stops working after"
            value={limits?.codeAttemptLimit}
            onChange={set("codeAttemptLimit")}
            disabled={!canEdit}
            options={CODE_ATTEMPT_LIMIT_OPTIONS}
          />
        </div>
        {limits?.codeAttemptLimit === NEVER ? (
          <Hint warning>Never: a code can be guessed at until it expires.</Hint>
        ) : (
          <Hint>After that many wrong guesses the person asks for a new code.</Hint>
        )}
        {canEdit ? (
          <SettingsButton primary disabled={!isDirty || isSaving} onClick={save}>
            {isSaving ? "Saving…" : "Save Rate Limits"}
          </SettingsButton>
        ) : null}
      </SettingsCard>
    </>
  );
}
