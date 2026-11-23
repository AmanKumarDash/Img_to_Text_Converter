import { EditableTableData } from '../../table-editor/model/types';

export interface ExcelExportOptions {
  sheetName?: string;
  autoWidth?: boolean;
  parseNumbers?: boolean;
}

export interface GeneratedWorkbookResult {
  base64: string;
  byteSize: number;
  sheetName: string;
  columnCount: number;
  rowCount: number;
  timestamp: string;
  suggestedFileName: string;
}

export interface ExportStatus {
  status: 'idle' | 'generating' | 'success' | 'error';
  result?: GeneratedWorkbookResult;
  errorMessage?: string;
}
