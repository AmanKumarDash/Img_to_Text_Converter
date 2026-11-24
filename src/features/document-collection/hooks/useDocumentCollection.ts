import { useCallback, useEffect, useState } from 'react';
import { DocumentRecord, NewDocumentRecordInput } from '../model/types';
import { CollectionService } from '../services/collectionService';

export function useDocumentCollection() {
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await CollectionService.getRecords();
      setRecords(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load document records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const addRecord = useCallback(async (input: NewDocumentRecordInput) => {
    try {
      setError(null);
      const created = await CollectionService.addRecord(input);
      setRecords((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err?.message || 'Failed to add record.');
      throw err;
    }
  }, []);

  const updateRecord = useCallback(
    async (
      id: string,
      updates: Partial<Omit<DocumentRecord, 'id' | 'index' | 'scannedAt'>>
    ) => {
      try {
        setError(null);
        const updated = await CollectionService.updateRecord(id, updates);
        setRecords(updated);
        return updated;
      } catch (err: any) {
        setError(err?.message || 'Failed to update record.');
        throw err;
      }
    },
    []
  );

  const deleteRecord = useCallback(async (id: string) => {
    try {
      setError(null);
      const updated = await CollectionService.deleteRecord(id);
      setRecords(updated);
      return updated;
    } catch (err: any) {
      setError(err?.message || 'Failed to delete record.');
      throw err;
    }
  }, []);

  const clearCollection = useCallback(async () => {
    try {
      setError(null);
      await CollectionService.clearCollection();
      setRecords([]);
    } catch (err: any) {
      setError(err?.message || 'Failed to clear collection.');
      throw err;
    }
  }, []);

  return {
    records,
    isLoading,
    error,
    refreshCollection: loadRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    clearCollection,
  };
}
