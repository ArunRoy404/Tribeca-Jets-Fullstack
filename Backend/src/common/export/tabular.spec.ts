import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { neutralise, parseCsvText, readTabular, toCsv, toMultiSheetXlsx, toXlsx, type Column } from './tabular.js';

type Row = { name: string; amount: number | null };
const columns: Column<Row>[] = [
  { header: 'Name', value: (row) => row.name },
  { header: 'Amount', value: (row) => row.amount, numberFormat: '#,##0.00' },
];

describe('neutralise', () => {
  it('defuses text a spreadsheet would run as a formula', () => {
    expect(neutralise('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`);
    expect(neutralise('+1 555')).toBe(`'+1 555`);
    expect(neutralise('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(neutralise('Hope Sterling')).toBe('Hope Sterling');
  });
});

describe('toCsv', () => {
  it('quotes what needs quoting, leaves null blank and starts with a BOM', () => {
    const text = toCsv(columns, [
      { name: 'Walsh, Robert', amount: 1250.5 },
      { name: 'Say "hi"', amount: null },
    ]).toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.slice(1).split('\r\n')).toEqual(['Name,Amount', '"Walsh, Robert",1250.5', '"Say ""hi""",', '']);
  });
});

describe('toXlsx and toMultiSheetXlsx', () => {
  it('writes a workbook whose numbers are numbers and whose blanks are blank', async () => {
    const buffer = await toXlsx(columns, [{ name: '=cmd', amount: 42 }, { name: 'Chen', amount: null }], 'Ops');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Ops')!;
    expect(sheet.getCell('A1').value).toBe('Name');
    expect(sheet.getCell('A2').value).toBe(`'=cmd`);
    expect(sheet.getCell('B2').value).toBe(42);
    expect(sheet.getCell('B3').value).toBeNull();
  });

  it('writes multiple worksheets into one workbook', async () => {
    const buffer = await toMultiSheetXlsx([
      { sheetName: 'Clients', columns, rows: [{ name: 'Apex', amount: 100 }] },
      { sheetName: 'Trips', columns, rows: [{ name: 'TJ-1001', amount: 50000 }] },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual(['Clients', 'Trips']);
    expect(workbook.getWorksheet('Clients')?.getCell('A2').value).toBe('Apex');
    expect(workbook.getWorksheet('Trips')?.getCell('B2').value).toBe(50000);
  });
});

describe('parseCsvText and readTabular', () => {
  it('parses RFC 4180 CSV with BOM, quotes, and escaped quotes', () => {
    const csv = '\uFEFF"Client Name",Primary Email\r\n"Walsh, Robert",rob@example.com\r\n"Say ""Hi""",hi@example.com\r\n';
    const parsed = parseCsvText(csv);
    expect(parsed.columns).toEqual(['Client Name', 'Primary Email']);
    expect(parsed.rows).toEqual([
      { 'Client Name': 'Walsh, Robert', 'Primary Email': 'rob@example.com' },
      { 'Client Name': 'Say "Hi"', 'Primary Email': 'hi@example.com' },
    ]);
  });

  it('reads both CSV and XLSX buffers from their bytes and refuses non-tabular files', async () => {
    const xlsxBuffer = await toXlsx(columns, [{ name: 'Apex', amount: 1200 }], 'Clients');
    const xlsxParsed = await readTabular(xlsxBuffer);
    expect(xlsxParsed).toEqual({
      format: 'XLSX',
      columns: ['Name', 'Amount'],
      rows: [{ Name: 'Apex', Amount: '1200' }],
    });

    const csvBuffer = Buffer.from('ICAO,Name\nKTEB,Teterboro\n', 'utf8');
    const csvParsed = await readTabular(csvBuffer, 'text/csv');
    expect(csvParsed).toEqual({
      format: 'CSV',
      columns: ['ICAO', 'Name'],
      rows: [{ ICAO: 'KTEB', Name: 'Teterboro' }],
    });

    const pdfBuffer = Buffer.from('%PDF-1.7 fake pdf', 'utf8');
    expect(await readTabular(pdfBuffer, 'text/csv')).toBeNull();
  });
});
