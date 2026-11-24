export type SupportedDocumentType =
  | 'OMAN_ID'
  | 'OMAN_DL'
  | 'INDIAN_PASSPORT'
  | 'UNKNOWN';

export interface DocumentTypeIndicator {
  name: string;
  matched: boolean;
  weight: number;
}

export interface DocumentDetectionResult {
  documentType: SupportedDocumentType;
  label: string;
  confidence: number; // 0.0 to 1.0
  indicators: DocumentTypeIndicator[];
  rawText: string;
}

export interface ExtractedDocumentFields {
  fullName: string;
  dateOfBirth: string;
  documentNumber: string;
  nationality: string;
  issueDate: string;
  expiryDate: string;
  gender: string;
  address: string;
  // Field-level extraction confidence
  fieldConfidence?: Record<string, number>;
}
