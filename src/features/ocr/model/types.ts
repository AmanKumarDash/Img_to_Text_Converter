export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TextElement {
  text: string;
  frame?: BoundingBox;
}

export interface TextLine {
  text: string;
  frame?: BoundingBox;
  elements?: TextElement[];
}

export interface TextBlock {
  text: string;
  frame?: BoundingBox;
  lines: TextLine[];
}

export interface TableStructure {
  headers: string[];
  rows: string[][];
}

export interface OfflineOCRResult {
  rawText: string;
  blocks: TextBlock[];
  table?: TableStructure;
  engine: 'mlkit-offline';
  timestamp: string;
  lineCount: number;
  blockCount: number;
}

export type OCRStatus = 'idle' | 'processing' | 'success' | 'error';

export interface OCRError {
  message: string;
  details?: string;
}
