import { TableStructure } from '../../ocr/model/types';
import { EditableTableData } from '../model/types';

/**
 * Normalizes raw or structured OCR table data into a clean, rectangular 2D matrix
 * ready for in-app editing and Excel (.xlsx) export.
 */
export function normalizeOCRTable(
  table?: TableStructure,
  rawText?: string,
  sourceImageUri?: string
): EditableTableData {
  if (table && table.headers && table.headers.length > 0) {
    const rawHeaders = table.headers.map((h, i) =>
      h && typeof h === 'string' && h.trim().length > 0 ? h.trim() : `Column ${i + 1}`
    );
    const rawRows = table.rows || [];

    // Determine the true maximum column width across headers and rows
    const maxCols = Math.max(
      rawHeaders.length,
      ...rawRows.map((r) => (Array.isArray(r) ? r.length : 0)),
      1
    );

    // Pad headers up to maxCols
    const headers = [...rawHeaders];
    while (headers.length < maxCols) {
      headers.push(`Column ${headers.length + 1}`);
    }

    // Rectangular row normalization: ensure equal column counts, safe strings, and empty cell handling
    const rows = rawRows.map((row) => {
      const normalizedRow: string[] = [];
      for (let i = 0; i < maxCols; i++) {
        if (!row || row[i] === undefined || row[i] === null) {
          normalizedRow.push('');
        } else {
          const val = String(row[i]).trim();
          normalizedRow.push(val === '-' ? '' : val);
        }
      }
      return normalizedRow;
    });

    // Ensure at least one row exists for editing
    if (rows.length === 0) {
      rows.push(new Array(maxCols).fill(''));
    }

    return {
      headers,
      rows,
      sourceImageUri,
    };
  }

  // Fallback for non-tabular raw text
  const lines = (rawText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      headers: ['Column 1', 'Column 2'],
      rows: [['', '']],
      sourceImageUri,
    };
  }

  return {
    headers: ['Line #', 'Extracted Content'],
    rows: lines.map((line, idx) => [`${idx + 1}`, line]),
    sourceImageUri,
  };
}
