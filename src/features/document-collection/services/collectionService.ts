import * as FileSystem from 'expo-file-system/legacy';
import { DocumentRecord, NewDocumentRecordInput } from '../model/types';

/**
 * Service for managing multi-scan identity document collections.
 * Persists records locally to disk using expo-file-system so data survives app restarts.
 */
export class CollectionService {
  private static readonly COLLECTION_FILE_NAME = 'document_collection_data.json';

  // In-memory cache for fast synchronous access and test fallback
  private static cachedRecords: DocumentRecord[] | null = null;

  /**
   * Returns the file path for the persistent collection storage file.
   */
  private static getFilePath(): string {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) {
      throw new Error('Device document directory is unavailable.');
    }
    const cleanDir = docDir.endsWith('/') ? docDir : `${docDir}/`;
    return `${cleanDir}${this.COLLECTION_FILE_NAME}`;
  }

  /**
   * Loads all collected document records from local storage.
   * Ensures sequential indexing (1 to N).
   */
  public static async getRecords(): Promise<DocumentRecord[]> {
    if (this.cachedRecords !== null) {
      return [...this.cachedRecords];
    }

    try {
      const filePath = this.getFilePath();
      const info = await FileSystem.getInfoAsync(filePath);

      if (!info.exists) {
        this.cachedRecords = [];
        return [];
      }

      const content = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!content || content.trim().length === 0) {
        this.cachedRecords = [];
        return [];
      }

      const parsed = JSON.parse(content);
      const records: DocumentRecord[] = Array.isArray(parsed)
        ? parsed
        : parsed.records || [];

      // Ensure sequential indexing
      const reindexed = this.reindexRecords(records);
      this.cachedRecords = reindexed;
      return [...reindexed];
    } catch (err) {
      console.warn('Failed to load collection from storage, initializing empty:', err);
      this.cachedRecords = [];
      return [];
    }
  }

  /**
   * Saves records array to local disk storage.
   */
  public static async saveRecords(records: DocumentRecord[]): Promise<void> {
    const reindexed = this.reindexRecords(records);
    this.cachedRecords = [...reindexed];

    try {
      const filePath = this.getFilePath();
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(reindexed, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
    } catch (err) {
      console.error('Failed to save document collection to disk:', err);
      throw new Error('Unable to persist document collection locally.');
    }
  }

  /**
   * Adds a new document record to the collection.
   * Assigns a unique ID, timestamp, and sequential index.
   */
  public static async addRecord(
    input: NewDocumentRecordInput
  ): Promise<DocumentRecord> {
    const current = await this.getRecords();

    const newRecord: DocumentRecord = {
      ...input,
      id: generateId(),
      index: current.length + 1,
      scannedAt: new Date().toISOString(),
    };

    const updated = [...current, newRecord];
    await this.saveRecords(updated);
    return newRecord;
  }

  /**
   * Updates an existing record by ID.
   */
  public static async updateRecord(
    id: string,
    updates: Partial<Omit<DocumentRecord, 'id' | 'index' | 'scannedAt'>>
  ): Promise<DocumentRecord[]> {
    const current = await this.getRecords();
    const index = current.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error(`Record with ID "${id}" not found.`);
    }

    current[index] = {
      ...current[index],
      ...updates,
    };

    await this.saveRecords(current);
    return [...current];
  }

  /**
   * Deletes a record by ID and re-indexes the remaining records sequentially.
   */
  public static async deleteRecord(id: string): Promise<DocumentRecord[]> {
    const current = await this.getRecords();
    const filtered = current.filter((r) => r.id !== id);
    const reindexed = this.reindexRecords(filtered);

    await this.saveRecords(reindexed);
    return reindexed;
  }

  /**
   * Clears all records from the collection.
   */
  public static async clearCollection(): Promise<void> {
    this.cachedRecords = [];
    try {
      const filePath = this.getFilePath();
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (err) {
      console.warn('Failed to delete collection file:', err);
    }
  }

  /**
   * Ensures that records are indexed sequentially: 1, 2, 3, ... N.
   */
  public static reindexRecords(records: DocumentRecord[]): DocumentRecord[] {
    return records.map((record, idx) => ({
      ...record,
      index: idx + 1,
    }));
  }
}

/**
 * Generates a clean unique identifier.
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
