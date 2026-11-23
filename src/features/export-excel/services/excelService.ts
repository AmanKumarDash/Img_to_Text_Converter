import * as XLSX from 'xlsx';
import { EditableTableData } from '../../table-editor/model/types';
import { ExcelExportOptions, GeneratedWorkbookResult } from '../model/types';

/**
 * Service for generating genuine, high-quality Microsoft Excel (.xlsx) workbooks
 * completely offline using SheetJS.
 */
export class ExcelService {
  /**
   * Generates a genuine .xlsx workbook in Base64 encoding from EditableTableData.
   *
   * @param tableData Normalized table headers and rows from the editor.
   * @param options Customization options (sheet name, auto width, number parsing).
   * @returns GeneratedWorkbookResult containing Base64 binary, size, and metadata.
   */
  public static generateWorkbook(
    tableData: EditableTableData,
    options: ExcelExportOptions = {}
  ): GeneratedWorkbookResult {
    // 1. Data Validation
    this.validateTableData(tableData);

    const sheetName = (options.sheetName || 'Scanned Table').slice(0, 31);
    const autoWidth = options.autoWidth ?? true;
    const parseNumbers = options.parseNumbers ?? true;

    const headers = tableData.headers.map((h, i) =>
      h && typeof h === 'string' && h.trim().length > 0 ? h.trim() : `Column ${i + 1}`
    );

    const rows = tableData.rows || [];
    const maxCols = headers.length;

    // 2. Prepare Array of Arrays (AOA) for SheetJS
    const aoa: any[][] = [];
    aoa.push(headers);

    for (const row of rows) {
      const rowData: any[] = [];
      for (let c = 0; c < maxCols; c++) {
        const rawVal = row && row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '';

        if (rawVal === '') {
          rowData.push('');
        } else if (parseNumbers && isParsableNumber(rawVal)) {
          rowData.push(parseFloat(rawVal));
        } else {
          rowData.push(rawVal);
        }
      }
      aoa.push(rowData);
    }

    // 3. Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // 4. Formatting: Calculate auto column widths
    if (autoWidth) {
      const colWidths: { wch: number }[] = [];
      for (let c = 0; c < maxCols; c++) {
        let maxCharLen = headers[c]?.length || 10;
        for (let r = 0; r < rows.length; r++) {
          const valStr = rows[r]?.[c] ? String(rows[r][c]) : '';
          if (valStr.length > maxCharLen) {
            maxCharLen = valStr.length;
          }
        }
        // Clamp column width between 12 and 50 characters with breathing padding
        colWidths.push({ wch: Math.min(Math.max(maxCharLen + 3, 12), 50) });
      }
      worksheet['!cols'] = colWidths;
    }

    // 5. Create Workbook & Append Sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 6. Write out binary .xlsx as Base64 with standard zip compression
    const base64 = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
      compression: true,
    });

    const byteSize = Math.round((base64.length * 3) / 4);
    const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const suggestedFileName = `Scanned_Table_${dateStr}.xlsx`;

    return {
      base64,
      byteSize,
      sheetName,
      columnCount: maxCols,
      rowCount: rows.length,
      timestamp: new Date().toISOString(),
      suggestedFileName,
    };
  }

  /**
   * Validates table structure and values to prevent corrupted workbooks.
   */
  public static validateTableData(tableData: EditableTableData): void {
    if (!tableData) {
      throw new Error('Table data is missing or undefined.');
    }

    if (!Array.isArray(tableData.headers) || tableData.headers.length === 0) {
      throw new Error('Cannot generate Excel: Table contains no column headers.');
    }

    if (!Array.isArray(tableData.rows)) {
      throw new Error('Cannot generate Excel: Rows data is invalid.');
    }
  }
}

/**
 * Checks if a string represents a clean numeric value without losing formatting or leading zeros.
 * Preserves phone numbers, postal codes, and product codes (e.g., "00142").
 */
function isParsableNumber(val: string): boolean {
  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
    return false;
  }
  return /^-?\d+(\.\d+)?$/.test(val);
}
