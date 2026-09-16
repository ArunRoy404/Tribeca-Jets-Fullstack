"use client";

import { useState } from "react";
import { X, Pencil, UserPlus, Info } from "lucide-react";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { useInviteUser, useUpdateUser } from "@/hooks/users";
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
  role: "BROKER",
  status: "ACTIVE",
};

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
  };
}

/**
 * Invite a new team member, or edit an existing one.
 *
 * **No password field.** The previous version had one, but the API does not
 * accept a password on either path by design: an invited account is created
 * with an unusable random secret and the invitee sets their own through the
 * reset flow, so a credential is never chosen by or transmitted to whoever is
 * doing the inviting. A password box here could only ever be discarded.
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
  // itself when the invitee chooses a password. The API refuses the change, so
  // the control is absent rather than present-and-failing.
  const isInvited = isPendingInvite(editingUser?.rawStatus);

  const mutation = isEditing ? update : invite;
  const fieldErrors = mutation?.error?.fieldErrors ?? {};

  const [form, setForm] = useState(() => initialForm(editingUser));

  const close = onDone;

  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e?.preventDefault();

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
        role: form.role,
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

        {isInvited && (
          <div className="flex gap-2 items-start rounded-sm border border-border bg-secondary/40 p-3">
            <Info className="size-4 shrink-0 text-purple mt-0.5" />
            <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
              This invitation is still{" "}
              <span className="font-semibold text-foreground">pending</span>, so
              its status cannot be changed here. The account becomes{" "}
              <span className="font-semibold text-foreground">Active</span> the
              moment they set their password. To withdraw it, remove the user.
            </p>
          </div>
        )}

        {!isEditing && (
          <div className="flex gap-2 items-start rounded-sm border border-border bg-secondary/40 p-3">
            <Info className="size-4 shrink-0 text-purple mt-0.5" />
            <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
              No password is set here. The account is created as{" "}
              <span className="font-semibold text-foreground">Invited</span>,
              and they choose their own password from the sign-in page using
              &ldquo;Forgot password?&rdquo;.
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
