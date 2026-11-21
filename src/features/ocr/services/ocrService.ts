import { OfflineOCRResult } from '../model/types';
import { OfflineOCRService } from './offlineOCRService';

/**
 * Main OCR entrypoint for the application.
 * Fully on-device, offline, and private.
 */
export class OCRService {
  /**
   * Recognizes text from a local image file using on-device ML Kit.
   *
   * @param imageUri Local path or file:// URI of the captured document.
   */
  public static async recognizeText(imageUri: string): Promise<OfflineOCRResult> {
    return await OfflineOCRService.recognizeText(imageUri);
  }
}
