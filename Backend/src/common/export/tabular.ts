import ExcelJS from 'exceljs';
import { sniffContentType } from '../files/file-signature.js';

/**
 * Rows to a file — CSV or Excel — for any export in the system (#23's
 * operations export first; #26's import/export next). A module builds its
 * columns and rows; nothing here knows what a trip or an invoice is.
 *
 * A cell is a string, a number or null. Numbers stay numbers in Excel, so a
 * column of revenue can be summed in the sheet; null is an empty cell, never
 * a zero.
 */
export type Cell = string | number | null;

export interface Column<Row> {
  header: string;
  value: (row: Row) => Cell;
  /** Excel display format for a number column, e.g. `'#,##0.00'`. */
  numberFormat?: string;
  /** Excel column width, in characters. */
  width?: number;
}

export interface WorksheetSpec<Row = unknown> {
  sheetName: string;
  columns: Column<Row>[];
  rows: Row[];
}

export const EXPORT_FORMATS = ['CSV', 'XLSX'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  CSV: 'text/csv; charset=utf-8',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = { CSV: 'csv', XLSX: 'xlsx' };

/**
 * A text cell a spreadsheet would read as a formula is prefixed with `'`.
 *
 * Without it a client named `=HYPERLINK("http://…")` — or anything a caller
 * typed into a free-text field — runs as a formula on the desk's machine the
 * moment the export is opened (CSV injection). Numbers are never touched.
 */
export function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const csvField = (cell: Cell): string => {
  if (cell === null) return '';
  if (typeof cell === 'number') return String(cell);
  const text = neutralise(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** RFC 4180 CSV with CRLF line ends and a BOM, so Excel opens it as UTF-8. */
export function toCsv<Row>(columns: Column<Row>[], rows: Row[]): Buffer {
  const lines = [
    columns.map((column) => csvField(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => csvField(column.value(row))).join(',')),
  ];
  return Buffer.from(`﻿${lines.join('\r\n')}\r\n`, 'utf8');
}

function writeSheet<Row>(workbook: ExcelJS.Workbook, spec: WorksheetSpec<Row>): void {
  // Excel limits a sheet name to 31 characters and a handful of symbols.
  const sheet = workbook.addWorksheet(spec.sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = spec.columns.map((column) => ({
    header: column.header,
    width: column.width ?? Math.max(12, column.header.length + 2),
    style: column.numberFormat ? { numFmt: column.numberFormat } : {},
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of spec.rows) {
    sheet.addRow(
      spec.columns.map((column) => {
        const cell = column.value(row);
        return typeof cell === 'string' ? neutralise(cell) : cell;
      }),
    );
  }
}

/** One worksheet, a bold frozen header row, numbers kept as numbers. */
export async function toXlsx<Row>(columns: Column<Row>[], rows: Row[], sheetName: string): Promise<Buffer> {
  return toMultiSheetXlsx([{ sheetName, columns, rows }]);
}

/** Several worksheets in one workbook — e.g. "All CRM Records" export (#31). */
export async function toMultiSheetXlsx(sheets: WorksheetSpec<any>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const spec of sheets) {
    writeSheet(workbook, spec);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function toFile<Row>(
  format: ExportFormat,
  columns: Column<Row>[],
  rows: Row[],
  sheetName: string,
): Promise<Buffer> {
  return format === 'XLSX' ? toXlsx(columns, rows, sheetName) : toCsv(columns, rows);
}

export interface ParsedTabular {
  format: ExportFormat;
  columns: string[];
  rows: Record<string, string>[];
}

/**
 * Parses a CSV string (RFC 4180, UTF-8 with optional BOM) into header columns
 * and non-empty data rows keyed by header name.
 */
export function parseCsvText(rawText: string): { columns: string[]; rows: Record<string, string>[] } {
  const text = rawText.replace(/^\uFEFF/, '');
  const grid: string[][] = [];
  let currentRow: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      currentRow.push(cell.trim());
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      currentRow.push(cell.trim());
      cell = '';
      if (currentRow.some((value) => value.length > 0)) {
        grid.push(currentRow);
      }
      currentRow = [];
    } else {
      cell += ch;
    }
  }
  currentRow.push(cell.trim());
  if (currentRow.some((value) => value.length > 0)) {
    grid.push(currentRow);
  }

  if (grid.length === 0) return { columns: [], rows: [] };
  const columns = grid[0].filter((header) => header.length > 0);
  const rows = grid.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    for (let idx = 0; idx < grid[0].length; idx += 1) {
      const header = grid[0][idx];
      if (header) record[header] = (cells[idx] ?? '').trim();
    }
    return record;
  });

  return { columns, rows };
}

function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? '').join('').trim();
    }
    if ('result' in value && (typeof value.result === 'string' || typeof value.result === 'number' || typeof value.result === 'boolean')) {
      return String(value.result).trim();
    }
  }
  return '';
}

/**
 * Reads a CSV or XLSX buffer from its bytes (`sniffContentType`), returning
 * its format, header columns, and data rows. Refuses legacy `.xls` or any
 * non-tabular file with `null`.
 */
export async function readTabular(buffer: Buffer, declaredType?: string): Promise<ParsedTabular | null> {
  const sniffed = sniffContentType(buffer, declaredType);
  if (sniffed === EXPORT_CONTENT_TYPES.XLSX) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { format: 'XLSX', columns: [], rows: [] };

    const headerRow = sheet.getRow(1);
    const headerByCol = new Map<number, string>();
    const columns: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = cellToText(cell.value);
      if (header && !columns.includes(header)) {
        headerByCol.set(colNumber, header);
        columns.push(header);
      }
    });

    const rows: Record<string, string>[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const record: Record<string, string> = {};
      let hasValue = false;
      for (const [colNumber, header] of headerByCol.entries()) {
        const text = cellToText(row.getCell(colNumber).value);
        record[header] = text;
        if (text.length > 0) hasValue = true;
      }
      if (hasValue) rows.push(record);
    }

    return { format: 'XLSX', columns, rows };
  }

  if (sniffed === 'text/csv' || sniffed === 'text/plain') {
    const { columns, rows } = parseCsvText(buffer.toString('utf8'));
    return { format: 'CSV', columns, rows };
  }

  return null;
}
