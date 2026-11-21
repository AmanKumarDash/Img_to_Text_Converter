import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OfflineOCRResult, TextBlock } from '../model/types';
import { reconstructTableFromBlocks } from './tableParser';

/**
 * Pure on-device, offline OCR engine using Google ML Kit Text Recognition.
 * - Works 100% offline (no internet, no mobile data, no Wi-Fi).
 * - Zero external API calls, zero API keys, zero image uploads.
 * - Hardware accelerated on-device text recognition with bounding boxes.
 */
export class OfflineOCRService {
  /**
   * Recognizes text from a local image URI.
   *
   * @param imageUri Local path or file:/// URI to the captured photo.
   * @returns Complete extracted text, blocks, bounding boxes, and parsed table structure.
   */
  public static async recognizeText(imageUri: string): Promise<OfflineOCRResult> {
    if (!imageUri || imageUri.trim().length === 0) {
      throw new Error('Invalid image: Image URI is empty or not provided.');
    }

    try {
      // Normalize URI if needed for ML Kit native loader
      const normalizedUri = imageUri.trim();

      // Call Google ML Kit On-Device Text Recognition
      const result = await TextRecognition.recognize(normalizedUri);

      const rawText = result.text ?? '';
      const rawBlocks = result.blocks ?? [];

      // Validate non-empty text detection
      if (!rawText.trim() && rawBlocks.length === 0) {
        throw new Error(
          'No text was detected in this image. Please ensure the document is clear, well-lit, and in focus.'
        );
      }

      // Map ML Kit blocks and bounding boxes to our normalized format
      const blocks: TextBlock[] = rawBlocks.map((b) => ({
        text: b.text ?? '',
        frame: b.frame
          ? {
              top: b.frame.top,
              left: b.frame.left,
              width: b.frame.width,
              height: b.frame.height,
            }
          : undefined,
        lines: (b.lines ?? []).map((l) => ({
          text: l.text ?? '',
          frame: l.frame
            ? {
                top: l.frame.top,
                left: l.frame.left,
                width: l.frame.width,
                height: l.frame.height,
              }
            : undefined,
          elements: (l.elements ?? []).map((e) => ({
            text: e.text ?? '',
            frame: e.frame
              ? {
                  top: e.frame.top,
                  left: e.frame.left,
                  width: e.frame.width,
                  height: e.frame.height,
                }
              : undefined,
          })),
        })),
      }));

      // Count total lines across blocks
      const lineCount = blocks.reduce((acc, b) => acc + (b.lines?.length || 0), 0);

      // Reconstruct table headers & rows from coordinate geometry locally
      const table = reconstructTableFromBlocks(blocks, rawText);

      return {
        rawText,
        blocks,
        table,
        engine: 'mlkit-offline',
        timestamp: new Date().toISOString(),
        lineCount,
        blockCount: blocks.length,
      };
    } catch (error: any) {
      // Provide clear guidance if native ML Kit module is not yet linked in Expo Go
      if (
        error?.message?.includes('linked') ||
        error?.message?.includes('NativeModules') ||
        error?.message?.includes('null')
      ) {
        throw new Error(
          'Google ML Kit requires a development build to run native code on device. Please build and run via: npx expo run:android'
        );
      }

      throw error;
    }
  }
}
