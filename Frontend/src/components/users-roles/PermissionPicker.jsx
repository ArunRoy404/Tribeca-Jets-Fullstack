"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Lock, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TableStatus from "@/components/table/common/TableStatus";
import { useRoleDefaults } from "@/hooks/users";
import {
  Action,
  bySection,
  defaultsFrom,
  dependantsOf,
  formatReach,
  grantModule,
  revokeModule,
  sameGrants,
  toggleAction,
} from "@/lib/access";
import { formatUserRole } from "@/lib/user";
import { cn } from "@/lib/utils";


const labelsOf = (modules, keys) =>
  keys.map((key) => modules?.find((m) => m.module === key)?.label ?? key).join(", ");

/**
 * One person's permissions, module by module (owner's design, 7 Oct 2026).
 *
 * Tick a module and its actions open beneath it, starting from the role's
 * defaults. What the role can never hold is shown locked rather than hidden,
 * so the form explains itself. Ticking a module that needs another (Quotes
 * needs Clients) turns that one on too and says so; a module another one
 * needs cannot be turned off until that one is.
 *
 * `value` / `onChange` carry the API's payload shape, `{ MODULE: [ACTION] }`.
 * With `readOnly` it shows only what is granted — the detail sheet's tab.
 * Editing, each sidebar section folds and says how many of its modules are
 * on, so the whole set reads at a glance.
 */
export default function PermissionPicker({ role, value, onChange, readOnly = false }) {
  const { data, isPending, error, refetch } = useRoleDefaults(role);
  const modules = data?.modules;
  const roleName = formatUserRole(role);
  const defaults = useMemo(() => defaultsFrom(modules), [modules]);
  const [notice, setNotice] = useState(null);
  // Which sections are unfolded. Local and disposable: nothing else reads it.
  const [openSections, setOpenSections] = useState(() => new Set());

  if (!modules) {
    return <TableStatus isLoading={isPending} error={error} onRetry={refetch} />;
  }

  const grants = value ?? {};
  const isDefault = sameGrants(grants, defaults);

  const toggleModule = (definition, on) => {
    if (on) {
      const { grants: next, added } = grantModule(grants, modules, definition.module);
      onChange?.(next);
      setNotice(
        added.length
          ? { tone: "info", text: `${definition.label} needs ${labelsOf(modules, added)}, so ${added.length > 1 ? "those were" : "that was"} turned on too (view only).` }
          : null,
      );
      return;
    }
    const dependants = dependantsOf(grants, modules, definition.module);
    if (dependants.length) {
      setNotice({
        tone: "warning",
        text: `${labelsOf(modules, dependants)} ${dependants.length > 1 ? "need" : "needs"} ${definition.label}. Turn ${dependants.length > 1 ? "those" : "it"} off first.`,
      });
      return;
    }
    setNotice(null);
    onChange?.(revokeModule(grants, definition.module));
  };

  const shown = readOnly
    ? bySection(modules.filter((m) => grants[m.module]?.length))
    : bySection(modules);
  const allOpen = shown.every((section) => openSections.has(section.label));
  const setSectionOpen = (label, open) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) next.add(label);
      else next.delete(label);
      return next;
    });

  return (
    <div className="flex flex-col gap-3 w-full">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-montserrat text-[12px] text-muted-foreground">
            {isDefault ? `${roleName} defaults` : `Adjusted for this person — ${roleName} defaults changed`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenSections(allOpen ? new Set() : new Set(shown.map((section) => section.label)))}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
            {!isDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setNotice(null);
                  onChange?.(defaults);
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset to {roleName} defaults
              </Button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div
          className={cn(
            "flex gap-2 items-start rounded-sm border p-3",
            notice.tone === "warning" ? "border-warning/30 bg-warning/10" : "border-purple/20 bg-purple/5",
          )}
        >
          <AlertTriangle className={cn("size-4 shrink-0 mt-0.5", notice.tone === "warning" ? "text-warning" : "text-purple")} />
          <p className="font-montserrat text-[12px] text-foreground leading-relaxed">{notice.text}</p>
        </div>
      )}

      {readOnly && !shown.length && (
        <p className="font-montserrat text-[12px] text-muted-foreground">No modules granted.</p>
      )}

      {shown.map((section) => {
        const rows = section.modules.map((definition) => (
          <ModuleRow
            key={definition.module}
            definition={definition}
            actions={grants[definition.module]}
            roleName={roleName}
            readOnly={readOnly}
            onToggle={(on) => toggleModule(definition, on)}
            onToggleAction={(action) => {
              setNotice(null);
              onChange?.(toggleAction(grants, modules, definition.module, action));
            }}
          />
        ));

        if (readOnly) {
          return (
            <div key={section.label} className="flex flex-col gap-2">
              <h4 className="font-montserrat font-bold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">
                {section.label}
              </h4>
              {rows}
            </div>
          );
        }

        const available = section.modules.filter((m) => m.available);
        const on = available.filter((m) => grants[m.module]?.length).length;
        const unavailable = section.modules.length - available.length;
        return (
          <Collapsible
            key={section.label}
            open={openSections.has(section.label)}
            onOpenChange={(open) => setSectionOpen(section.label, open)}
            className="group/section rounded-sm border border-border bg-white"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors">
              <ChevronDown className="size-4 text-muted-foreground transition-transform -rotate-90 group-data-open/section:rotate-0" />
              <span className="font-montserrat font-bold text-[12px] uppercase tracking-wider text-foreground">
                {section.label}
              </span>
              <span className="ml-auto font-montserrat text-[11px] text-muted-foreground text-right">
                {available.length ? `${on} of ${available.length} on` : "Not available"}
                {available.length && unavailable ? ` · ${unavailable} not available` : ""}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-2 p-3 pt-1">{rows}</div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function ModuleRow({ definition, actions, roleName, readOnly, onToggle, onToggleAction }) {
  const granted = Boolean(actions?.length);
  const held = new Set(actions ?? []);

  if (!definition.available) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-sm border border-dashed border-border px-3 py-2.5 bg-secondary/40">
        <span className="flex items-center gap-2 font-montserrat font-medium text-[13px] text-muted-foreground">
          <Lock className="size-3.5" />
          {definition.label}
        </span>
        <span className="font-montserrat text-[11px] text-muted-foreground">Not available for {roleName}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-sm border px-3 py-2.5 transition-colors", granted ? "border-purple/30 bg-purple/5" : "border-border bg-white")}>
      <div className="flex items-center justify-between gap-2">
        <label className={cn("flex items-center gap-2.5 min-w-0", !readOnly && "cursor-pointer")}>
          {!readOnly && <Checkbox checked={granted} onCheckedChange={(checked) => onToggle(Boolean(checked))} />}
          <span className="font-montserrat font-semibold text-[13px] text-foreground truncate">{definition.label}</span>
        </label>
        <Badge tone="outline" size="sm" className="text-[10px] shrink-0">
          {formatReach(definition.reach)}
        </Badge>
      </div>

      {granted && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2.5 mt-2.5 border-t border-border/60">
          {definition.actions.map((item) => {
            if (readOnly && !held.has(item.action)) return null;
            if (item.locked) {
              return (
                <span
                  key={item.action}
                  title={`A ${roleName} can never have this`}
                  className="flex items-center gap-1.5 font-montserrat text-[12px] text-muted-foreground/70"
                >
                  <Lock className="size-3" />
                  {item.label}
                </span>
              );
            }
            if (readOnly) {
              return (
                <span key={item.action} className="flex items-center gap-1.5 font-montserrat text-[12px] text-foreground">
                  <Check className="size-3.5 text-success" />
                  {item.label}
                </span>
              );
            }
            // VIEW comes with the module: unticking it is unticking the module.
            const isView = item.action === Action.VIEW;
            return (
              <label key={item.action} className={cn("flex items-center gap-1.5 font-montserrat text-[12px] text-foreground", !isView && "cursor-pointer")}>
                <Checkbox
                  checked={held.has(item.action)}
                  disabled={isView}
                  onCheckedChange={() => onToggleAction(item.action)}
                />
                {item.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
