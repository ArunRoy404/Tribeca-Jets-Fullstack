"use client";

import { useRef, useState } from "react";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useCommitImport, useValidateImport } from "@/hooks/settings";
import { Action, Module } from "@/lib/access";
import {
  BACKUP_POLICY,
  EXPORT_SCOPES,
  IMPORT_ACCEPT,
  IMPORT_MAX_MB,
  IMPORT_TARGET_FIELDS,
  IMPORT_TYPES,
} from "@/lib/settings";
import { toastApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { settingsExportUrl } from "@/services/settings.service";
import SettingRow from "../SettingRow";
import SettingsButton from "../SettingsButton";
import SettingsCard from "../SettingsCard";
import SettingsPill from "../SettingsPill";
import SettingsSelect from "../SettingsSelect";

const SKIP = "__skip";

/** A source column matched to the target field with the same name, ignoring case and spacing. */
function guessTarget(column, targets) {
  const key = column.toLowerCase().replace(/[^a-z0-9]/g, "");
  return targets.find((target) => target.toLowerCase().replace(/[^a-z0-9]/g, "") === key) ?? SKIP;
}

/** The header row of a CSV, read in the browser. Quotes are honoured; nothing is uploaded. */
async function readCsvHeader(file) {
  const text = await file.slice(0, 64 * 1024).text();
  const line = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0] ?? "";
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells.filter(Boolean);
}

const STATUS_BADGE = {
  VALID: { label: "Valid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DUPLICATE: { label: "Duplicate (Skip)", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ERROR: { label: "Error (Skip)", className: "bg-red-50 text-red-700 border-red-200" },
};

/**
 * Data Import & Export (#31).
 *
 * - **Import** (`Settings · Edit`): upload a CSV or XLSX file, map columns to
 *   target CRM fields with `CommonSelect`, validate rows against required
 *   fields and existing CRM records, and commit valid non-duplicate rows.
 * - **Export** (`Settings · View`): download XLSX or CSV for one module, or a
 *   multi-sheet XLSX workbook for `All CRM Records`, optionally filtered by
 *   date range and `includeArchived`.
 */
export default function DataSection() {
  const { canAccess } = usePermissions();
  const canImport = canAccess(Module.SETTINGS, Action.EDIT);

  const [data, setData] = useState({
    importType: "CLIENTS",
    exportScope: "ALL",
    exportFrom: "",
    exportTo: "",
    includeArchived: false,
  });
  const set = (key) => (value) => setData((current) => ({ ...current, [key]: value }));

  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dragging, setDragging] = useState(false);
  const [validation, setValidation] = useState(null);
  const [lastImportResult, setLastImportResult] = useState(null);

  const validateMutation = useValidateImport();
  const commitMutation = useCommitImport();

  const targets = IMPORT_TARGET_FIELDS[data?.importType] ?? [];
  const targetOptions = [{ value: SKIP, label: "Don't import" }, ...targets.map((t) => ({ value: t, label: t }))];

  const pick = async (picked) => {
    if (!picked) return;
    const extension = picked.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx"].includes(extension)) {
      toastApiError({ message: "Use a CSV or XLSX file. Legacy .xls files are not accepted." });
      return;
    }
    if (picked.size > IMPORT_MAX_MB * 1024 * 1024) {
      toastApiError({ message: `That file is over ${IMPORT_MAX_MB} MB.` });
      return;
    }
    setFile(picked);
    setValidation(null);
    setLastImportResult(null);

    if (extension === "csv") {
      const header = await readCsvHeader(picked);
      setColumns(header);
      setMapping(Object.fromEntries(header.map((column) => [column, guessTarget(column, targets)])));
    } else {
      // For XLSX, let the server extract the workbook headers and initial mapping automatically.
      setColumns([]);
      setMapping({});
      validateMutation.mutate(
        { file: picked, type: data.importType },
        {
          onSuccess: (result) => {
            setColumns(result?.columns ?? []);
            setMapping(result?.mapping ?? {});
            setValidation(result);
          },
        },
      );
    }
  };

  const changeImportType = (type) => {
    set("importType")(type);
    setValidation(null);
    setLastImportResult(null);
    const nextTargets = IMPORT_TARGET_FIELDS[type] ?? [];
    setMapping(Object.fromEntries(columns.map((column) => [column, guessTarget(column, nextTargets)])));
  };

  const updateColumnMapping = (column, targetValue) => {
    setMapping((prev) => ({ ...prev, [column]: targetValue }));
    setValidation(null);
  };

  const handleValidate = () => {
    if (!file) return;
    validateMutation.mutate(
      {
        file,
        type: data.importType,
        mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
      },
      {
        onSuccess: (result) => {
          if (result?.columns?.length) setColumns(result.columns);
          if (result?.mapping) setMapping(result.mapping);
          setValidation(result);
        },
      },
    );
  };

  const handleCommit = () => {
    if (!file || !validation?.validCount) return;
    commitMutation.mutate(
      {
        file,
        type: data.importType,
        mapping,
      },
      {
        onSuccess: (result) => {
          setLastImportResult(result);
          setFile(null);
          setColumns([]);
          setMapping({});
          setValidation(null);
        },
      },
    );
  };

  const isAllScope = data.exportScope === "ALL";
  const hasInvalidDateSpan =
    Boolean(data.exportFrom && data.exportTo) && data.exportFrom > data.exportTo;

  const triggerExport = (format) => {
    if (format === "CSV" && isAllScope) return;
    if (hasInvalidDateSpan) {
      toastApiError({ message: "Start Date must be on or before End Date." });
      return;
    }
    const url = settingsExportUrl({
      scope: data.exportScope,
      format,
      from: data.exportFrom || undefined,
      to: data.exportTo || undefined,
      includeArchived: data.includeArchived,
    });
    window.location.assign(url);
  };

  return (
    <>
      {canImport ? (
        <SettingsCard
          title="Import CRM data"
          description="Upload a CSV or XLSX file, map source columns to CRM fields, validate rows, and commit new records."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <SettingsSelect
              label="Import Type"
              value={data?.importType}
              onChange={changeImportType}
              options={IMPORT_TYPES}
            />
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex flex-col items-center gap-2 w-full p-5 rounded-md border bg-surface text-center cursor-pointer transition-colors",
              dragging ? "border-signal bg-signal-soft" : "border-border hover:border-signal/50",
            )}
          >
            <span className="font-montserrat font-medium text-[14px] leading-normal text-foreground break-all">
              {file ? file.name : "Drop file here or browse"}
            </span>
            <span className="font-montserrat text-[11px] leading-normal text-muted-foreground">
              {file ? "Choose another file to replace it" : `CSV, XLSX • max ${IMPORT_MAX_MB} MB`}
            </span>
          </button>

          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center justify-between gap-2">
              <p className="font-montserrat font-semibold text-[13px] leading-normal text-foreground">
                Column mapping
              </p>
              <p className="font-montserrat text-[11px] text-muted-foreground">
                Target fields: {targets.join(", ")}
              </p>
            </div>
            {columns.length ? (
              columns.map((column) => (
                <div key={column} className="flex items-center gap-2 sm:gap-3 w-full">
                  <span className="flex-1 min-w-0 truncate rounded-md border border-border bg-surface px-3 py-2 font-montserrat text-[12px] leading-normal text-foreground">
                    {column}
                  </span>
                  <span className="font-montserrat font-medium text-[13px] text-muted-foreground shrink-0">→</span>
                  <div className="flex-1 min-w-0">
                    <CommonSelect
                      value={mapping[column] ?? SKIP}
                      onChange={(val) => updateColumnMapping(column, val)}
                      options={targetOptions}
                      className="w-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="font-montserrat text-[12px] leading-normal text-muted-foreground">
                {file
                  ? validateMutation.isPending
                    ? "Reading workbook columns…"
                    : "Click Validate Import to read columns from this file."
                  : "Choose a CSV or XLSX file to map its columns here."}
              </p>
            )}
          </div>

          {validation ? (
            <div className="flex flex-col gap-3 w-full rounded-md border border-border bg-surface/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-montserrat font-semibold text-[13px] text-foreground">
                  Validation summary ({validation.totalRows} {validation.totalRows === 1 ? "row" : "rows"})
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <SettingsPill tone="signal">{validation.validCount} valid to import</SettingsPill>
                  <SettingsPill>{validation.duplicateCount} duplicate(s) skipped</SettingsPill>
                  {validation.errorCount > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 font-montserrat text-[11px] font-medium text-red-700 border border-red-200">
                      {validation.errorCount} invalid row(s) skipped
                    </span>
                  ) : null}
                </div>
              </div>

              {validation.preview?.length > 0 ? (
                <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40 font-montserrat text-[11px] font-semibold text-muted-foreground">
                        <th className="py-2 px-3 w-16">Row</th>
                        <th className="py-2 px-3 w-36">Status</th>
                        <th className="py-2 px-3">Record</th>
                        <th className="py-2 px-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-montserrat text-[12px]">
                      {validation.preview.slice(0, 50).map((row) => {
                        const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.ERROR;
                        return (
                          <tr key={row.rowNumber}>
                            <td className="py-2 px-3 text-muted-foreground">#{row.rowNumber}</td>
                            <td className="py-2 px-3">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                  badge.className,
                                )}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-foreground">{row.summary || "—"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{row.reason || "Ready to import"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="font-montserrat text-[12px] text-muted-foreground">
                  The file contains a header row but no data rows.
                </p>
              )}
            </div>
          ) : null}

          {lastImportResult ? (
            <div className="flex items-center justify-between gap-3 w-full rounded-md border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <p className="font-montserrat text-[12px] font-medium text-emerald-900">
                Imported {lastImportResult.importedCount} {lastImportResult.type.toLowerCase()} record(s).{" "}
                {lastImportResult.duplicateCount || lastImportResult.errorCount
                  ? `(${lastImportResult.duplicateCount} duplicate, ${lastImportResult.errorCount} invalid skipped)`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <SettingsButton
              primary={!validation?.validCount}
              disabled={!file || validateMutation.isPending || commitMutation.isPending}
              onClick={handleValidate}
            >
              {validateMutation.isPending ? "Validating…" : "Validate Import"}
            </SettingsButton>

            {validation && validation.validCount > 0 ? (
              <SettingsButton
                primary
                disabled={commitMutation.isPending || validateMutation.isPending}
                onClick={handleCommit}
              >
                {commitMutation.isPending
                  ? "Importing…"
                  : `Commit Import (${validation.validCount} ${validation.validCount === 1 ? "record" : "records"})`}
              </SettingsButton>
            ) : null}
          </div>
        </SettingsCard>
      ) : null}

      <SettingsCard
        title="Export CRM data"
        description="Create annual or historical files for approved records and accounting workflows."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsSelect
            label="Export Scope"
            value={data?.exportScope}
            onChange={set("exportScope")}
            options={EXPORT_SCOPES}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div className="flex flex-col gap-2 min-w-0">
            <Label className="font-montserrat text-base font-medium text-foreground">Start Date</Label>
            <DatePicker
              value={data?.exportFrom}
              onChange={set("exportFrom")}
              maxDate={data?.exportTo || undefined}
              placeholder="Choose start date"
              className="h-13 rounded-sm px-4 text-base"
              iconClassName="size-5"
            />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <Label className="font-montserrat text-base font-medium text-foreground">End Date</Label>
            <DatePicker
              value={data?.exportTo}
              onChange={set("exportTo")}
              minDate={data?.exportFrom || undefined}
              placeholder="Choose end date"
              className="h-13 rounded-sm px-4 text-base"
              iconClassName="size-5"
            />
          </div>
        </div>

        <SettingRow
          label="Include archived records"
          description="Include soft-deleted records in the export with an Archived date column."
          checked={Boolean(data?.includeArchived)}
          onCheckedChange={set("includeArchived")}
        />

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-wrap gap-2.5">
            <SettingsButton primary disabled={hasInvalidDateSpan} onClick={() => triggerExport("XLSX")}>
              Export XLSX
            </SettingsButton>
            <SettingsButton
              disabled={isAllScope || hasInvalidDateSpan}
              onClick={() => triggerExport("CSV")}
            >
              Export CSV
            </SettingsButton>
          </div>
          {isAllScope ? (
            <p className="font-montserrat text-[12px] text-muted-foreground">
              All CRM Records places each module on its own worksheet tab in XLSX. Choose a single scope above to
              export as CSV.
            </p>
          ) : null}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Backups"
        description="Backups run on the server, outside the CRM. A restore is done from the server panel, never from a browser."
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <p className="font-montserrat text-[12px] leading-normal text-muted-foreground">Schedule</p>
            <p className="font-montserrat font-semibold text-[16px] leading-normal text-foreground">{BACKUP_POLICY}</p>
          </div>
          <SettingsPill tone="signal" className="self-start sm:self-auto">
            Managed by the server
          </SettingsPill>
        </div>
      </SettingsCard>
    </>
  );
}
