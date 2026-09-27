"use client";

import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { COMMISSION_BASES, formatCommissionBasis } from "@/lib/commission";

const NOT_SET = "Not set";
const BASIS_LABELS = [NOT_SET, ...COMMISSION_BASES.map(formatCommissionBasis)];
const BASIS_BY_LABEL = Object.fromEntries(COMMISSION_BASES.map((basis) => [formatCommissionBasis(basis), basis]));

/** The three form keys this section owns, blank when nothing is set. */
export function commissionTermsForm(user) {
  return {
    commissionBasis: user?.commissionBasis ?? "",
    commissionPercentage: user?.commissionPercentage ?? "",
    commissionAmount: user?.commissionAmount ?? "",
  };
}

/**
 * Client-side checks mirroring the API's: a percentage of profit needs its
 * percentage (0.01–100), a flat fee its amount. Custom has no standing figure —
 * it is agreed per referral, on the commission itself.
 */
export function commissionTermsErrors(form) {
  const errors = {};
  if (form.commissionBasis === "PERCENT_OF_PROFIT") {
    const value = Number(form.commissionPercentage);
    if (form.commissionPercentage === "" || !Number.isFinite(value) || value < 0.01 || value > 100) {
      errors.commissionPercentage = "Enter a percentage between 0.01 and 100";
    }
  }
  if (form.commissionBasis === "FLAT_FEE") {
    const value = Number(form.commissionAmount);
    if (form.commissionAmount === "" || !Number.isFinite(value) || value < 0.01) {
      errors.commissionAmount = "Enter the fee";
    }
  }
  return errors;
}

/**
 * The terms as the API takes them: the basis plus only the figure that basis
 * uses, the other cleared. `null` basis clears the structure (on edit).
 */
export function commissionTermsPayload(form, { editing = false } = {}) {
  const basis = form.commissionBasis || null;
  if (!basis) return editing ? { commissionBasis: null } : {};
  return {
    commissionBasis: basis,
    commissionPercentage: basis === "PERCENT_OF_PROFIT" ? Number(form.commissionPercentage) : editing ? null : undefined,
    commissionAmount: basis === "FLAT_FEE" ? Number(form.commissionAmount) : editing ? null : undefined,
  };
}

/** Whether the terms in `form` differ from what `user` has on file. */
export function commissionTermsChanged(form, user) {
  const before = commissionTermsForm(user);
  const same = (a, b) => String(a ?? "") === String(b ?? "");
  if (!same(form.commissionBasis, before.commissionBasis)) return true;
  if (form.commissionBasis === "PERCENT_OF_PROFIT") return !same(form.commissionPercentage, before.commissionPercentage);
  if (form.commissionBasis === "FLAT_FEE") return !same(form.commissionAmount, before.commissionAmount);
  return false;
}

/**
 * A referral agent's standard commission (client adjustment #11: "Admin should
 * be able to assign a different commission structure to each referral agent —
 * percentage of Tribeca profit, flat fee, custom"). Copied onto each
 * commission the agent's referrals raise; changing it later never rewrites a
 * commission already raised. Rendered only for the Referral Agent role.
 */
export default function CommissionTermsFields({ form, setField, errors = {}, fieldClassName, labelClassName }) {
  const basis = form.commissionBasis;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border bg-secondary/40 p-4">
      <div className="flex flex-col gap-1">
        <p className="font-montserrat font-semibold text-[14px] text-foreground">Standard commission</p>
        <p className="font-montserrat text-[12px] text-muted-foreground">
          Applied to each trip this agent&apos;s referrals book. A different amount can still be agreed on a
          particular commission.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Structure" labelClassName={labelClassName} error={errors.commissionBasis}>
          <PickerSelect
            value={basis ? formatCommissionBasis(basis) : NOT_SET}
            onChange={(label) => setField("commissionBasis")(BASIS_BY_LABEL[label] ?? "")}
            options={BASIS_LABELS}
            placeholder="Select structure"
            className={fieldClassName}
          />
        </FormField>
        {basis === "PERCENT_OF_PROFIT" && (
          <FormField label="Percentage of profit (%)" labelClassName={labelClassName} error={errors.commissionPercentage}>
            <Input
              className={fieldClassName}
              type="number"
              min={0.01}
              max={100}
              step="0.01"
              placeholder="e.g. 10"
              value={form.commissionPercentage}
              onChange={(e) => setField("commissionPercentage")(e.target.value)}
            />
          </FormField>
        )}
        {basis === "FLAT_FEE" && (
          <FormField label="Fee per trip (USD)" labelClassName={labelClassName} error={errors.commissionAmount}>
            <Input
              className={fieldClassName}
              type="number"
              min={0.01}
              step="0.01"
              placeholder="e.g. 1500"
              value={form.commissionAmount}
              onChange={(e) => setField("commissionAmount")(e.target.value)}
            />
          </FormField>
        )}
      </div>
    </div>
  );
}
