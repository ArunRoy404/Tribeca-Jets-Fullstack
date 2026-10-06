"use client";

import { useState } from "react";
import { X, Pencil, UserPlus, Info, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { useInviteUser, useUpdateUser } from "@/hooks/users";
import CommissionTermsFields, {
  commissionTermsChanged,
  commissionTermsErrors,
  commissionTermsForm,
  commissionTermsPayload,
} from "@/components/users-roles/CommissionTermsFields";
import { REFERRAL_AGENT } from "@/lib/roles";
import {
  ASSIGNABLE_ROLES,
  MANAGEABLE_STATUSES,
  formatUserRole,
  formatUserStatus,
  isPendingInvite,
} from "@/lib/user";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const ROLE_LABELS = ASSIGNABLE_ROLES.map(formatUserRole);
const ROLE_BY_LABEL = Object.fromEntries(
  ASSIGNABLE_ROLES.map((role) => [formatUserRole(role), role]),
);
const STATUS_LABELS = MANAGEABLE_STATUSES.map(formatUserStatus);
const STATUS_BY_LABEL = Object.fromEntries(
  MANAGEABLE_STATUSES.map((status) => [formatUserStatus(status), status]),
);

const EMPTY_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  role: "BROKER",
  status: "ACTIVE",
  ...commissionTermsForm(null),
};

const PASSWORD_ALPHABETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*?"];

/**
 * A strong password that already meets the API's policy (10+ characters, an
 * uppercase and a lowercase letter, a number). Look-alike characters (O/0,
 * l/1) are left out, because the invitee may have to type it from an email.
 */
function generatePassword(length = 14) {
  const pick = (alphabet) => alphabet[crypto.getRandomValues(new Uint32Array(1))[0] % alphabet.length];
  const all = PASSWORD_ALPHABETS.join("");
  const chars = [...PASSWORD_ALPHABETS.map(pick), ...Array.from({ length: length - PASSWORD_ALPHABETS.length }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Splits a display name back into the two fields the API takes. */
function splitName(name) {
  const [firstName = "", ...rest] = (name ?? "").split(" ");
  return { firstName, lastName: rest.join(" ") };
}

function initialForm(editingUser) {
  if (!editingUser) return EMPTY_FORM;
  const { firstName, lastName } = splitName(editingUser?.name);
  return {
    email: editingUser?.email ?? "",
    firstName,
    lastName,
    phone: editingUser?.phone ?? "",
    role: editingUser?.role ?? "BROKER",
    status: editingUser?.rawStatus ?? "ACTIVE",
    ...commissionTermsForm(editingUser),
  };
}

/**
 * Invite a new team member, or edit an existing one.
 *
 * **Inviting sets the first password** (owner's decision, 6 Oct 2026): the
 * invitation email carries it, and the invitee signs in with it straight
 * away. Editing has no password field — a person changes their own from
 * My Account.
 */
export default function InviteUserDialog() {
  const open = useUsersRolesStore((s) => s.inviteModalOpen);
  const close = useUsersRolesStore((s) => s.closeInviteModal);
  const editingUser = useUsersRolesStore((s) => s.editingUser);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {/*
          Keyed so the form remounts with fresh state whenever the dialog opens
          on a different user. React's own answer to "reset state when a prop
          changes" — an effect calling setState would work, but it renders once
          with the previous user's values before correcting itself.
        */}
        {open && (
          <UserForm
            key={editingUser?.id ?? "new"}
            editingUser={editingUser}
            onDone={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UserForm({ editingUser, onDone }) {
  const invite = useInviteUser();
  const update = useUpdateUser();

  const isEditing = Boolean(editingUser);

  // An outstanding invitation has no status to set: the account activates
  // itself the first time the invitee signs in. The API refuses the change, so
  // the control is absent rather than present-and-failing.
  const isInvited = isPendingInvite(editingUser?.rawStatus);

  const mutation = isEditing ? update : invite;
  const [form, setForm] = useState(() => initialForm(editingUser));
  const [localErrors, setLocalErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const fieldErrors = { ...(mutation?.error?.fieldErrors ?? {}), ...localErrors };

  // Commission terms belong to a referral agent only (#11); the API refuses
  // them on any other role and clears them when an agent's role changes.
  const isAgent = form.role === REFERRAL_AGENT;

  const close = onDone;

  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e?.preventDefault();

    const termErrors = isAgent ? commissionTermsErrors(form) : {};
    setLocalErrors(termErrors);
    if (Object.keys(termErrors).length) return;

    if (isEditing) {
      // PATCH: send only what changed. The API rejects an empty body, and
      // resending every field would write an audit entry claiming a role
      // change that did not happen.
      const original = {
        ...splitName(editingUser?.name),
        phone: editingUser?.phone ?? "",
        role: editingUser?.role,
        status: editingUser?.rawStatus,
      };
      const changed = Object.fromEntries(
        Object.entries({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          role: form.role,
          // Omitted entirely for a pending invitation — see `isInvited`.
          ...(isInvited ? {} : { status: form.status }),
        }).filter(([key, value]) => value !== (original[key] ?? "")),
      );
      // The terms travel together — the API needs the basis with its figure —
      // and only when they changed, so an unrelated edit leaves them alone.
      if (isAgent && commissionTermsChanged(form, editingUser)) {
        Object.assign(changed, commissionTermsPayload(form, { editing: true }));
      }
      if (!Object.keys(changed).length) {
        close?.();
        return;
      }
      update.mutate({ id: editingUser?.id, ...changed }, { onSuccess: close });
      return;
    }

    invite.mutate(
      {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        ...(form.phone ? { phone: form.phone } : {}),
        password: form.password,
        role: form.role,
        ...(isAgent ? commissionTermsPayload(form) : {}),
      },
      { onSuccess: close },
    );
  };

  return (
    <>
      <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
          {isEditing ? "Edit Team Member" : "Invite New User"}
        </DialogTitle>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="First Name"
            labelClassName={LABEL_CLASS}
            error={fieldErrors?.firstName}
          >
            <Input
              className={FIELD_CLASS}
              placeholder="Avery"
              value={form.firstName}
              onChange={(e) => setField("firstName")(e.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Last Name"
            labelClassName={LABEL_CLASS}
            error={fieldErrors?.lastName}
          >
            <Input
              className={FIELD_CLASS}
              placeholder="Newman"
              value={form.lastName}
              onChange={(e) => setField("lastName")(e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField
          label="Email Address"
          labelClassName={LABEL_CLASS}
          error={fieldErrors?.email}
        >
          <Input
            className={FIELD_CLASS}
            placeholder="broker@tribecajets.com"
            type="email"
            value={form.email}
            onChange={(e) => setField("email")(e.target.value)}
            // Email is the login identity and the anchor of the audit trail,
            // so the API does not accept a change to it.
            disabled={isEditing}
            required
          />
        </FormField>

        <FormField
          label="Phone (Optional)"
          labelClassName={LABEL_CLASS}
          error={fieldErrors?.phone}
        >
          <Input
            className={FIELD_CLASS}
            placeholder="+1 555 0163"
            value={form.phone}
            onChange={(e) => setField("phone")(e.target.value)}
          />
        </FormField>

        {!isEditing && (
          <FormField
            label="Password"
            labelClassName={LABEL_CLASS}
            error={fieldErrors?.password}
          >
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Input
                  className={`${FIELD_CLASS} pr-11`}
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 10 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setField("password")(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-13 gap-2 px-4 shrink-0"
                onClick={() => {
                  setField("password")(generatePassword());
                  setShowPassword(true);
                }}
              >
                <RefreshCw className="size-4" />
                Generate
              </Button>
            </div>
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Role"
            labelClassName={LABEL_CLASS}
            error={fieldErrors?.role}
          >
            <PickerSelect
              value={formatUserRole(form.role)}
              onChange={(label) =>
                setField("role")(ROLE_BY_LABEL[label] ?? "BROKER")
              }
              options={ROLE_LABELS}
              placeholder="Select Role"
              className={FIELD_CLASS}
            />
          </FormField>

          {isEditing && !isInvited && (
            <FormField
              label="Status"
              labelClassName={LABEL_CLASS}
              error={fieldErrors?.status}
            >
              <PickerSelect
                value={formatUserStatus(form.status)}
                onChange={(label) =>
                  setField("status")(STATUS_BY_LABEL[label] ?? "ACTIVE")
                }
                options={STATUS_LABELS}
                placeholder="Select Status"
                className={FIELD_CLASS}
              />
            </FormField>
          )}
        </div>

        {isAgent && (
          <CommissionTermsFields
            form={form}
            setField={setField}
            errors={fieldErrors}
            fieldClassName={FIELD_CLASS}
            labelClassName={LABEL_CLASS}
          />
        )}

        {isInvited && (
          <div className="flex gap-2 items-start rounded-sm border border-border bg-secondary/40 p-3">
            <Info className="size-4 shrink-0 text-purple mt-0.5" />
            <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
              This invitation is still{" "}
              <span className="font-semibold text-foreground">pending</span>, so
              its status cannot be changed here. The account becomes{" "}
              <span className="font-semibold text-foreground">Active</span> the
              first time they sign in.
            </p>
          </div>
        )}

        {!isEditing && (
          <div className="flex gap-2 items-start rounded-sm border border-border bg-secondary/40 p-3">
            <Info className="size-4 shrink-0 text-purple mt-0.5" />
            <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
              The invitation email gives them this password, and they can sign
              in right away. The account shows as{" "}
              <span className="font-semibold text-foreground">Invited</span>{" "}
              until their first sign-in, then turns{" "}
              <span className="font-semibold text-foreground">Active</span>.
              They can change the password from My Account.
            </p>
          </div>
        )}

        {/* Server-side refusals — self-demotion, the owner account, the last
          administrator — arrive as a plain message rather than a field
          error, so they need somewhere to land. */}
        {mutation?.error && !Object.keys(fieldErrors).length && (
          <p className="font-montserrat text-[12px] text-destructive">
            {mutation.error.message}
          </p>
        )}

        <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
          <Button
            type="button"
            variant="outline"
            className="gap-2 px-4"
            onClick={close}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="gap-2 px-4"
            disabled={mutation?.isPending}
          >
            {isEditing ? (
              <Pencil className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {mutation?.isPending
              ? isEditing
                ? "Saving…"
                : "Inviting…"
              : isEditing
                ? "Save Changes"
                : "Send Invitation"}
          </Button>
        </div>
      </form>
    </>
  );
}
