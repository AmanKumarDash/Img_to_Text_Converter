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

export interface SavedFileResult {
  uri: string;
  fileName: string;
  byteSize: number;
  savedAt: string;
}

export interface ShareFileResult {
  success: boolean;
  message?: string;
}

export interface ExportStatus {
  status: 'idle' | 'generating' | 'saving' | 'saved' | 'sharing' | 'success' | 'error';
  result?: GeneratedWorkbookResult;
  savedFile?: SavedFileResult;
  errorMessage?: string;
}
