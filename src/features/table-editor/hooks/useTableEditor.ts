import { useState } from 'react';
import { EditableTableData } from '../model/types';

export function useTableEditor(initialData: EditableTableData) {
  const [data, setData] = useState<EditableTableData>(initialData);
  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    colIndex: number;
    currentValue: string;
    headerTitle: string;
  } | null>(null);

  const [editingHeaderIndex, setEditingHeaderIndex] = useState<{
    colIndex: number;
    currentTitle: string;
  } | null>(null);

  // Update cell value immutably
  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setData((prev) => {
      const newRows = prev.rows.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;
        const newRow = [...row];
        newRow[colIndex] = value;
        return newRow;
      });
      return { ...prev, rows: newRows };
    });
  };

  // Update header title immutably
  const updateHeader = (colIndex: number, title: string) => {
    const trimmed = title.trim();
    const finalTitle = trimmed.length > 0 ? trimmed : `Column ${colIndex + 1}`;

    setData((prev) => {
      const newHeaders = [...prev.headers];
      newHeaders[colIndex] = finalTitle;
      return { ...prev, headers: newHeaders };
    });
  };

  // Add a new row to the bottom (or at a specific index)
  const addRow = (atIndex?: number) => {
    setData((prev) => {
      const emptyRow = new Array(prev.headers.length).fill('');
      const newRows = [...prev.rows];

      if (atIndex !== undefined && atIndex >= 0 && atIndex <= newRows.length) {
        newRows.splice(atIndex, 0, emptyRow);
      } else {
        newRows.push(emptyRow);
      }

      return { ...prev, rows: newRows };
    });
  };

  // Delete a row
  const deleteRow = (rowIndex: number) => {
    setData((prev) => {
      if (prev.rows.length <= 1) {
        // Keep at least one empty row
        return {
          ...prev,
          rows: [new Array(prev.headers.length).fill('')],
        };
      }
      const newRows = prev.rows.filter((_, idx) => idx !== rowIndex);
      return { ...prev, rows: newRows };
    });
  };

  // Add a new column
  const addColumn = (title?: string) => {
    setData((prev) => {
      const colNumber = prev.headers.length + 1;
      const headerTitle = title?.trim() || `Column ${colNumber}`;
      const newHeaders = [...prev.headers, headerTitle];

      const newRows = prev.rows.map((row) => [...row, '']);
      return { ...prev, headers: newHeaders, rows: newRows };
    });
  };

  // Delete a column
  const deleteColumn = (colIndex: number) => {
    setData((prev) => {
      // Must keep at least one column
      if (prev.headers.length <= 1) {
        return prev;
      }

      const newHeaders = prev.headers.filter((_, idx) => idx !== colIndex);
      const newRows = prev.rows.map((row) => row.filter((_, idx) => idx !== colIndex));

      return { ...prev, headers: newHeaders, rows: newRows };
    });
  };

  // Reset to initial data
  const resetData = () => {
    setData(initialData);
  };

  return {
    data,
    selectedCell,
    setSelectedCell,
    editingHeaderIndex,
    setEditingHeaderIndex,
    updateCell,
    updateHeader,
    addRow,
    deleteRow,
    addColumn,
    deleteColumn,
    resetData,
  };
}
