"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Pencil, UserPlus, Info, Eye, EyeOff, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DetailHeader from "@/components/common/DetailHeader";
import FormPageTitle from "@/components/common/FormPageTitle";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { useInviteUser, useRoleDefaults, useUpdateUser } from "@/hooks/users";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useUnsavedChangesGuard } from "@/hooks/common/useUnsavedChangesGuard";
import PermissionPicker from "@/components/users-roles/PermissionPicker";
import RoleBadge from "@/components/users-roles/RoleBadge";
import CommissionTermsFields, {
  commissionTermsChanged,
  commissionTermsErrors,
  commissionTermsForm,
  commissionTermsPayload,
} from "@/components/users-roles/CommissionTermsFields";
import { Action, Module, defaultsFrom, grantsFromPermissions, sameGrants } from "@/lib/access";
import { REFERRAL_AGENT } from "@/lib/roles";
import {
  ASSIGNABLE_ROLES,
  MANAGEABLE_STATUSES,
  formatUserRole,
  formatUserStatus,
  isPendingInvite,
} from "@/lib/user";

const USERS_HOME = "/dashboard/users-roles";
const DISCARD_TITLE = "Discard your changes to this team member?";
const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const ROLE_LABELS = ASSIGNABLE_ROLES.map(formatUserRole);
const ROLE_BY_LABEL = Object.fromEntries(ASSIGNABLE_ROLES.map((role) => [formatUserRole(role), role]));
const STATUS_LABELS = MANAGEABLE_STATUSES.map(formatUserStatus);
const STATUS_BY_LABEL = Object.fromEntries(MANAGEABLE_STATUSES.map((status) => [formatUserStatus(status), status]));

const EMPTY_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  role: "BROKER",
  status: "ACTIVE",
  // Null means "the role's defaults", resolved once they load.
  permissions: null,
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
  return {
    ...EMPTY_FORM,
    ...splitName(editingUser?.name),
    email: editingUser?.email ?? "",
    phone: editingUser?.phone ?? "",
    role: editingUser?.role ?? "BROKER",
    status: editingUser?.rawStatus ?? "ACTIVE",
    permissions: grantsFromPermissions(editingUser?.permissions),
    ...commissionTermsForm(editingUser),
  };
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-white p-4 sm:p-6 shadow-card min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-purple" />
        <h2 className="font-montserrat font-bold text-[16px] text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Note({ tone = "info", children }) {
  return (
    <div
      className={
        tone === "warning"
          ? "flex gap-2 items-start rounded-sm border border-warning/30 bg-warning/10 p-3"
          : "flex gap-2 items-start rounded-sm border border-border bg-secondary/40 p-3"
      }
    >
      <Info className={`size-4 shrink-0 mt-0.5 ${tone === "warning" ? "text-warning" : "text-purple"}`} />
      <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

/**
 * Invite a team member, or edit one — a full page rather than a dialog, since
 * the permissions alone run to 25 modules (owner's decision, 7 Oct 2026).
 *
 * Details on the left, permissions on the right (stacked on a phone), Save in
 * the header that stays in view. Leaving with unsaved changes asks first.
 *
 * **Inviting sets the first password** (6 Oct 2026): the invitation email
 * carries it, and the first sign-in activates the account. **Permissions are
 * per person** (7 Oct 2026): picking a role loads its defaults, and someone
 * holding Users & Roles · Change roles & permissions adjusts them for this one
 * account. Changing an existing person's role resets them to the new role's
 * defaults, said on screen before anything is saved. Nobody edits their own,
 * and the owner's are fixed.
 */
export default function UserForm({ editingUser = null }) {
  const router = useRouter();
  const invite = useInviteUser();
  const update = useUpdateUser();
  const { data: me } = useCurrentUser();
  const { canAccess } = usePermissions();

  const isEditing = Boolean(editingUser);
  const isSelf = isEditing && editingUser?.id === me?.id;
  const isOwner = editingUser?.role === "SUPER_ADMIN";
  // Role and permissions are one right on the API: changing either needs
  // Change roles & permissions, never your own, never the owner's.
  const mayManageAccess = canAccess(Module.USERS, Action.MANAGE_ACCESS) && !isSelf && !isOwner;
  const showRole = isEditing ? mayManageAccess : true;
  // An outstanding invitation has no status to set: the account activates
  // itself on the first sign-in, and the API refuses the change.
  const isInvited = isPendingInvite(editingUser?.rawStatus);

  const mutation = isEditing ? update : invite;
  const [initial] = useState(() => initialForm(editingUser));
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const fieldErrors = { ...(mutation?.error?.fieldErrors ?? {}), ...localErrors };

  const { data: roleView } = useRoleDefaults(form.role);
  const roleDefaults = useMemo(() => defaultsFrom(roleView?.modules), [roleView?.modules]);
  const permissions = form.permissions ?? roleDefaults;
  const roleChanged = isEditing && form.role !== editingUser?.role;

  // Commission terms belong to a referral agent only (#11); the API refuses
  // them on any other role and clears them when an agent's role changes.
  const isAgent = form.role === REFERRAL_AGENT;

  // Unsaved work is asked about before the tab closes or any link leaves the
  // page. The flag drops once a save succeeds, so leaving afterwards is never
  // questioned.
  const [saved, setSaved] = useState(false);
  const dirty = !saved && JSON.stringify(form) !== JSON.stringify(initial);
  const guard = useUnsavedChangesGuard(dirty, { title: DISCARD_TITLE });

  const leave = () => guard.requestLeave(USERS_HOME);
  const done = () => {
    setSaved(true);
    router.push(USERS_HOME);
  };

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

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
          ...(showRole ? { role: form.role } : {}),
          // Omitted entirely for a pending invitation — see `isInvited`.
          ...(isInvited ? {} : { status: form.status }),
        }).filter(([key, value]) => value !== (original[key] ?? "")),
      );
      // The terms travel together — the API needs the basis with its figure —
      // and only when they changed, so an unrelated edit leaves them alone.
      if (isAgent && commissionTermsChanged(form, editingUser)) {
        Object.assign(changed, commissionTermsPayload(form, { editing: true }));
      }
      // The whole set, and only when it moved — a role change always sends
      // it, so the server saves exactly what the form showed. Not before the
      // role's defaults have loaded: an empty set would save "no access", and
      // left out, the server resets a changed role itself.
      if (
        mayManageAccess &&
        roleView &&
        (roleChanged || !sameGrants(permissions, grantsFromPermissions(editingUser?.permissions)))
      ) {
        changed.permissions = permissions;
      }
      if (!Object.keys(changed).length) {
        done();
        return;
      }
      update.mutate({ id: editingUser?.id, ...changed }, { onSuccess: done });
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
        // Omitted until the defaults load — the server then applies them.
        ...(mayManageAccess && roleView ? { permissions } : {}),
        ...(isAgent ? commissionTermsPayload(form) : {}),
      },
      { onSuccess: done },
    );
  };

  const title = isEditing ? `Edit ${editingUser?.name ?? "team member"}` : "Invite New User";
  const description = isEditing
    ? "Their details, role, status and what they may do in each module."
    : "Their details, a first password for the invitation email, and what they may do.";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full bg-page-bg min-h-screen">
      <DetailHeader
        // Stays under the sticky top bar, so Save is always in reach while
        // the permissions scroll.
        className="sticky top-[57px] sm:top-[65px] z-20"
        breadcrumbs={[
          { label: "System" },
          { label: "Users & Roles", href: USERS_HOME },
          { label: isEditing ? "Edit user" : "Invite user" },
        ]}
        titleContent={<FormPageTitle backUrl={USERS_HOME} title={title} description={description} />}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={leave}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4" disabled={mutation?.isPending}>
              {isEditing ? <Pencil className="size-4" /> : <UserPlus className="size-4" />}
              {mutation?.isPending
                ? isEditing
                  ? "Saving…"
                  : "Inviting…"
                : isEditing
                  ? "Save Changes"
                  : "Send Invitation"}
            </Button>
          </div>
        }
      />

      {/* Server-side refusals — self-demotion, the owner account, the last
          administrator — arrive as a plain message rather than a field error. */}
      {mutation?.error && !Object.keys(fieldErrors).length && (
        <p className="mx-4 md:mx-6 mt-4 font-montserrat text-[13px] text-destructive">{mutation.error.message}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 md:gap-6 p-4 md:p-6 items-start">
        <Panel icon={UserRound} title="Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" labelClassName={LABEL_CLASS} error={fieldErrors?.firstName}>
              <Input
                className={FIELD_CLASS}
                placeholder="Avery"
                value={form.firstName}
                onChange={(e) => setField("firstName")(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Last Name" labelClassName={LABEL_CLASS} error={fieldErrors?.lastName}>
              <Input
                className={FIELD_CLASS}
                placeholder="Newman"
                value={form.lastName}
                onChange={(e) => setField("lastName")(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Email Address" labelClassName={LABEL_CLASS} error={fieldErrors?.email}>
            <Input
              className={FIELD_CLASS}
              placeholder="broker@tribecajets.com"
              type="email"
              value={form.email}
              onChange={(e) => setField("email")(e.target.value)}
              // The login identity and the anchor of the audit trail, so the
              // API does not accept a change to it.
              disabled={isEditing}
              required
            />
          </FormField>

          <FormField label="Phone (Optional)" labelClassName={LABEL_CLASS} error={fieldErrors?.phone}>
            <Input
              className={FIELD_CLASS}
              placeholder="+1 555 0163"
              value={form.phone}
              onChange={(e) => setField("phone")(e.target.value)}
            />
          </FormField>

          {!isEditing && (
            <FormField label="Password" labelClassName={LABEL_CLASS} error={fieldErrors?.password}>
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
            {showRole ? (
              <FormField label="Role" labelClassName={LABEL_CLASS} error={fieldErrors?.role}>
                <PickerSelect
                  value={formatUserRole(form.role)}
                  onChange={(label) =>
                    // A new role starts from its own defaults: the old role's
                    // ticks may hold what this one can never have. Back to
                    // their own role brings back their own set.
                    setForm((prev) => {
                      const role = ROLE_BY_LABEL[label] ?? "BROKER";
                      const own = isEditing && role === editingUser?.role;
                      return { ...prev, role, permissions: own ? grantsFromPermissions(editingUser?.permissions) : null };
                    })
                  }
                  options={ROLE_LABELS}
                  placeholder="Select Role"
                  className={FIELD_CLASS}
                />
              </FormField>
            ) : (
              <FormField label="Role" labelClassName={LABEL_CLASS}>
                <div className="h-13 flex items-center">
                  <RoleBadge role={form.role} />
                </div>
              </FormField>
            )}

            {isEditing && !isInvited && !isSelf && (
              <FormField label="Status" labelClassName={LABEL_CLASS} error={fieldErrors?.status}>
                <PickerSelect
                  value={formatUserStatus(form.status)}
                  onChange={(label) => setField("status")(STATUS_BY_LABEL[label] ?? "ACTIVE")}
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
            <Note>
              This invitation is still <span className="font-semibold text-foreground">pending</span>, so its status
              cannot be changed here. The account becomes <span className="font-semibold text-foreground">Active</span>{" "}
              the first time they sign in.
            </Note>
          )}

          {!isEditing && (
            <Note>
              The invitation email gives them this password, and they can sign in right away. The account shows as{" "}
              <span className="font-semibold text-foreground">Invited</span> until their first sign-in, then turns{" "}
              <span className="font-semibold text-foreground">Active</span>. They can change the password from My
              Account.
            </Note>
          )}
        </Panel>

        <Panel icon={ShieldCheck} title="Permissions">
          {mayManageAccess ? (
            <>
              {roleChanged && (
                <Note tone="warning">
                  Changing the role from {formatUserRole(editingUser?.role)} to {formatUserRole(form.role)} resets
                  their permissions to the {formatUserRole(form.role)} defaults below. Review them, then save.
                </Note>
              )}
              <PermissionPicker
                key={form.role}
                role={form.role}
                value={permissions}
                onChange={setField("permissions")}
              />
              {fieldErrors?.permissions && (
                <p className="font-montserrat text-[12px] text-destructive">{fieldErrors.permissions}</p>
              )}
            </>
          ) : (
            <>
              <Note>
                {isOwner
                  ? "The owner account always has every permission, and its role cannot change."
                  : isSelf
                    ? "You cannot change your own role or permissions. Ask another administrator."
                    : isEditing
                      ? "Changing permissions needs Users & Roles · Change roles & permissions."
                      : `They start with the ${formatUserRole(form.role)} defaults. Changing them needs Users & Roles · Change roles & permissions.`}
              </Note>
              <PermissionPicker key={form.role} role={form.role} value={permissions} readOnly />
            </>
          )}
        </Panel>
      </div>

      <ConfirmDialog {...guard.dialog} />
    </form>
  );
}
