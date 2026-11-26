import { SupportedDocumentType } from '../../document-detection/model/types';

export interface DocumentRecord {
  id: string;
  index: number; // 1-based sequential index
  documentType: SupportedDocumentType;
  documentTypeLabel: string; // "Oman ID", "Oman Driving Licence", "Indian Passport"
  fullName: string;
  dateOfBirth: string;
  documentNumber: string;
  nationality: string;
  issueDate: string;
  expiryDate: string;
  gender: string;
  address: string;
  scannedAt: string;
  frontImageUri?: string;
  backImageUri?: string;
  imageUri?: string; // Backwards compatibility alias for frontImageUri
}

export interface DocumentCollection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  records: DocumentRecord[];
}

export type NewDocumentRecordInput = Omit<
  DocumentRecord,
  'id' | 'index' | 'scannedAt'
>;
