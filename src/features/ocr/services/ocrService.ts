import { OCRResult } from '../model/types';
import { extractWithGemini, extractWithTestMock } from './geminiOCR';

export class OCRService {
  private static apiKey: string | null =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;

  public static setApiKey(key: string) {
    this.apiKey = key.trim();
  }

  public static getApiKey(): string | null {
    return this.apiKey;
  }

  public static hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  /**
   * Main recognition function: uses Gemini AI if API key is set,
   * otherwise uses the Test Engine fallback so testing always succeeds.
   */
  public static async recognizeText(imageUri: string, forceTestMode = false): Promise<OCRResult> {
    if (this.hasApiKey() && !forceTestMode) {
      try {
        return await extractWithGemini(imageUri, this.apiKey!);
      } catch (err: any) {
        console.error('Gemini OCR failed, falling back to test engine:', err);
        throw err;
      }
    }

    return await extractWithTestMock(imageUri);
  }
}
