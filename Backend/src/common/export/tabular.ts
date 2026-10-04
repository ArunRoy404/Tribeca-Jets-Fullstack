import ExcelJS from 'exceljs';

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

/** One worksheet, a bold frozen header row, numbers kept as numbers. */
export async function toXlsx<Row>(columns: Column<Row>[], rows: Row[], sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  // Excel limits a sheet name to 31 characters and a handful of symbols.
  const sheet = workbook.addWorksheet(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width ?? Math.max(12, column.header.length + 2),
    style: column.numberFormat ? { numFmt: column.numberFormat } : {},
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      columns.map((column) => {
        const cell = column.value(row);
        return typeof cell === 'string' ? neutralise(cell) : cell;
      }),
    );
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
