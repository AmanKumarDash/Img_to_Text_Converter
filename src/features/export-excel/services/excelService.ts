import * as XLSX from 'xlsx';
import { EditableTableData } from '../../table-editor/model/types';
import { DocumentRecord } from '../../document-collection/model/types';
import { ExcelExportOptions, GeneratedWorkbookResult } from '../model/types';

/**
 * Service for generating genuine, high-quality Microsoft Excel (.xlsx) workbooks
 * completely offline using SheetJS.
 */
export class ExcelService {
  /**
   * Standard header specification for identity document collections.
   */
  public static readonly COLLECTION_HEADERS = [
    'Index',
    'Document Type',
    'Full Name',
    'Date of Birth',
    'Document Number',
    'Nationality',
    'Issue Date',
    'Expiry Date',
    'Gender',
    'Address',
  ];

  /**
   * Generates a single continuous Microsoft Excel (.xlsx) workbook for a multi-scan document collection.
   * Creates exactly one worksheet named 'All_Data' with sequential index numbering and string-preserved document numbers.
   *
   * @param records Array of scanned identity document records.
   * @param options Customization options (autoWidth, parseNumbers).
   * @returns GeneratedWorkbookResult containing Base64 binary, byte size, and metadata.
   */
  public static generateCollectionWorkbook(
    records: DocumentRecord[],
    options: ExcelExportOptions = {}
  ): GeneratedWorkbookResult {
    if (!Array.isArray(records)) {
      throw new Error('Cannot export collection: Records must be an array.');
    }

    const sheetName = 'All_Data';
    const autoWidth = options.autoWidth ?? true;
    const headers = [...this.COLLECTION_HEADERS];
    const maxCols = headers.length;

    // 1. Prepare Array of Arrays (AOA)
    const aoa: any[][] = [];
    aoa.push(headers);

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      // Index is sequential 1-based index
      const recordIndex = typeof rec.index === 'number' ? rec.index : i + 1;
      const docType = rec.documentTypeLabel || rec.documentType || 'Unknown';
      const fullName = (rec.fullName || '').trim();
      const dob = (rec.dateOfBirth || '').trim();
      // Enforce Document Number as string to preserve leading zeros
      const docNum = rec.documentNumber !== undefined && rec.documentNumber !== null
        ? String(rec.documentNumber).trim()
        : '';
      const nationality = (rec.nationality || '').trim();
      const issueDate = (rec.issueDate || '').trim();
      const expiryDate = (rec.expiryDate || '').trim();
      const gender = (rec.gender || '').trim();
      const address = (rec.address || '').trim();

      aoa.push([
        recordIndex,
        docType,
        fullName,
        dob,
        docNum,
        nationality,
        issueDate,
        expiryDate,
        gender,
        address,
      ]);
    }

    // 2. Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // 3. Ensure cell types: Document Number (column E, col index 4) must strictly be text ('s')
    // and Index (column A, col index 0) must be number ('n')
    for (let r = 1; r <= records.length; r++) {
      // Column 0: Index -> number
      const indexCellRef = XLSX.utils.encode_cell({ r, c: 0 });
      if (worksheet[indexCellRef]) {
        worksheet[indexCellRef].t = 'n';
      }

      // Column 4: Document Number -> string (preserves leading zeros like '00123')
      const docNumCellRef = XLSX.utils.encode_cell({ r, c: 4 });
      if (worksheet[docNumCellRef]) {
        worksheet[docNumCellRef].t = 's';
        worksheet[docNumCellRef].z = '@'; // text format
      }
    }

    // 4. Calculate Column Widths
    if (autoWidth) {
      const colWidths: { wch: number }[] = [];
      for (let c = 0; c < maxCols; c++) {
        let maxCharLen = headers[c]?.length || 10;
        for (let r = 1; r < aoa.length; r++) {
          const valStr = aoa[r]?.[c] !== undefined && aoa[r]?.[c] !== null
            ? String(aoa[r][c])
            : '';
          if (valStr.length > maxCharLen) {
            maxCharLen = valStr.length;
          }
        }
        // Breathing room: pad + 3, clamped between 12 and 45
        colWidths.push({ wch: Math.min(Math.max(maxCharLen + 3, 12), 45) });
      }
      worksheet['!cols'] = colWidths;
    }

    // 5. Create Workbook and Append 'All_Data' Sheet
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
    const suggestedFileName = `Document_Collection_${dateStr}.xlsx`;

    return {
      base64,
      byteSize,
      sheetName,
      columnCount: maxCols,
      rowCount: records.length,
      timestamp: new Date().toISOString(),
      suggestedFileName,
    };
  }

  /**
   * Generates a genuine .xlsx workbook in Base64 encoding from EditableTableData (Single Table Mode).
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
