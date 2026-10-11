import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { neutralise, toCsv, toXlsx, type Column } from './tabular.js';

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

describe('toXlsx', () => {
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
});
