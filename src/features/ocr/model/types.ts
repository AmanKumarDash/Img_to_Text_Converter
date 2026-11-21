export interface TableStructure {
  headers: string[];
  rows: string[][];
}

export interface OCRResult {
  rawText: string;
  table?: TableStructure;
  engine: 'gemini' | 'mock-test';
  timestamp: string;
}

export type OCRStatus = 'idle' | 'processing' | 'success' | 'error';

export interface OCRError {
  message: string;
  details?: string;
}
