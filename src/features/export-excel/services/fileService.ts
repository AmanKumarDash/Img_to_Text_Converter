import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { GeneratedWorkbookResult, SavedFileResult, ShareFileResult } from '../model/types';

/**
 * Service for local file persistence and native sharing of generated Excel workbooks.
 * Fully offline, private, and secure.
 */
export class FileService {
  /**
   * MIME type for Microsoft Excel OpenXML Spreadsheet (.xlsx).
   */
  public static readonly EXCEL_MIME_TYPE =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  /**
   * Apple Uniform Type Identifier (UTI) for OpenXML Spreadsheet.
   */
  public static readonly EXCEL_UTI = 'org.openxmlformats.spreadsheetml.sheet';

  /**
   * Sanitizes a user or suggested file name by removing illegal filesystem characters,
   * collapsing whitespace, and ensuring the `.xlsx` extension is present.
   *
   * @param fileName Raw file name input.
   * @returns Clean, safe file name with .xlsx extension.
   */
  public static sanitizeFileName(fileName?: string): string {
    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      return this.generateDefaultFileName();
    }

    // Replace illegal characters: / \ ? * : | " < > and control chars
    let clean = fileName.trim().replace(/[/\\?%*:|"<>]/g, '_');

    // Remove leading/trailing dots and spaces
    clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');

    if (clean.length === 0) {
      return this.generateDefaultFileName();
    }

    // Ensure .xlsx extension
    if (!clean.toLowerCase().endsWith('.xlsx')) {
      clean = `${clean}.xlsx`;
    }

    return clean;
  }

  /**
   * Generates a timestamped default filename for the spreadsheet.
   */
  public static generateDefaultFileName(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .slice(0, 15);
    return `Scanned_Table_${timestamp}.xlsx`;
  }

  /**
   * Saves a generated Excel workbook (Base64) to the device's persistent document directory.
   * Validates that the file was written successfully and has a non-zero size.
   *
   * @param workbook Result from ExcelService.generateWorkbook().
   * @param customFileName Optional custom file name.
   * @returns SavedFileResult containing the local URI, file name, byte size, and timestamp.
   */
  public static async saveWorkbookFile(
    workbook: GeneratedWorkbookResult,
    customFileName?: string
  ): Promise<SavedFileResult> {
    if (!workbook || !workbook.base64) {
      throw new Error('Cannot save file: Workbook Base64 data is empty or missing.');
    }

    const docDir = FileSystem.documentDirectory;
    if (!docDir) {
      throw new Error(
        'Cannot save file: Device persistent document directory is unavailable.'
      );
    }

    const normalizedDir = docDir.endsWith('/') ? docDir : `${docDir}/`;
    const fileName = this.sanitizeFileName(customFileName || workbook.suggestedFileName);
    const fileUri = `${normalizedDir}${fileName}`;

    try {
      // Write the binary Base64 payload directly to disk
      await FileSystem.writeAsStringAsync(fileUri, workbook.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify file presence and size on disk
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File verification failed: Written file does not exist on disk.');
      }

      const verifiedSize =
        'size' in fileInfo && typeof fileInfo.size === 'number'
          ? fileInfo.size
          : workbook.byteSize;

      if (verifiedSize <= 0) {
        throw new Error('File verification failed: Written file is empty (0 bytes).');
      }

      return {
        uri: fileUri,
        fileName,
        byteSize: verifiedSize,
        savedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('File saving error:', error);
      throw new Error(
        `Failed to save Excel file to device: ${error?.message || 'Unknown storage error'}`
      );
    }
  }

  /**
   * Opens the system sharing dialog to share or send the generated Excel workbook.
   *
   * @param fileUri Local file:// URI of the saved workbook.
   * @param dialogTitle Optional custom share dialog title (Android).
   * @returns ShareFileResult indicating whether sharing succeeded or was dismissed.
   */
  public static async shareExcelFile(
    fileUri: string,
    dialogTitle = 'Share Excel Spreadsheet'
  ): Promise<ShareFileResult> {
    if (!fileUri || typeof fileUri !== 'string') {
      throw new Error('Cannot share: File URI is required.');
    }

    try {
      // 1. Check if sharing is available on this platform/device
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not supported on this platform or device.');
      }

      // 2. Verify file exists before launching share sheet
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        throw new Error('Cannot share: The specified file does not exist on disk.');
      }

      // 3. Launch native sharing sheet
      await Sharing.shareAsync(fileUri, {
        mimeType: this.EXCEL_MIME_TYPE,
        dialogTitle,
        UTI: this.EXCEL_UTI,
      });

      return { success: true };
    } catch (error: any) {
      // Catch user cancellation or dismissal gracefully
      const msg = error?.message || '';
      if (
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('dismiss') ||
        msg.toLowerCase().includes('user did not share')
      ) {
        return { success: false, message: 'Share action cancelled by user.' };
      }

      console.error('File sharing error:', error);
      throw new Error(`Failed to share Excel file: ${msg || 'Unknown sharing error'}`);
    }
  }

  /**
   * Safely deletes a file from local storage if it exists.
   *
   * @param fileUri Local file URI to delete.
   */
  public static async deleteFile(fileUri: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to delete file:', fileUri, err);
      return false;
    }
  }
}
