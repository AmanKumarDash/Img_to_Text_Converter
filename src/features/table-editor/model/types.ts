export interface TableCellPosition {
  rowIndex: number;
  colIndex: number;
}

export interface EditableTableData {
  headers: string[];
  rows: string[][];
  sourceImageUri?: string;
}

export interface TableHistoryState {
  past: EditableTableData[];
  present: EditableTableData;
  future: EditableTableData[];
}
