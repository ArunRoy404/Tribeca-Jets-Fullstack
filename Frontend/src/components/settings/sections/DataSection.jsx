"use client";

import { useRef, useState } from "react";
import DatePicker from "@/components/common/DatePicker";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  BACKUP_POLICY,
  EXPORT_SCOPES,
  IMPORT_ACCEPT,
  IMPORT_MAX_MB,
  IMPORT_TARGET_FIELDS,
  IMPORT_TYPES,
} from "@/lib/settings";
import { toastApiError, toastInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";
import SettingsCard from "../SettingsCard";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";
import SettingsPill from "../SettingsPill";

const SKIP = "__skip";

/** A source column matched to the target field with the same name, ignoring case and spacing. */
function guessTarget(column, targets) {
  const key = column.toLowerCase().replace(/[^a-z0-9]/g, "");
  return targets.find((target) => target.toLowerCase().replace(/[^a-z0-9]/g, "") === key) ?? SKIP;
}

/** The header row of a CSV, read in the browser. Quotes are honoured; nothing is uploaded. */
async function readCsvHeader(file) {
  const text = await file.slice(0, 64 * 1024).text();
  const line = text.replace(/^﻿/, "").split(/\r?\n/)[0] ?? "";
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

/**
 * Import and export. The file is read locally to preview its columns; nothing
 * is sent until the import API exists. The design's "File Format" dropdowns
 * (the format is read from the file), legacy `.xls`, the "Period" dropdown
 * (the dates are the period) and the "Import safeguards" toggles (always on)
 * are left out — MODULE_FEATURE_STATUS.md, Settings.
 */
export default function DataSection() {
  const data = useSettingsStore((s) => s.data);
  const setField = useSettingsStore((s) => s.setField);
  const set = (key) => setField("data", key);

  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dragging, setDragging] = useState(false);

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
    // An Excel workbook needs the server to read it; a CSV's header is plain text.
    const header = extension === "csv" ? await readCsvHeader(picked) : [];
    setColumns(header);
    setMapping(Object.fromEntries(header.map((column) => [column, guessTarget(column, targets)])));
  };

  const changeImportType = (type) => {
    set("importType")(type);
    const nextTargets = IMPORT_TARGET_FIELDS[type] ?? [];
    setMapping(Object.fromEntries(columns.map((column) => [column, guessTarget(column, nextTargets)])));
  };

  const notConnected = (what) => toastInfo(`${what} isn't connected yet`, "It arrives with the Import & Export API.");

  return (
    <>
      <SettingsCard
        title="Import CRM data"
        description="Upload a CSV or XLSX file, then map source columns before committing records."
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
            dragging ? "border-signal bg-signal-soft" : "border-border hover:border-signal/50"
          )}
        >
          <span className="font-montserrat font-medium text-[14px] leading-normal text-foreground break-all">
            {file ? file.name : "Drop file here or browse"}
          </span>
          <span className="font-montserrat text-[11px] leading-normal text-muted-foreground">
            {file ? "Choose another file to replace it" : `CSV, XLSX • max ${IMPORT_MAX_MB} MB`}
          </span>
        </button>

        <div className="flex flex-col gap-2 w-full">
          <p className="font-montserrat font-semibold text-[13px] leading-normal text-foreground">
            Column mapping preview
          </p>
          {columns.length ? (
            columns.map((column) => (
              <div key={column} className="flex items-center gap-2 sm:gap-3 w-full">
                <span className="flex-1 min-w-0 truncate rounded-full bg-surface px-3 py-2 font-montserrat text-[11px] leading-normal text-foreground">
                  {column}
                </span>
                <span className="font-montserrat font-medium text-[13px] text-muted-foreground shrink-0">→</span>
                <div className="flex-1 min-w-0">
                  <select
                    aria-label={`Map ${column} to`}
                    value={mapping[column] ?? SKIP}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [column]: e.target.value }))}
                    className={cn(
                      "w-full truncate rounded-full px-3 py-2 font-montserrat text-[11px] leading-normal outline-none cursor-pointer appearance-none",
                      mapping[column] === SKIP ? "bg-surface text-muted-foreground" : "bg-signal-soft text-signal"
                    )}
                  >
                    {targetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <p className="font-montserrat text-[12px] leading-normal text-muted-foreground">
              {file
                ? "An Excel file's columns are read when it is validated."
                : "Choose a CSV file to map its columns here."}
            </p>
          )}
        </div>

        <SettingsButton primary disabled={!file} onClick={() => notConnected("Import validation")}>
          Validate Import
        </SettingsButton>
      </SettingsCard>

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
          {[
            { key: "exportFrom", label: "Start Date" },
            { key: "exportTo", label: "End Date" },
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-2 min-w-0">
              <Label className="font-montserrat text-base font-medium text-foreground">{field.label}</Label>
              <DatePicker
                value={data?.[field.key]}
                onChange={set(field.key)}
                placeholder="Choose date"
                className="h-13 rounded-sm px-4 text-base"
                iconClassName="size-5"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <SettingsButton primary onClick={() => notConnected("Export")}>
            Export XLSX
          </SettingsButton>
          <SettingsButton onClick={() => notConnected("Export")}>Export CSV</SettingsButton>
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
